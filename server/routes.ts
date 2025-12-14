import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFitnessPlan, AVAILABLE_EQUIPMENT, generateMealSwapAlternatives, generateMealFromIngredients, validateWeightGoal } from "./services/azure-ai";
import { insertUserProfileSchema, insertCustomMealSchema } from "@shared/schema";
import { exerciseLibrary as exerciseData } from "./exerciseData";
import { checkWaterReminder, createWaterReminder, getUnreadNotifications } from "./services/notifications";
import { testImageGeneration, getExerciseImage, getMealImage } from "./services/image-generation";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auto-seed exercise library at startup
  try {
    await storage.seedExerciseLibrary(exerciseData);
    console.log(`[startup] Seeded ${exerciseData.length} exercises to database`);
  } catch (error) {
    console.error("[startup] Error seeding exercises:", error);
  }

  // Create user profile and generate AI fitness plan
  app.post("/api/onboarding", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertUserProfileSchema.parse(req.body);

      // Auto-set fixed gym equipment for all users
      validatedData.equipment = AVAILABLE_EQUIPMENT;

      // Create user profile
      const userProfile = await storage.createUserProfile(validatedData);

      // Generate AI fitness plan
      console.log("Generating AI plan for user:", userProfile.id);
      const aiPlan = await generateFitnessPlan(userProfile);

      // Store the generated plan
      const fitnessPlan = await storage.createFitnessPlan({
        userId: userProfile.id,
        planData: aiPlan as any,
        currentDay: 1,
      });

      res.json({
        success: true,
        userId: userProfile.id,
        planId: fitnessPlan.id,
        plan: aiPlan,
      });
    } catch (error) {
      console.error("Error in onboarding:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: fromZodError(error).toString(),
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create profile and plan",
      });
    }
  });

  // Login with phone number and PIN
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, pin } = req.body;

      if (!phoneNumber || !pin) {
        return res.status(400).json({
          success: false,
          error: "Phone number and PIN are required",
        });
      }

      const user = await storage.getUserByPhoneAndPin(phoneNumber, pin);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid phone number or PIN",
        });
      }

      res.json({
        success: true,
        userId: user.id,
        language: user.language,
      });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({
        success: false,
        error: "Login failed",
      });
    }
  });

  // Get user's latest fitness plan
  app.get("/api/plan/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      let plan = await storage.getUserActivePlan(userId);
      if (!plan) {
        plan = await storage.getUserLatestPlan(userId);
      }

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "No plan found for this user",
        });
      }

      // Get user progress
      const progress = await storage.getUserProgress(userId, plan.id);

      // Calculate if plan is expired
      const durationDays = plan.durationDays || 30;
      const startDate = plan.startDate || plan.createdAt;
      const endDate = plan.endDate || new Date(new Date(startDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
      const isExpired = new Date() > endDate;

      res.json({
        success: true,
        plan: plan.planData,
        currentDay: plan.currentDay,
        planId: plan.id,
        durationDays,
        startDate,
        endDate,
        isExpired,
        progress,
      });
    } catch (error) {
      console.error("Error fetching plan:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch plan",
      });
    }
  });

  // Get all user plans
  app.get("/api/plans/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }
      const plans = await storage.getUserPlans(userId);
      res.json({ success: true, plans });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ success: false, error: "Failed to fetch plans" });
    }
  });

  // Activate a plan
  app.patch("/api/plan/:planId/activate", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      const { userId } = req.body;
      if (isNaN(planId) || !userId) {
        return res.status(400).json({ success: false, error: "Invalid plan or user ID" });
      }
      await storage.setActivePlan(userId, planId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating plan:", error);
      res.status(500).json({ success: false, error: "Failed to activate plan" });
    }
  });

  // Delete a plan
  app.delete("/api/plan/:planId", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "Invalid plan ID" });
      }
      await storage.deletePlan(planId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ success: false, error: "Failed to delete plan" });
    }
  });

  // Renew/Create a new plan for the user (when current plan expires or user wants a new one)
  app.post("/api/plan/renew", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        durationDays: z.number().min(30).max(90).default(30),
      });

      const { userId, durationDays } = schema.parse(req.body);

      // Get user profile
      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }

      // Deactivate current active plan
      const currentPlan = await storage.getUserActivePlan(userId);
      if (currentPlan) {
        await storage.deactivatePlan(currentPlan.id);
      }

      // Generate new AI fitness plan
      console.log("Generating new AI plan for user:", userId);
      const aiPlan = await generateFitnessPlan(userProfile);

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      // Store the generated plan with duration metadata
      const fitnessPlan = await storage.createFitnessPlan({
        userId: userProfile.id,
        planData: aiPlan as any,
        currentDay: 1,
        durationDays,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        planId: fitnessPlan.id,
        plan: aiPlan,
        durationDays,
        startDate,
        endDate,
      });
    } catch (error) {
      console.error("Error renewing plan:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to renew plan",
      });
    }
  });

  // Record exercise completion with difficulty feedback
  app.post("/api/progress", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        userId: z.number(),
        planId: z.number(),
        day: z.number(),
        difficulty: z.enum(["easy", "just right", "hard"]),
      });

      const { userId, planId, day, difficulty } = schema.parse(req.body);

      // Check if progress already exists
      let progress = await storage.getExerciseProgress(userId, planId, day);

      if (progress) {
        // Update existing progress
        await storage.updateExerciseProgress(progress.id, difficulty);
      } else {
        // Create new progress entry
        progress = await storage.createExerciseProgress({
          userId,
          planId,
          day,
          completed: 1,
          difficulty,
          completedAt: new Date(),
        });
      }

      // Update current day in plan (allow +1 beyond durationDays to indicate completion)
      const plan = await storage.getFitnessPlan(planId);
      if (!plan) {
        return res.status(404).json({ success: false, error: "Plan not found" });
      }
      const maxDay = plan.durationDays || 30;
      const nextDay = Math.min(day + 1, maxDay + 1);
      await storage.updatePlanCurrentDay(planId, nextDay);

      res.json({
        success: true,
        progress,
      });
    } catch (error) {
      console.error("Error recording progress:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: fromZodError(error).toString(),
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to record progress",
      });
    }
  });

  // Update plan current day
  app.patch("/api/plan/:planId/day", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      const schema = z.object({
        day: z.number().min(1).max(91),
      });

      const { day } = schema.parse(req.body);

      // Validate against plan's actual duration (allow +1 for completion state)
      const plan = await storage.getFitnessPlan(planId);
      if (!plan) {
        return res.status(404).json({ success: false, error: "Plan not found" });
      }
      const maxDay = plan.durationDays || 30;
      if (day > maxDay + 1) {
        return res.status(400).json({ success: false, error: `Day cannot exceed plan duration (${maxDay} days)` });
      }

      await storage.updatePlanCurrentDay(planId, day);

      res.json({
        success: true,
        currentDay: day,
      });
    } catch (error) {
      console.error("Error updating current day:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: fromZodError(error).toString(),
        });
      }

      res.status(500).json({
        success: false,
        error: "Failed to update current day",
      });
    }
  });

  // Get user profile
  app.get("/api/profile/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: "User profile not found",
        });
      }

      res.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch profile",
      });
    }
  });

  // Update user profile and optionally regenerate plan
  app.patch("/api/profile/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      const updateSchema = z.object({
        weight: z.number().optional(),
        height: z.number().optional(),
        goal: z.string().optional(),
        activityLevel: z.string().optional(),
        impediments: z.string().optional(),
        timePerDay: z.number().optional(),
        difficulty: z.string().optional(),
        regeneratePlan: z.boolean().optional(),
      });

      const { regeneratePlan, ...rawUpdateData } = updateSchema.parse(req.body);

      // Filter out undefined values to prevent overwriting existing data with NULL
      const updateData: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawUpdateData)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }

      // Only update if there are fields to update
      let updatedProfile;
      if (Object.keys(updateData).length > 0) {
        updatedProfile = await storage.updateUserProfile(userId, updateData);
      } else {
        updatedProfile = await storage.getUserProfile(userId);
      }

      if (!updatedProfile) {
        return res.status(404).json({
          success: false,
          error: "User profile not found",
        });
      }

      let newPlan = null;

      // Regenerate plan if requested
      if (regeneratePlan) {
        console.log("Regenerating AI plan for user:", userId);
        const aiPlan = await generateFitnessPlan(updatedProfile);

        newPlan = await storage.createFitnessPlan({
          userId: updatedProfile.id,
          planData: aiPlan as any,
          currentDay: 1,
        });
      }

      res.json({
        success: true,
        profile: updatedProfile,
        newPlan: newPlan ? { id: newPlan.id, plan: newPlan.planData } : null,
      });
    } catch (error) {
      console.error("Error updating profile:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: fromZodError(error).toString(),
        });
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  });

  // Seed exercise library
  app.post("/api/exercises/seed", async (req: Request, res: Response) => {
    try {
      await storage.seedExerciseLibrary(exerciseData);
      res.json({
        success: true,
        message: `Seeded ${exerciseData.length} exercises`,
      });
    } catch (error) {
      console.error("Error seeding exercises:", error);
      res.status(500).json({
        success: false,
        error: "Failed to seed exercises",
      });
    }
  });

  // Get all exercises
  app.get("/api/exercises", async (req: Request, res: Response) => {
    try {
      const exercises = await storage.getAllExercises();
      res.json({ success: true, exercises });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch exercises" });
    }
  });

  // Get exercise by ID
  app.get("/api/exercises/:id", async (req: Request, res: Response) => {
    try {
      const exercise = await storage.getExerciseById(req.params.id);
      if (!exercise) {
        return res.status(404).json({ success: false, error: "Exercise not found" });
      }
      res.json({ success: true, exercise });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch exercise" });
    }
  });

  // Get notification settings
  app.get("/api/notifications/settings/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      let settings = await storage.getNotificationSettings(userId);
      if (!settings) {
        settings = await storage.createNotificationSettings({ userId });
      }
      res.json({ success: true, settings });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch notification settings" });
    }
  });

  // Update notification settings
  app.patch("/api/notifications/settings/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const schema = z.object({
        waterRemindersEnabled: z.boolean().optional(),
        waterReminderIntervalMinutes: z.number().min(30).max(180).optional(),
        mealRemindersEnabled: z.boolean().optional(),
        workoutRemindersEnabled: z.boolean().optional(),
        sleepStartHour: z.number().min(0).max(23).optional(),
        sleepEndHour: z.number().min(0).max(23).optional(),
        waterTargetMl: z.number().min(1000).max(5000).optional(),
      });
      const data = schema.parse(req.body);
      await storage.updateNotificationSettings(userId, data);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }
      res.status(500).json({ success: false, error: "Failed to update settings" });
    }
  });

  // Get user notifications
  app.get("/api/notifications/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getUserNotifications(userId);
      res.json({ success: true, notifications });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch notifications" });
    }
  });

  // Poll for new notifications (checks if water reminder is due)
  app.post("/api/notifications/poll/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const language = req.body.language || "en";
      
      await createWaterReminder(userId, language);
      const unread = await getUnreadNotifications(userId);
      
      res.json({ success: true, notifications: unread });
    } catch (error) {
      console.error("Error polling notifications:", error);
      res.status(500).json({ success: false, error: "Failed to poll notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to mark notification as read" });
    }
  });

  // Test Gemini image generation
  app.get("/api/images/test", async (req: Request, res: Response) => {
    try {
      const result = await testImageGeneration();
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to test image generation" 
      });
    }
  });

  // Generate image for a specific exercise using Gemini
  app.post("/api/images/exercise", async (req: Request, res: Response) => {
    try {
      const { exerciseName, exerciseNamePt, equipment, primaryMuscles } = req.body;
      
      if (!exerciseName || !equipment || !primaryMuscles) {
        return res.status(400).json({ 
          success: false, 
          error: "exerciseName, equipment, and primaryMuscles are required" 
        });
      }

      const image = await getExerciseImage(
        exerciseName,
        exerciseNamePt || exerciseName,
        equipment,
        primaryMuscles
      );

      res.json({ success: true, image });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate image" 
      });
    }
  });

  // Get image for a meal
  app.post("/api/images/meal", async (req: Request, res: Response) => {
    try {
      const { description, mealTime } = req.body;
      
      if (!description || !mealTime) {
        return res.status(400).json({ 
          success: false, 
          error: "description and mealTime are required" 
        });
      }

      const image = await getMealImage(description, mealTime);
      res.json({ success: true, image });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get meal image" 
      });
    }
  });

  // Get exercises by IDs (for matching workout exercises)
  app.post("/api/exercises/match", async (req: Request, res: Response) => {
    try {
      const { exerciseNames } = req.body;
      if (!exerciseNames || !Array.isArray(exerciseNames)) {
        return res.status(400).json({ success: false, error: "exerciseNames array required" });
      }
      
      const allExercises = await storage.getAllExercises();
      const matched: Record<string, any> = {};
      
      for (const name of exerciseNames) {
        const normalizedName = name.toLowerCase().trim();
        const match = allExercises.find(ex => 
          ex.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(ex.name.toLowerCase()) ||
          ex.namePt.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(ex.namePt.toLowerCase())
        );
        if (match) {
          // Fetch Pexels image for this exercise
          try {
            const image = await getExerciseImage(
              match.name,
              match.namePt,
              match.equipment,
              match.primaryMuscles || []
            );
            matched[name] = { ...match, pexelsImage: image };
          } catch (imgError) {
            matched[name] = match;
          }
        }
      }
      
      res.json({ success: true, exercises: matched });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to match exercises" });
    }
  });

  // ============ WEIGHT GOAL VALIDATION ============

  // Validate weight goal with AI feedback
  app.post("/api/validate-weight-goal", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        currentWeight: z.number().min(30).max(300),
        targetWeight: z.number().min(30).max(300),
        weeks: z.number().min(1).max(104), // 1 week to 2 years
        sex: z.string(),
        age: z.number().min(18).max(100),
        height: z.number().min(100).max(250),
        goal: z.string(),
        activityLevel: z.string(),
        language: z.string().optional(),
      });

      const validatedData = schema.parse(req.body);
      
      const result = await validateWeightGoal({
        ...validatedData,
        language: validatedData.language || "pt"
      });

      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error validating weight goal:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to validate weight goal" 
      });
    }
  });

  // ============ MEAL SWAP & AI INGREDIENT ENDPOINTS ============

  // Get meal swap alternatives
  app.post("/api/nutrition/meal-swap", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        originalMeal: z.object({
          meal_time_pt: z.string(),
          description_pt: z.string(),
          main_ingredients_pt: z.string(),
          recipe_pt: z.string().optional(),
          calories: z.number(),
          protein_g: z.number(),
          carbs_g: z.number(),
          fat_g: z.number(),
        }),
        targetCalories: z.number(),
        targetProtein: z.number(),
        targetCarbs: z.number(),
        targetFat: z.number(),
        mealTime: z.string(),
        language: z.string().optional(),
      });

      const { originalMeal, targetCalories, targetProtein, targetCarbs, targetFat, mealTime, language } = schema.parse(req.body);

      const result = await generateMealSwapAlternatives(
        { targetCalories, targetProtein, targetCarbs, targetFat, mealTime },
        originalMeal as any,
        language || "pt"
      );

      res.json({ success: true, alternatives: result.alternatives });
    } catch (error) {
      console.error("Error generating meal alternatives:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate meal alternatives" 
      });
    }
  });

  // Generate meal from ingredients
  app.post("/api/nutrition/meal-from-ingredients", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        ingredients: z.array(z.string()).min(1),
        targetCalories: z.number(),
        targetProtein: z.number(),
        targetCarbs: z.number(),
        targetFat: z.number(),
        mealTime: z.string(),
        language: z.string().optional(),
      });

      const { ingredients, targetCalories, targetProtein, targetCarbs, targetFat, mealTime, language } = schema.parse(req.body);

      const result = await generateMealFromIngredients(
        { targetCalories, targetProtein, targetCarbs, targetFat, mealTime },
        ingredients,
        language || "pt"
      );

      res.json({ success: true, meal: result.meal });
    } catch (error) {
      console.error("Error generating meal from ingredients:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate meal from ingredients" 
      });
    }
  });

  // Save custom meal (swap or AI-generated)
  app.post("/api/nutrition/custom-meal", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomMealSchema.parse(req.body);
      const customMeal = await storage.createCustomMeal(validatedData);
      res.json({ success: true, customMeal });
    } catch (error) {
      console.error("Error saving custom meal:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({ success: false, error: "Failed to save custom meal" });
    }
  });

  // Get custom meals for a plan
  app.get("/api/nutrition/custom-meals/:userId/:planId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const planId = parseInt(req.params.planId);

      if (isNaN(userId) || isNaN(planId)) {
        return res.status(400).json({ success: false, error: "Invalid user or plan ID" });
      }

      const customMeals = await storage.getCustomMealsForPlan(userId, planId);
      res.json({ success: true, customMeals });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch custom meals" });
    }
  });

  // Delete custom meal (revert to original)
  app.delete("/api/nutrition/custom-meal/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: "Invalid meal ID" });
      }

      await storage.deleteCustomMeal(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete custom meal" });
    }
  });

  return httpServer;
}

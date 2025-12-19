import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFitnessPlan, generateSimpleCoachPlan, extendCoachPlan, AVAILABLE_EQUIPMENT, generateMealSwapAlternatives, generateMealFromIngredients, validateWeightGoal, generateCoachingTips, generateCoachResponse } from "./services/azure-ai";
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

  // Check if user already exists (by phone + name)
  app.post("/api/users/check", async (req: Request, res: Response) => {
    try {
      const { phoneNumber, firstName } = req.body;

      if (!phoneNumber || !firstName) {
        return res.status(400).json({
          success: false,
          error: "Phone number and name are required",
        });
      }

      const existing = await storage.checkUserExists(phoneNumber, firstName);

      res.json({
        success: true,
        exists: existing !== null,
        userId: existing?.id || null,
      });
    } catch (error) {
      console.error("Error checking user:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check user",
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

      // Compute actual generated days from plan data for accuracy (handles legacy plans)
      const planData = (plan.planData || {}) as any;
      const workoutDays = planData.fitness_plan_7_days || planData.fitness_plan_15_days || [];
      const nutritionDays = planData.nutrition_plan_7_days || [];
      const actualWorkoutDays = Array.isArray(workoutDays) ? workoutDays.length : (plan.generatedWorkoutDays || 7);
      const actualNutritionDays = Array.isArray(nutritionDays) ? nutritionDays.length : (plan.generatedNutritionDays || 7);

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
        generatedWorkoutDays: actualWorkoutDays,
        generatedNutritionDays: actualNutritionDays,
        generationStatus: plan.generationStatus || "idle",
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

  // Comprehensive exercise synonym mapping for better matching
  const exerciseSynonyms: Record<string, string[]> = {
    // Legs
    "afundos em caminhada": ["avanço caminhando", "avanços caminhando", "lunges caminhando", "walking lunge", "walking lunges", "lunge walk"],
    "afundos": ["avanços", "lunges", "lunge", "afundo", "avanço"],
    "agachamento livre": ["agachamento", "squat", "squats", "agachamento sem peso", "bodyweight squat", "air squat"],
    "agachamento com barra": ["back squat", "agachamento barra", "barbell squat"],
    "agachamento goblet": ["goblet squat", "agachamento com kettlebell"],
    "prensa de pernas": ["leg press", "prensa pernas"],
    "levantamento terra romeno": ["romanian deadlift", "rdl", "levantamento romeno", "stiff leg deadlift"],
    "levantamento terra": ["deadlift", "conventional deadlift", "levantamento terra convencional"],
    "elevação de gémeos": ["calf raise", "elevação gémeos", "panturrilha", "standing calf raise", "elevação de gémeos em pé"],
    "extensão de pernas": ["leg extension", "extensões de pernas"],
    "curl de pernas": ["leg curl", "hamstring curl", "flexão de pernas"],
    // Chest
    "supino reto": ["bench press", "supino", "press peito", "flat bench press", "barbell bench press"],
    "supino inclinado": ["incline bench", "supino inclinado halteres", "incline press", "incline dumbbell press"],
    "supino declinado": ["decline bench", "decline press"],
    "flexões": ["push ups", "pushups", "flexão", "push-ups", "push up", "flexão de braços"],
    "flexões declinadas": ["decline push-up", "decline push ups", "flexão declinada"],
    "flexões inclinadas": ["incline push-up", "incline push ups", "flexão inclinada"],
    "crucifixo": ["chest fly", "fly", "dumbbell fly", "pec fly", "crucifixo com halteres"],
    // Back
    "remada curvada": ["bent over row", "remada", "row", "barbell row", "remada com barra"],
    "remada unilateral": ["one arm row", "single arm row", "remada com haltere", "dumbbell row"],
    "puxada alta": ["lat pulldown", "puxada", "pulldown", "puxada na polia"],
    "barra fixa": ["pull up", "pull-up", "pullup", "chin up"],
    // Shoulders
    "elevação lateral": ["lateral raise", "elevações laterais", "side raise"],
    "elevação frontal": ["front raise", "elevação frontal com halteres"],
    "desenvolvimento": ["shoulder press", "press ombros", "military press", "overhead press", "desenvolvimento com halteres"],
    "desenvolvimento com barra": ["barbell overhead press", "barbell shoulder press"],
    "encolhimento": ["shrug", "shrugs", "trapézio"],
    // Arms
    "rosca bíceps": ["bicep curl", "rosca", "curl bíceps", "dumbbell curl", "rosca direta"],
    "rosca martelo": ["hammer curl", "rosca alternada"],
    "tríceps corda": ["tricep pushdown", "extensão tríceps", "tricep extension"],
    "mergulho de tríceps": ["triceps dip", "dips", "tricep dip", "bench dip"],
    "extensão de tríceps": ["skull crusher", "tricep extension", "extensão tríceps deitado"],
    // Core
    "prancha": ["plank", "prancha abdominal", "forearm plank"],
    "prancha lateral": ["side plank", "prancha de lado"],
    "abdominal": ["crunch", "sit up", "abdominais", "crunches"],
    "rotação russa": ["russian twist", "twist russo", "torção russa"],
    "elevação de pernas": ["leg raise", "hanging leg raise", "leg raises"],
    "bicicleta": ["bicycle crunch", "abdominal bicicleta"],
    // Cardio
    "burpees": ["burpee"],
    "mountain climbers": ["escaladores", "mountain climber", "escalador"],
    "polichinelos": ["jumping jacks", "polichinelo", "jumping jack"],
    "joelhos altos": ["high knees", "corrida no lugar", "high knee"],
    "corrida estacionária": ["running in place", "corrida no lugar"],
    "saltos": ["jump", "jumping", "box jump"],
    "skipping": ["skip", "pular corda", "rope jump"],
    // Stretching
    "alongamento quadríceps": ["quad stretch", "alongar quadríceps"],
    "alongamento isquiotibiais": ["hamstring stretch", "alongar posterior coxa"],
  };
  
  // Direct name-to-ID mapping for common exercises (most reliable)
  const exerciseNameToId: Record<string, string> = {
    "push-up": "pushup", "push up": "pushup", "pushup": "pushup", "flexão": "pushup", "flexões": "pushup",
    "decline push-up": "pushup_decline", "flexões declinadas": "pushup_decline", "flexão declinada": "pushup_decline",
    "incline push-up": "pushup_incline", "flexões inclinadas": "pushup_incline",
    "bodyweight squat": "squat_bodyweight", "agachamento livre": "squat_bodyweight", "agachamento": "squat_bodyweight",
    "goblet squat": "squat_goblet", "agachamento goblet": "squat_goblet",
    "walking lunge": "lunge_walking", "walking lunges": "lunge_walking", "afundos em caminhada": "lunge_walking", "avanço caminhando": "lunge_walking",
    "lunge": "lunge_static", "afundos": "lunge_static", "afundo": "lunge_static",
    "plank": "plank", "prancha": "plank",
    "side plank": "plank_side", "prancha lateral": "plank_side",
    "crunch": "crunch", "abdominal": "crunch", "abdominais": "crunch",
    "russian twist": "russian_twist", "rotação russa": "russian_twist",
    "mountain climber": "mountain_climber", "mountain climbers": "mountain_climber", "escalador": "mountain_climber", "escaladores": "mountain_climber",
    "burpee": "burpee", "burpees": "burpee",
    "jumping jack": "jumping_jack", "jumping jacks": "jumping_jack", "polichinelo": "jumping_jack", "polichinelos": "jumping_jack",
    "high knees": "high_knees", "joelhos altos": "high_knees",
    "pull-up": "pullup", "pull up": "pullup", "barra fixa": "pullup",
    "lat pulldown": "lat_pulldown", "puxada alta": "lat_pulldown", "puxada na polia alta": "lat_pulldown",
    "triceps dip": "triceps_dip", "tricep dip": "triceps_dip", "mergulho de tríceps": "triceps_dip", "dips": "triceps_dip",
    "calf raise": "calf_raise", "standing calf raise": "calf_raise", "elevação de gémeos": "calf_raise", "elevação de gémeos em pé": "calf_raise",
    "leg raise": "leg_raise", "elevação de pernas": "leg_raise",
    "bicycle crunch": "bicycle_crunch", "bicicleta": "bicycle_crunch", "abdominal bicicleta": "bicycle_crunch",
    "superman": "superman",
    "glute bridge": "glute_bridge", "ponte de glúteos": "glute_bridge",
    "deadlift": "deadlift_conventional", "conventional deadlift": "deadlift_conventional", "levantamento terra": "deadlift_conventional",
    "romanian deadlift": "deadlift_romanian", "rdl": "deadlift_romanian", "levantamento terra romeno": "deadlift_romanian",
    "bent over row": "row_barbell", "remada curvada": "row_barbell", "barbell row": "row_barbell",
    "dumbbell row": "row_dumbbell", "one-arm dumbbell row": "row_dumbbell", "remada unilateral": "row_dumbbell",
    "bench press": "bench_press_barbell", "supino reto": "bench_press_barbell", "barbell bench press": "bench_press_barbell",
    "dumbbell bench press": "bench_press_dumbbell", "supino com halteres": "bench_press_dumbbell",
    "incline dumbbell press": "incline_press_dumbbell", "supino inclinado": "incline_press_dumbbell",
    "overhead press": "overhead_press_barbell", "shoulder press": "overhead_press_dumbbell", "desenvolvimento": "overhead_press_dumbbell",
    "lateral raise": "lateral_raise", "elevação lateral": "lateral_raise",
    "bicep curl": "bicep_curl_dumbbell", "rosca bíceps": "bicep_curl_dumbbell", "dumbbell curl": "bicep_curl_dumbbell",
    "hammer curl": "hammer_curl", "rosca martelo": "hammer_curl",
    "tricep pushdown": "tricep_pushdown", "tríceps corda": "tricep_pushdown",
    "chest fly": "chest_fly_dumbbell", "dumbbell fly": "chest_fly_dumbbell", "crucifixo": "chest_fly_dumbbell",
    "face pull": "face_pull",
    "hip thrust": "hip_thrust", "elevação de quadril": "hip_thrust",
  };

  function findSynonymMatch(name: string, exercises: any[]): any | null {
    const normalized = name.toLowerCase().trim();
    
    // Step 1: Try direct ID lookup first (most reliable)
    const directId = exerciseNameToId[normalized];
    if (directId) {
      const idMatch = exercises.find(ex => ex.id === directId);
      if (idMatch) {
        console.log(`[match] ID lookup: "${name}" -> ${idMatch.name} (ID: ${directId})`);
        return idMatch;
      }
    }
    
    // Step 2: Exact match by name or namePt
    for (const ex of exercises) {
      const exNameLower = ex.name.toLowerCase();
      const exNamePtLower = ex.namePt.toLowerCase();
      if (exNameLower === normalized || exNamePtLower === normalized) {
        console.log(`[match] Exact: "${name}" -> ${ex.name}`);
        return ex;
      }
    }
    
    // Step 3: Partial match (one contains the other)
    for (const ex of exercises) {
      const exNameLower = ex.name.toLowerCase();
      const exNamePtLower = ex.namePt.toLowerCase();
      if (exNameLower.includes(normalized) || normalized.includes(exNameLower) ||
          exNamePtLower.includes(normalized) || normalized.includes(exNamePtLower)) {
        console.log(`[match] Partial: "${name}" -> ${ex.name}`);
        return ex;
      }
    }
    
    // Step 4: Synonym matching
    for (const ex of exercises) {
      const exNameLower = ex.name.toLowerCase();
      const exNamePtLower = ex.namePt.toLowerCase();
      
      for (const [canonical, synonyms] of Object.entries(exerciseSynonyms)) {
        // Check if exercise matches canonical or any synonym
        const exerciseMatchesCanonical = exNamePtLower.includes(canonical) || exNameLower.includes(canonical) ||
                                          synonyms.some(s => exNameLower.includes(s) || exNamePtLower.includes(s));
        
        if (exerciseMatchesCanonical) {
          // Check if input matches canonical or any synonym
          if (normalized.includes(canonical) || canonical.includes(normalized) ||
              synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
            console.log(`[match] Synonym: "${name}" -> ${ex.name} (via ${canonical})`);
            return ex;
          }
        }
      }
    }
    
    // Step 5: Word-based fuzzy matching (match if 2+ words match)
    const inputWords = normalized.split(/[\s\-_]+/).filter(w => w.length > 2);
    if (inputWords.length > 0) {
      for (const ex of exercises) {
        const exWords = [...ex.name.toLowerCase().split(/[\s\-_]+/), ...ex.namePt.toLowerCase().split(/[\s\-_]+/)];
        const matchingWords = inputWords.filter(w => exWords.some(ew => ew.includes(w) || w.includes(ew)));
        if (matchingWords.length >= Math.min(2, inputWords.length)) {
          console.log(`[match] Fuzzy: "${name}" -> ${ex.name} (${matchingWords.length} words)`);
          return ex;
        }
      }
    }
    
    console.log(`[match] FAILED: "${name}" - no match found`);
    return null;
  }

  // Get exercises by IDs (for matching workout exercises)
  app.post("/api/exercises/match", async (req: Request, res: Response) => {
    try {
      // Support both old format (exerciseNames: string[]) and new format (exercises: {name, exerciseId}[])
      let exerciseNames: string[] = req.body.exerciseNames;
      if (!exerciseNames && req.body.exercises && Array.isArray(req.body.exercises)) {
        exerciseNames = req.body.exercises.map((e: any) => e.name || e.exerciseId || "").filter((n: string) => n);
      }
      if (!exerciseNames || !Array.isArray(exerciseNames) || exerciseNames.length === 0) {
        return res.status(400).json({ success: false, error: "exerciseNames array required" });
      }
      
      const allExercises = await storage.getAllExercises();
      const matched: Record<string, any> = {};
      const unmatched: string[] = [];
      const matchDetails: { name: string; matchedTo?: string; hasVideo: boolean; hasImage: boolean; hasInstructions: boolean }[] = [];
      
      for (const name of exerciseNames) {
        const match = findSynonymMatch(name, allExercises);
        if (match) {
          // Always fetch Pexels image as primary source (InspireUSA URLs are returning 404)
          try {
            const image = await getExerciseImage(
              match.name,
              match.namePt,
              match.equipment,
              match.primaryMuscles || []
            );
            // Use Pexels as primary, clear broken imageUrl
            matched[name] = { ...match, imageUrl: null, pexelsImage: image };
          } catch (imgError) {
            console.log(`[exercises/match] Pexels image error for "${name}":`, imgError);
            matched[name] = { ...match, imageUrl: null };
          }
          
          matchDetails.push({
            name,
            matchedTo: match.name,
            hasVideo: !!match.videoUrl,
            hasImage: !!(match.imageUrl || matched[name]?.pexelsImage?.url),
            hasInstructions: !!(match.instructions || match.instructionsPt)
          });
        } else {
          unmatched.push(name);
        }
      }
      
      // Log summary for debugging
      if (unmatched.length > 0) {
        console.log(`[exercises/match] UNMATCHED exercises (${unmatched.length}):`, unmatched);
      }
      
      const missingData = matchDetails.filter(m => !m.hasVideo || !m.hasImage || !m.hasInstructions);
      if (missingData.length > 0) {
        console.log(`[exercises/match] Matched but MISSING data:`, missingData.map(m => ({
          name: m.name,
          matchedTo: m.matchedTo,
          missing: [
            !m.hasVideo ? 'video' : null,
            !m.hasImage ? 'image' : null,
            !m.hasInstructions ? 'instructions' : null
          ].filter(Boolean)
        })));
      }
      
      // Also build exercisesById for ID-based lookups
      const exercisesById: Record<string, any> = {};
      for (const ex of Object.values(matched)) {
        if (ex && ex.id) {
          exercisesById[ex.id] = ex;
        }
      }
      
      res.json({ success: true, exercises: matched, exercisesById });
    } catch (error) {
      console.error("[exercises/match] Error:", error);
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

  // Generate recipe for a meal that doesn't have one
  app.post("/api/nutrition/generate-recipe", async (req: Request, res: Response) => {
    try {
      const { generateRecipeForMeal } = await import("./services/azure-ai");
      
      const schema = z.object({
        mealDescription: z.string(),
        mainIngredients: z.string(),
        targetCalories: z.number(),
        targetProtein: z.number(),
        targetCarbs: z.number(),
        targetFat: z.number(),
        language: z.string().optional(),
      });

      const { mealDescription, mainIngredients, targetCalories, targetProtein, targetCarbs, targetFat, language } = schema.parse(req.body);

      const recipe = await generateRecipeForMeal(
        mealDescription,
        mainIngredients,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        language || "pt"
      );

      res.json({ success: true, recipe });
    } catch (error) {
      console.error("Error generating recipe:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: fromZodError(error).toString() });
      }

      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate recipe" 
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

  // Get personalized coaching tips based on user progress
  app.get("/api/coaching/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      // Get user profile
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Get active plan
      let plan = await storage.getUserActivePlan(userId);
      if (!plan) {
        plan = await storage.getUserLatestPlan(userId);
      }

      if (!plan) {
        return res.status(404).json({ success: false, error: "No plan found" });
      }

      // Get all progress entries for this plan
      const progress = await storage.getUserProgress(userId, plan.id);
      const daysCompleted = progress.length;
      const totalDays = plan.durationDays || 30;

      // Calculate current streak (consecutive completed days)
      let currentStreak = 0;
      if (progress.length > 0) {
        // Sort progress by day in ascending order and dedupe
        const uniqueDays = Array.from(new Set(progress.map((p: any) => p.day as number)));
        const sortedDays = uniqueDays.sort((a, b) => a - b);
        
        // Count consecutive days from the end (most recent)
        currentStreak = 1;
        for (let i = sortedDays.length - 1; i > 0; i--) {
          // Check if current day is exactly 1 more than the previous day
          if (sortedDays[i] - sortedDays[i - 1] === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate difficulty feedback distribution
      const difficultyFeedback = { easy: 0, justRight: 0, hard: 0 };
      progress.forEach((p: any) => {
        if (p.difficulty === "easy") difficultyFeedback.easy++;
        else if (p.difficulty === "just right") difficultyFeedback.justRight++;
        else if (p.difficulty === "hard") difficultyFeedback.hard++;
      });

      // Get last workout date
      const lastWorkoutDate = progress.length > 0
        ? progress.reduce((latest: any, p: any) => {
            const pDate = p.completedAt ? new Date(p.completedAt) : null;
            if (!pDate) return latest;
            if (!latest) return pDate;
            return pDate > latest ? pDate : latest;
          }, null)
        : null;

      // Generate coaching tips
      const coachingTips = await generateCoachingTips({
        daysCompleted,
        totalDays,
        currentStreak,
        difficultyFeedback,
        lastWorkoutDate,
        goal: profile.goal,
        firstName: profile.firstName,
        language: profile.language
      });

      res.json({
        success: true,
        ...coachingTips,
        daysCompleted,
        totalDays,
        currentStreak
      });
    } catch (error) {
      console.error("Error getting coaching tips:", error);
      res.status(500).json({ success: false, error: "Failed to get coaching tips" });
    }
  });

  // Virtual Coach Chat - Get conversation history
  app.get("/api/coach/:userId/messages", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      const messages = await storage.getCoachMessages(userId);
      res.json({ success: true, messages });
    } catch (error) {
      console.error("Error getting coach messages:", error);
      res.status(500).json({ success: false, error: "Failed to get messages" });
    }
  });

  // Virtual Coach Chat - Send message and get AI response
  app.post("/api/coach/:userId/chat", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      const { message } = req.body;
      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: "Message is required" });
      }

      // Get user profile
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Get plan context for the coach
      const { getCoachContext, classifyUserIntent } = await import("./services/coach-context");
      const planContext = await getCoachContext(userId, profile.language || "pt");
      
      // Classify user intent
      const intent = classifyUserIntent(message.trim(), profile.language || "pt");
      console.log(`[Coach] Intent classification for "${message.trim()}":`, intent);

      // Save user message
      const userMessage = await storage.createCoachMessage({
        userId,
        role: "user",
        content: message.trim(),
      });

      // Get conversation history
      const history = await storage.getCoachMessages(userId);
      const conversationHistory = history.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Generate AI response
      const aiResponse = await generateCoachResponse({
        userMessage: message.trim(),
        conversationHistory: conversationHistory.slice(0, -1),
        userProfile: {
          firstName: profile.firstName,
          goal: profile.goal,
          weight: profile.weight,
          targetWeight: profile.targetWeight || undefined,
          equipment: profile.equipment || undefined,
          impediments: profile.impediments || undefined,
        },
        language: profile.language || "pt",
        planContext: {
          hasPlan: planContext.hasPlan,
          planSummary: planContext.planSummary,
          completionStats: planContext.completionStats,
          recentProgress: planContext.recentProgress,
          nutritionSummary: planContext.nutritionSummary,
          canCreateNewPlan: planContext.canCreateNewPlan,
        },
      });

      // Save AI response
      const assistantMessage = await storage.createCoachMessage({
        userId,
        role: "assistant",
        content: aiResponse,
      });

      res.json({
        success: true,
        userMessage,
        assistantMessage,
        intent: intent.intent,
        intentConfidence: intent.confidence,
      });
    } catch (error) {
      console.error("Error in coach chat:", error);
      res.status(500).json({ success: false, error: "Failed to get coach response" });
    }
  });

  // Virtual Coach Chat - Clear conversation history
  app.delete("/api/coach/:userId/messages", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      await storage.clearCoachMessages(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing coach messages:", error);
      res.status(500).json({ success: false, error: "Failed to clear messages" });
    }
  });

  // Virtual Coach - Regenerate plan based on coach conversation
  // Preserves completed days and only replaces days from currentDay onwards
  app.post("/api/coach/:userId/regenerate-plan", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      const { coachContext } = req.body;

      // Get user profile
      const userProfile = await storage.getUserProfile(userId);
      if (!userProfile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }

      const isPt = userProfile.language === "pt";
      
      // Get current active plan and progress
      const currentPlan = await storage.getUserActivePlan(userId);
      let preservedWorkoutDays: any[] = [];
      let preservedNutritionDays: any[] = [];
      let startFromDay = 1;
      let existingProgress: any[] = [];
      
      if (currentPlan) {
        // Get progress to find completed days
        existingProgress = await storage.getUserProgress(userId, currentPlan.id);
        const completedDays = existingProgress.filter(p => p.completed === 1).map(p => p.day);
        const lastCompletedDay = completedDays.length > 0 ? Math.max(...completedDays) : 0;
        
        // Preserve completed days from existing plan
        const planData = currentPlan.planData as any;
        if (lastCompletedDay > 0 && planData) {
          // Keep workout days that were completed
          preservedWorkoutDays = (planData.fitness_plan_15_days || [])
            .filter((d: any) => d.day <= lastCompletedDay);
          
          // Keep nutrition days that correspond to completed workout days
          preservedNutritionDays = (planData.nutrition_plan_7_days || [])
            .filter((d: any) => d.day <= lastCompletedDay);
          
          startFromDay = lastCompletedDay + 1;
          
          console.log(`[Coach Regen] Preserving days 1-${lastCompletedDay}, generating from day ${startFromDay}`);
        }
        
        // Deactivate old plan (will create new one with merged data)
        await storage.deactivatePlan(currentPlan.id);
      }

      // Add coach message about plan creation
      await storage.createCoachMessage({
        userId,
        role: "assistant",
        content: isPt 
          ? preservedWorkoutDays.length > 0
            ? `Perfeito! Vou manter os teus ${preservedWorkoutDays.length} dias concluídos e gerar novos dias a partir do dia ${startFromDay}. Aguarda um momento... 🏋️`
            : "Perfeito! Estou a gerar um novo plano personalizado de 7 dias para ti. Aguarda um momento... 🏋️"
          : preservedWorkoutDays.length > 0
            ? `Perfect! I'll keep your ${preservedWorkoutDays.length} completed days and generate new days from day ${startFromDay}. Just a moment... 🏋️`
            : "Perfect! I'm generating a new personalized 7-day plan for you. Just a moment... 🏋️",
      });

      // Generate new AI fitness plan with coach context
      console.log("Coach generating new AI plan for user:", userId);
      const aiPlan = await generateSimpleCoachPlan(
        userProfile,
        coachContext || "User requested new plan via Virtual Coach"
      );

      // Merge preserved days with new generated days
      const generatedWorkoutDays = aiPlan.fitness_plan_15_days || [];
      const generatedNutritionDays = aiPlan.nutrition_plan_7_days || [];
      
      let mergedWorkoutDays: any[];
      let mergedNutritionDays: any[];
      
      if (preservedWorkoutDays.length > 0) {
        // Renumber generated days to start from startFromDay
        const renumberedWorkoutDays = generatedWorkoutDays.map((d: any, i: number) => ({
          ...d,
          day: startFromDay + i,
        }));
        const renumberedNutritionDays = generatedNutritionDays.map((d: any, i: number) => ({
          ...d,
          day: startFromDay + i,
        }));
        
        mergedWorkoutDays = [...preservedWorkoutDays, ...renumberedWorkoutDays];
        mergedNutritionDays = [...preservedNutritionDays, ...renumberedNutritionDays];
        
        console.log(`[Coach Regen] Merged: ${preservedWorkoutDays.length} preserved + ${renumberedWorkoutDays.length} new = ${mergedWorkoutDays.length} total workout days`);
      } else {
        mergedWorkoutDays = generatedWorkoutDays;
        mergedNutritionDays = generatedNutritionDays;
      }
      
      // Create merged plan data
      const mergedPlanData = {
        ...aiPlan,
        fitness_plan_15_days: mergedWorkoutDays,
        nutrition_plan_7_days: mergedNutritionDays,
      };

      // Create new plan with merged data
      const startDate = currentPlan?.startDate || new Date();
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const contextToStore = coachContext || "User requested new plan via Virtual Coach";

      const fitnessPlan = await storage.createFitnessPlan({
        userId: userProfile.id,
        planData: mergedPlanData as any,
        currentDay: startFromDay,
        durationDays: 30,
        generatedWorkoutDays: mergedWorkoutDays.length,
        generatedNutritionDays: mergedNutritionDays.length,
        generationContext: contextToStore,
        startDate,
        endDate,
      });
      
      // Copy progress from old plan for preserved days
      if (preservedWorkoutDays.length > 0 && existingProgress.length > 0) {
        for (const prog of existingProgress.filter(p => p.day <= preservedWorkoutDays.length)) {
          await storage.createExerciseProgress({
            userId: userProfile.id,
            planId: fitnessPlan.id,
            day: prog.day,
            completed: prog.completed,
            difficulty: prog.difficulty,
            completedAt: prog.completedAt,
          });
        }
        console.log(`[Coach Regen] Copied ${existingProgress.filter(p => p.day <= preservedWorkoutDays.length).length} progress records to new plan`);
      }

      // Add success message from coach
      await storage.createCoachMessage({
        userId,
        role: "assistant",
        content: isPt 
          ? preservedWorkoutDays.length > 0
            ? `O teu plano foi atualizado! 🎉 Mantive os teus ${preservedWorkoutDays.length} dias concluídos e criei ${generatedWorkoutDays.length} novos dias. Vai ao Dashboard para continuar!`
            : `O teu novo plano está pronto! 🎉 Criei um plano personalizado de 7 dias com base nas nossas conversas e no teu perfil. Vai ao Dashboard para ver o teu primeiro treino!`
          : preservedWorkoutDays.length > 0
            ? `Your plan has been updated! 🎉 I kept your ${preservedWorkoutDays.length} completed days and created ${generatedWorkoutDays.length} new days. Go to the Dashboard to continue!`
            : `Your new plan is ready! 🎉 I created a personalized 7-day plan based on our conversations and your profile. Go to the Dashboard to see your first workout!`,
      });

      res.json({
        success: true,
        planId: fitnessPlan.id,
        preservedDays: preservedWorkoutDays.length,
        newDays: generatedWorkoutDays.length,
        message: isPt ? "Plano atualizado com sucesso!" : "Plan updated successfully!",
      });
    } catch (error) {
      console.error("Error regenerating plan via coach:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to regenerate plan",
      });
    }
  });

  // Virtual Coach - Extend plan with 7 more days from last completed day
  app.post("/api/plans/:planId/extend", async (req: Request, res: Response) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "Invalid plan ID" });
      }

      // Get the plan
      const plan = await storage.getFitnessPlan(planId);
      if (!plan) {
        return res.status(404).json({ success: false, error: "Plan not found" });
      }

      // Get user profile
      const userProfile = await storage.getUserProfile(plan.userId);
      if (!userProfile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }

      // Get progress to find last completed day
      const progress = await storage.getUserProgress(plan.userId, planId);
      const completedDays = progress.filter(p => p.completed === 1).map(p => p.day);
      const lastCompletedDay = completedDays.length > 0 ? Math.max(...completedDays) : 0;
      
      // Start generating from day after last completed
      const startFromDay = lastCompletedDay + 1;
      
      // Don't extend if already have enough days
      const currentGeneratedDays = plan.generatedWorkoutDays || 7;
      if (startFromDay <= currentGeneratedDays - 2) {
        return res.json({
          success: true,
          message: "No extension needed - still have days available",
          generatedWorkoutDays: currentGeneratedDays,
        });
      }

      console.log(`[Extend Plan] Plan ${planId}: extending from day ${startFromDay}, currently have ${currentGeneratedDays} days`);

      // Use stored context or default
      const generationContext = plan.generationContext || "Plano personalizado";
      const planData = plan.planData as any;

      // Generate extension
      const extension = await extendCoachPlan(
        userProfile,
        planData,
        startFromDay,
        generationContext
      );

      // Merge new days into existing plan
      const existingWorkoutDays = planData.fitness_plan_15_days || [];
      const existingNutritionDays = planData.nutrition_plan_7_days || [];
      
      // Remove any days that will be replaced (from startFromDay onwards)
      const keptWorkoutDays = existingWorkoutDays.filter((d: any) => d.day < startFromDay);
      const keptNutritionDays = existingNutritionDays.filter((d: any) => d.day < startFromDay);
      
      // Add new days
      const newPlanData = {
        ...planData,
        fitness_plan_15_days: [...keptWorkoutDays, ...extension.workoutDays],
        nutrition_plan_7_days: [...keptNutritionDays, ...extension.nutritionDays],
      };

      // Calculate new generated counts
      const newWorkoutDaysCount = newPlanData.fitness_plan_15_days.length;
      const newNutritionDaysCount = newPlanData.nutrition_plan_7_days.length;

      // Update plan in database
      await storage.updateFitnessPlan(planId, {
        planData: newPlanData,
        generatedWorkoutDays: newWorkoutDaysCount,
        generatedNutritionDays: newNutritionDaysCount,
      });

      const isPt = userProfile.language === "pt";
      res.json({
        success: true,
        message: isPt 
          ? `Plano estendido! Adicionados dias ${startFromDay} a ${startFromDay + 6}.`
          : `Plan extended! Added days ${startFromDay} to ${startFromDay + 6}.`,
        generatedWorkoutDays: newWorkoutDaysCount,
        generatedNutritionDays: newNutritionDaysCount,
      });
    } catch (error) {
      console.error("Error extending plan:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to extend plan",
      });
    }
  });

  // Delete user account and all related data
  app.delete("/api/users/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }

      // Verify user exists
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      // Delete user and all related data
      await storage.deleteUserAndAllData(userId);

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ success: false, error: "Failed to delete account" });
    }
  });

  return httpServer;
}

import express from "express";
import type { Request, Response } from "express";
import { storage } from "../server/storage";
import { generateFitnessPlan, AVAILABLE_EQUIPMENT, generateMealSwapAlternatives, generateMealFromIngredients, validateWeightGoal, generateCoachingTips } from "../server/services/azure-ai";
import { insertUserProfileSchema, insertCustomMealSchema } from "../shared/schema";
import { exerciseLibrary as exerciseData } from "../server/exerciseData";
import { checkWaterReminder, createWaterReminder, getUnreadNotifications } from "../server/services/notifications";
import { testImageGeneration, getExerciseImage, getMealImage } from "../server/services/image-generation";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create user profile and generate AI fitness plan
app.post("/api/onboarding", async (req: Request, res: Response) => {
  try {
    const validatedData = insertUserProfileSchema.parse(req.body);
    validatedData.equipment = AVAILABLE_EQUIPMENT;
    const userProfile = await storage.createUserProfile(validatedData);
    console.log("Generating AI plan for user:", userProfile.id);
    const aiPlan = await generateFitnessPlan(userProfile);
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
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }
    let plan = await storage.getUserActivePlan(userId);
    if (!plan) {
      plan = await storage.getUserLatestPlan(userId);
    }
    if (!plan) {
      return res.status(404).json({ success: false, error: "No plan found for this user" });
    }
    const progress = await storage.getUserProgress(userId, plan.id);
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
    res.status(500).json({ success: false, error: "Failed to fetch plan" });
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

// Renew/Create a new plan
app.post("/api/plan/renew", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.number(),
      durationDays: z.number().min(30).max(90).default(30),
    });
    const { userId, durationDays } = schema.parse(req.body);
    const userProfile = await storage.getUserProfile(userId);
    if (!userProfile) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    const currentPlan = await storage.getUserActivePlan(userId);
    if (currentPlan) {
      await storage.deactivatePlan(currentPlan.id);
    }
    console.log("Generating new AI plan for user:", userId);
    const aiPlan = await generateFitnessPlan(userProfile);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
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

// Record exercise completion
app.post("/api/progress", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.number(),
      planId: z.number(),
      day: z.number(),
      difficulty: z.enum(["easy", "just right", "hard"]),
    });
    const { userId, planId, day, difficulty } = schema.parse(req.body);
    let progress = await storage.getExerciseProgress(userId, planId, day);
    if (progress) {
      await storage.updateExerciseProgress(progress.id, difficulty);
    } else {
      progress = await storage.createExerciseProgress({
        userId,
        planId,
        day,
        completed: 1,
        difficulty,
        completedAt: new Date(),
      });
    }
    const plan = await storage.getFitnessPlan(planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }
    const maxDay = plan.durationDays || 30;
    const nextDay = Math.min(day + 1, maxDay + 1);
    await storage.updatePlanCurrentDay(planId, nextDay);
    res.json({ success: true, progress });
  } catch (error) {
    console.error("Error recording progress:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: fromZodError(error).toString() });
    }
    res.status(500).json({ success: false, error: "Failed to record progress" });
  }
});

// Update plan current day
app.patch("/api/plan/:planId/day", async (req: Request, res: Response) => {
  try {
    const planId = parseInt(req.params.planId);
    const schema = z.object({ day: z.number().min(1).max(91) });
    const { day } = schema.parse(req.body);
    const plan = await storage.getFitnessPlan(planId);
    if (!plan) {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }
    const maxDay = plan.durationDays || 30;
    if (day > maxDay + 1) {
      return res.status(400).json({ success: false, error: `Day cannot exceed plan duration (${maxDay} days)` });
    }
    await storage.updatePlanCurrentDay(planId, day);
    res.json({ success: true, currentDay: day });
  } catch (error) {
    console.error("Error updating current day:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: fromZodError(error).toString() });
    }
    res.status(500).json({ success: false, error: "Failed to update current day" });
  }
});

// Get user profile
app.get("/api/profile/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }
    const profile = await storage.getUserProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
});

// Update user profile
app.patch("/api/profile/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
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
    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawUpdateData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    let updatedProfile;
    if (Object.keys(updateData).length > 0) {
      updatedProfile = await storage.updateUserProfile(userId, updateData);
    } else {
      updatedProfile = await storage.getUserProfile(userId);
    }
    if (!updatedProfile) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }
    let newPlan = null;
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
      return res.status(400).json({ success: false, error: fromZodError(error).toString() });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
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

// Match exercises
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
        try {
          const image = await getExerciseImage(match.name, match.namePt, match.equipment, match.primaryMuscles || []);
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

// Notification settings
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

// Notifications
app.get("/api/notifications/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = await storage.getUserNotifications(userId);
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

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

app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await storage.markNotificationRead(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to mark notification as read" });
  }
});

// Meal swap alternatives
app.post("/api/meals/swap-alternatives", async (req: Request, res: Response) => {
  try {
    const { currentMeal, userProfile, dayMeals } = req.body;
    if (!currentMeal || !userProfile) {
      return res.status(400).json({ success: false, error: "currentMeal and userProfile are required" });
    }
    const alternatives = await generateMealSwapAlternatives(currentMeal, userProfile, dayMeals || []);
    res.json({ success: true, alternatives });
  } catch (error) {
    console.error("Error generating meal alternatives:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate alternatives",
    });
  }
});

// Custom meals
app.get("/api/custom-meals/:userId/:planId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const planId = parseInt(req.params.planId);
    const customMeals = await storage.getCustomMealsForPlan(userId, planId);
    res.json({ success: true, customMeals });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch custom meals" });
  }
});

app.post("/api/custom-meals", async (req: Request, res: Response) => {
  try {
    const validatedData = insertCustomMealSchema.parse(req.body);
    const customMeal = await storage.createCustomMeal(validatedData);
    res.json({ success: true, customMeal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: fromZodError(error).toString() });
    }
    res.status(500).json({ success: false, error: "Failed to create custom meal" });
  }
});

app.delete("/api/custom-meals/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteCustomMeal(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete custom meal" });
  }
});

// AI meal from ingredients
app.post("/api/meals/from-ingredients", async (req: Request, res: Response) => {
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
      error: error instanceof Error ? error.message : "Failed to generate meal",
    });
  }
});

// Weight goal validation
app.post("/api/validate-weight-goal", async (req: Request, res: Response) => {
  try {
    const result = await validateWeightGoal(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error validating weight goal:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to validate goal",
    });
  }
});

// Coaching tips
app.post("/api/coaching/tips", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      daysCompleted: z.number(),
      totalDays: z.number(),
      currentStreak: z.number(),
      difficultyFeedback: z.object({
        easy: z.number(),
        justRight: z.number(),
        hard: z.number(),
      }),
      lastWorkoutDate: z.string().nullable().optional(),
      goal: z.string(),
      firstName: z.string(),
      language: z.string().optional(),
    });
    const input = schema.parse(req.body);
    const coachingTips = await generateCoachingTips({
      ...input,
      lastWorkoutDate: input.lastWorkoutDate ? new Date(input.lastWorkoutDate) : null,
      language: input.language || "en",
    });
    res.json({ success: true, ...coachingTips });
  } catch (error) {
    console.error("Error generating coaching tips:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: fromZodError(error).toString() });
    }
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate tips",
    });
  }
});

// Images
app.post("/api/images/exercise", async (req: Request, res: Response) => {
  try {
    const { exerciseName, exerciseNamePt, equipment, primaryMuscles } = req.body;
    if (!exerciseName || !equipment || !primaryMuscles) {
      return res.status(400).json({ success: false, error: "exerciseName, equipment, and primaryMuscles are required" });
    }
    const image = await getExerciseImage(exerciseName, exerciseNamePt || exerciseName, equipment, primaryMuscles);
    res.json({ success: true, image });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to generate image" });
  }
});

app.post("/api/images/meal", async (req: Request, res: Response) => {
  try {
    const { description, mealTime } = req.body;
    if (!description || !mealTime) {
      return res.status(400).json({ success: false, error: "description and mealTime are required" });
    }
    const image = await getMealImage(description, mealTime);
    res.json({ success: true, image });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "Failed to get meal image" });
  }
});

export default app;

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import { pgTable, text, integer, serial, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";

function parseConnectionString(url: string) {
  const match = url.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) throw new Error("Invalid DATABASE_URL format");
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const dbConfig = parseConnectionString(process.env.DATABASE_URL || "");
const pool = new Pool({
  user: dbConfig.user,
  password: dbConfig.password,
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  ssl: { rejectUnauthorized: false }
});

export const exerciseLibrary = pgTable("exercise_library", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  namePt: text("name_pt").notNull(),
  primaryMuscles: text("primary_muscles").array().notNull(),
  secondaryMuscles: text("secondary_muscles").array(),
  equipment: text("equipment").notNull(),
  difficulty: text("difficulty").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  instructions: text("instructions"),
  instructionsPt: text("instructions_pt"),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  pin: text("pin").default("0000").notNull(),
  language: text("language").default("pt").notNull(),
  sex: text("sex").notNull(),
  age: integer("age").notNull(),
  weight: integer("weight").notNull(),
  height: integer("height").notNull(),
  goal: text("goal").notNull(),
  activityLevel: text("activity_level").notNull(),
  equipment: text("equipment").array(),
  impediments: text("impediments"),
  somatotype: text("somatotype"),
  currentBodyComp: text("current_body_comp"),
  targetBodyComp: text("target_body_comp"),
  targetWeight: integer("target_weight"),
  weightGoalWeeks: integer("weight_goal_weeks"),
  goalRealistic: boolean("goal_realistic"),
  goalFeedback: text("goal_feedback"),
  timePerDay: integer("time_per_day").default(45),
  difficulty: text("difficulty").default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const fitnessPlans = pgTable("fitness_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planData: jsonb("plan_data").notNull(),
  currentDay: integer("current_day").default(1).notNull(),
  durationDays: integer("duration_days").default(30).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const exerciseProgress = pgTable("exercise_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  day: integer("day").notNull(),
  completed: integer("completed").default(0).notNull(),
  difficulty: text("difficulty"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  waterRemindersEnabled: boolean("water_reminders_enabled").default(true).notNull(),
  waterReminderIntervalMinutes: integer("water_reminder_interval_minutes").default(90).notNull(),
  mealRemindersEnabled: boolean("meal_reminders_enabled").default(true).notNull(),
  workoutRemindersEnabled: boolean("workout_reminders_enabled").default(true).notNull(),
  sleepStartHour: integer("sleep_start_hour").default(23).notNull(),
  sleepEndHour: integer("sleep_end_hour").default(7).notNull(),
  waterTargetMl: integer("water_target_ml").default(2500).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customMeals = pgTable("custom_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  dayIndex: integer("day_index").notNull(),
  mealSlot: integer("meal_slot").notNull(),
  source: text("source").notNull(),
  originalMeal: jsonb("original_meal"),
  customMeal: jsonb("custom_meal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const planGenerationStatus = pgTable("plan_generation_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id"),
  status: text("status").notNull().default("pending"),
  currentStep: integer("current_step").default(0).notNull(),
  totalSteps: integer("total_steps").default(4).notNull(),
  partialData: jsonb("partial_data"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

const db = drizzle(pool);

const AVAILABLE_EQUIPMENT = [
  "Halteres de 2kg", "Haltere de 4kg", "Haltere de 9kg", "Kettlebell de 6kg",
  "Titanium Strength SUPREME Leg Press / Hack Squat", "Adidas Home Gym Multi-ginásio",
  "Passadeira com elevação e velocidade ajustáveis", "Bicicleta", "Máquina de step",
  "Banco Adidas", "Bola de ginástica", "Peso corporal (sem equipamento)"
];

function getAzureConfig() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-01-01-preview";
  
  if (!apiKey || !endpoint || !deployment) {
    throw new Error("Azure OpenAI environment variables not configured");
  }
  return { apiKey, endpoint, deployment, apiVersion };
}

function calculateUserMetrics(userProfile: any) {
  const bmr = userProfile.sex === "Male"
    ? 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5
    : 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;
  const activityMultipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
  const tdee = Math.round(bmr * (activityMultipliers[userProfile.activityLevel] || 1.2));
  let targetCalories = tdee;
  if (userProfile.goal === "loss") targetCalories = Math.round(tdee - 400);
  else if (userProfile.goal === "muscle") targetCalories = Math.round(tdee + 300);
  const waterTarget = Math.round(userProfile.weight * 35);
  return { bmr, tdee, targetCalories, waterTarget };
}

async function callAzureOpenAI(systemPrompt: string, userPrompt: string, maxTokens: number = 3000): Promise<any> {
  const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const startTime = Date.now();
  console.log("Calling Azure OpenAI...");
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_completion_tokens: maxTokens,
      temperature: 1
    })
  });

  const elapsed = Date.now() - startTime;
  console.log(`Azure response in ${elapsed}ms, status: ${response.status}`);

  const responseText = await response.text();
  console.log("Azure raw response length:", responseText.length);

  if (!response.ok) {
    console.error("Azure error response:", responseText.slice(0, 500));
    throw new Error(`Azure error: ${response.status} - ${responseText.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error("Failed to parse Azure response as JSON:", responseText.slice(0, 500));
    throw new Error("Azure response is not valid JSON");
  }
  
  console.log("Azure parsed, choices:", data.choices?.length || 0, "error:", data.error?.message || "none");
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("No content in response. Full response:", JSON.stringify(data).slice(0, 500));
    throw new Error("No content in AI response");
  }
  
  console.log("AI content length:", content.length);
  const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("No JSON found in content:", content.slice(0, 300));
    throw new Error("No valid JSON in AI response");
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseErr) {
    console.error("JSON parse error:", parseErr, "Content:", jsonMatch[0].slice(0, 300));
    throw new Error("Failed to parse AI response as JSON");
  }
}

// Generate plan in 6 smaller chunks (3 days each for workout, plus nutrition)
async function generatePlanChunk(userProfile: any, step: number): Promise<any> {
  const { targetCalories, waterTarget } = calculateUserMetrics(userProfile);
  const goalPt: Record<string, string> = { loss: "Perda de Peso", muscle: "Ganho Muscular", gain: "Ganho de Peso", endurance: "Resistência" };
  const profile = `${userProfile.sex === "Male" ? "M" : "F"}, ${userProfile.age}a, ${userProfile.weight}kg, ${userProfile.height}cm. Obj: ${goalPt[userProfile.goal] || "Fitness"}. Cal: ${targetCalories}. Equip: ${AVAILABLE_EQUIPMENT.slice(0,5).join(",")}. Limitações: ${userProfile.impediments || "Nenhuma"}`;
  
  const dayStructure = `[{"day":N,"is_rest_day":false,"workout_name_pt":"","duration_minutes":30,"estimated_calories_burnt":200,"focus_pt":"","warmup_pt":"","warmup_exercises":[{"name_pt":"","duration_seconds":30}],"cooldown_pt":"","cooldown_exercises":[{"name_pt":"","duration_seconds":30}],"exercises":[{"name_pt":"","sequence_order":1,"sets":3,"reps_or_time":"12","equipment_used":""}]}]`;

  // Steps 1-5: Generate 3 workout days each
  if (step >= 1 && step <= 5) {
    const dayRanges = [[1,3], [4,6], [7,9], [10,12], [13,15]];
    const [start, end] = dayRanges[step - 1];
    const prompt = `${profile}\n\nGera dias ${start}-${end} treino. JSON array:\n${dayStructure}`;
    return await callAzureOpenAI(`Fitness coach. Dias ${start}-${end}. JSON array only.`, prompt, 8000);
  }
  // Step 6: Nutrition plan
  else if (step === 6) {
    const nutritionStructure = `{"plan_summary_pt":"","nutrition_plan_7_days":[{"day":1,"total_daily_calories":${targetCalories},"meals":[{"meal_time_pt":"Pequeno Almoço","description_pt":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}],"hydration_guidelines_pt":{"water_target_ml":${waterTarget}}}`;
    const prompt = `${profile}\n\nGera nutrição 7 dias. ${targetCalories} kcal/dia. JSON:\n${nutritionStructure}`;
    return await callAzureOpenAI("Nutricionista. 7 dias. JSON only.", prompt, 10000);
  }
  throw new Error("Invalid step");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const path = req.url?.replace(/\?.*$/, "") || "";

  try {
    // Debug endpoint to check DATABASE_URL format
    if (method === "GET" && path === "/api/debug") {
      const dbUrl = process.env.DATABASE_URL || "NOT SET";
      const masked = dbUrl.replace(/:([^:@]+)@/, ':****@');
      try {
        const config = parseConnectionString(dbUrl);
        return res.json({ 
          success: true, 
          dbUrlMasked: masked,
          hasDbUrl: !!process.env.DATABASE_URL,
          parsedConfig: {
            user: config.user,
            host: config.host,
            port: config.port,
            database: config.database,
            passwordLength: config.password?.length || 0,
            passwordHint: config.password ? `${config.password[0]}...${config.password[config.password.length - 1]}` : "none"
          }
        });
      } catch (e) {
        return res.json({ 
          success: false, 
          error: e instanceof Error ? e.message : "Parse error",
          dbUrlMasked: masked
        });
      }
    }

    // Onboarding - create user profile and start chunked plan generation
    if (method === "POST" && path === "/api/onboarding") {
      const profileData = req.body;
      profileData.equipment = AVAILABLE_EQUIPMENT;
      
      // Create user profile
      const [userProfile] = await db.insert(userProfiles)
        .values({
          firstName: profileData.firstName,
          phoneNumber: profileData.phoneNumber,
          pin: profileData.pin || "0000",
          language: profileData.language || "pt",
          sex: profileData.sex,
          age: profileData.age,
          weight: profileData.weight,
          height: profileData.height,
          goal: profileData.goal,
          activityLevel: profileData.activityLevel,
          equipment: profileData.equipment,
          impediments: profileData.impediments,
          somatotype: profileData.somatotype,
          currentBodyComp: profileData.currentBodyComp,
          targetBodyComp: profileData.targetBodyComp,
          timePerDay: profileData.timePerDay,
          difficulty: profileData.difficulty,
        })
        .returning();

      console.log("Created user profile:", userProfile.id, "- Starting chunked generation");
      
      // Create generation status tracker (6 steps: 5 workout chunks + 1 nutrition)
      const [status] = await db.insert(planGenerationStatus)
        .values({
          userId: userProfile.id,
          status: "generating",
          currentStep: 0,
          totalSteps: 6,
          partialData: { fitness_plan_15_days: [], nutrition_plan_7_days: [], plan_summary_pt: "", hydration_guidelines_pt: null }
        })
        .returning();

      return res.json({
        success: true,
        userId: userProfile.id,
        statusId: status.id,
        status: "generating",
        currentStep: 0,
        totalSteps: 6,
        message: "Profile created. Call /api/generate-chunk to continue."
      });
    }

    // Generate next chunk of the plan
    if (method === "POST" && path === "/api/generate-chunk") {
      const { userId, statusId } = req.body;
      
      const [status] = await db.select().from(planGenerationStatus).where(eq(planGenerationStatus.id, statusId));
      if (!status) return res.status(404).json({ success: false, error: "Status not found" });
      if (status.status === "completed") return res.json({ success: true, status: "completed", planId: status.planId });
      if (status.status === "error") return res.status(500).json({ success: false, error: status.error });

      const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!userProfile) return res.status(404).json({ success: false, error: "User not found" });

      const nextStep = status.currentStep + 1;
      console.log(`Generating chunk ${nextStep}/6 for user ${userId}`);

      try {
        console.log("Calling generatePlanChunk for step", nextStep);
        const chunkData = await generatePlanChunk(userProfile, nextStep);
        console.log("Chunk data received, type:", Array.isArray(chunkData) ? "array" : typeof chunkData);
        const partial = (status.partialData || {}) as any;

        // Steps 1-5: Workout days (3 days each)
        if (nextStep <= 5) {
          const days = Array.isArray(chunkData) ? chunkData : [];
          partial.fitness_plan_15_days = [...(partial.fitness_plan_15_days || []), ...days];
        } 
        // Step 6: Nutrition plan
        else {
          partial.plan_summary_pt = chunkData.plan_summary_pt || "";
          partial.nutrition_plan_7_days = chunkData.nutrition_plan_7_days || [];
          partial.hydration_guidelines_pt = chunkData.hydration_guidelines_pt || null;
        }

        if (nextStep >= 6) {
          // All chunks done - save final plan
          const [fitnessPlan] = await db.insert(fitnessPlans)
            .values({
              userId: userProfile.id,
              planData: partial,
              currentDay: 1,
              durationDays: 15,
              isActive: true,
            })
            .returning();

          await db.update(planGenerationStatus)
            .set({ status: "completed", currentStep: 6, partialData: partial, planId: fitnessPlan.id, updatedAt: new Date() })
            .where(eq(planGenerationStatus.id, statusId));

          return res.json({ success: true, status: "completed", planId: fitnessPlan.id, plan: partial });
        } else {
          await db.update(planGenerationStatus)
            .set({ currentStep: nextStep, partialData: partial, updatedAt: new Date() })
            .where(eq(planGenerationStatus.id, statusId));

          return res.json({ success: true, status: "generating", currentStep: nextStep, totalSteps: 6 });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Generation failed";
        await db.update(planGenerationStatus)
          .set({ status: "error", error: errorMsg, updatedAt: new Date() })
          .where(eq(planGenerationStatus.id, statusId));
        return res.status(500).json({ success: false, error: errorMsg });
      }
    }

    // Check generation status
    if (method === "GET" && path.match(/^\/api\/generation-status\/\d+$/)) {
      const statusId = parseInt(path.split("/").pop() || "");
      const [status] = await db.select().from(planGenerationStatus).where(eq(planGenerationStatus.id, statusId));
      if (!status) return res.status(404).json({ success: false, error: "Status not found" });
      return res.json({
        success: true,
        status: status.status,
        currentStep: status.currentStep,
        totalSteps: status.totalSteps,
        planId: status.planId,
        error: status.error
      });
    }

    if (method === "POST" && path === "/api/login") {
      const { phoneNumber, pin } = req.body;
      if (!phoneNumber || !pin) {
        return res.status(400).json({ success: false, error: "Phone number and PIN are required" });
      }
      const [user] = await db.select().from(userProfiles)
        .where(and(eq(userProfiles.phoneNumber, phoneNumber), eq(userProfiles.pin, pin)))
        .limit(1);
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid phone number or PIN" });
      }
      return res.json({ success: true, userId: user.id, language: user.language });
    }

    if (method === "GET" && path.match(/^\/api\/plan\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      let [plan] = await db.select().from(fitnessPlans)
        .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)))
        .orderBy(desc(fitnessPlans.createdAt))
        .limit(1);
      if (!plan) {
        [plan] = await db.select().from(fitnessPlans)
          .where(eq(fitnessPlans.userId, userId))
          .orderBy(desc(fitnessPlans.createdAt))
          .limit(1);
      }
      if (!plan) {
        return res.status(404).json({ success: false, error: "No plan found" });
      }
      const progress = await db.select().from(exerciseProgress)
        .where(and(eq(exerciseProgress.userId, userId), eq(exerciseProgress.planId, plan.id)));
      const durationDays = plan.durationDays || 30;
      const startDate = plan.startDate || plan.createdAt;
      const endDate = plan.endDate || new Date(new Date(startDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
      const isExpired = new Date() > endDate;
      return res.json({
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
    }

    if (method === "GET" && path.match(/^\/api\/profile\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!profile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }
      return res.json({ success: true, profile });
    }

    if (method === "GET" && path === "/api/exercises") {
      const exercises = await db.select().from(exerciseLibrary);
      return res.json({ success: true, exercises });
    }

    if (method === "GET" && path.match(/^\/api\/exercises\/[^/]+$/)) {
      const id = path.split("/").pop() || "";
      const [exercise] = await db.select().from(exerciseLibrary).where(eq(exerciseLibrary.id, id));
      if (!exercise) {
        return res.status(404).json({ success: false, error: "Exercise not found" });
      }
      return res.json({ success: true, exercise });
    }

    if (method === "POST" && path === "/api/exercises/match") {
      const { exerciseNames } = req.body;
      if (!exerciseNames || !Array.isArray(exerciseNames)) {
        return res.status(400).json({ success: false, error: "exerciseNames array required" });
      }
      const allExercises = await db.select().from(exerciseLibrary);
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
          matched[name] = match;
        }
      }
      return res.json({ success: true, exercises: matched });
    }

    if (method === "POST" && path === "/api/progress") {
      const { userId, planId, day, difficulty } = req.body;
      if (!userId || !planId || !day || !difficulty) {
        return res.status(400).json({ success: false, error: "userId, planId, day, and difficulty are required" });
      }
      const [existing] = await db.select().from(exerciseProgress)
        .where(and(
          eq(exerciseProgress.userId, userId),
          eq(exerciseProgress.planId, planId),
          eq(exerciseProgress.day, day)
        ));
      let progress;
      if (existing) {
        await db.update(exerciseProgress)
          .set({ difficulty, completedAt: new Date() })
          .where(eq(exerciseProgress.id, existing.id));
        progress = { ...existing, difficulty };
      } else {
        [progress] = await db.insert(exerciseProgress)
          .values({ userId, planId, day, completed: 1, difficulty, completedAt: new Date() })
          .returning();
      }
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (plan) {
        const maxDay = plan.durationDays || 30;
        const nextDay = Math.min(day + 1, maxDay + 1);
        await db.update(fitnessPlans)
          .set({ currentDay: nextDay, updatedAt: new Date() })
          .where(eq(fitnessPlans.id, planId));
      }
      return res.json({ success: true, progress });
    }

    if (method === "PATCH" && path.match(/^\/api\/plan\/\d+\/day$/)) {
      const planId = parseInt(path.split("/")[3]);
      const { day } = req.body;
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (!plan) {
        return res.status(404).json({ success: false, error: "Plan not found" });
      }
      const maxDay = plan.durationDays || 30;
      if (day > maxDay + 1) {
        return res.status(400).json({ success: false, error: `Day cannot exceed ${maxDay}` });
      }
      await db.update(fitnessPlans)
        .set({ currentDay: day, updatedAt: new Date() })
        .where(eq(fitnessPlans.id, planId));
      return res.json({ success: true, currentDay: day });
    }

    if (method === "GET" && path.match(/^\/api\/custom-meals\/\d+\/\d+$/)) {
      const parts = path.split("/");
      const userId = parseInt(parts[3]);
      const planId = parseInt(parts[4]);
      const meals = await db.select().from(customMeals)
        .where(and(eq(customMeals.userId, userId), eq(customMeals.planId, planId)));
      return res.json({ success: true, customMeals: meals });
    }

    if (method === "GET" && path.match(/^\/api\/notifications\/settings\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      let [settings] = await db.select().from(notificationSettings)
        .where(eq(notificationSettings.userId, userId));
      if (!settings) {
        [settings] = await db.insert(notificationSettings)
          .values({ userId })
          .returning();
      }
      return res.json({ success: true, settings });
    }

    // GET all plans for a user (plural route)
    if (method === "GET" && path.match(/^\/api\/plans\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      const plans = await db.select().from(fitnessPlans)
        .where(eq(fitnessPlans.userId, userId))
        .orderBy(desc(fitnessPlans.createdAt));
      return res.json({ success: true, plans });
    }

    // Notifications poll endpoint
    if (method === "POST" && path.match(/^\/api\/notifications\/poll\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      // Return empty notifications for now - can be enhanced later
      return res.json({ success: true, notifications: [] });
    }

    // Weight goal validation endpoint
    if (method === "POST" && path === "/api/validate-weight-goal") {
      const { currentWeight, goalWeight, height, age, gender, activityLevel } = req.body;
      
      // Basic validation - check if goal is realistic
      const weightDiff = Math.abs(currentWeight - goalWeight);
      const maxWeeklyChange = 1; // kg per week is safe
      const weeksNeeded = Math.ceil(weightDiff / maxWeeklyChange);
      
      // Calculate BMI for reference
      const heightInMeters = height / 100;
      const currentBMI = currentWeight / (heightInMeters * heightInMeters);
      const goalBMI = goalWeight / (heightInMeters * heightInMeters);
      
      const isRealistic = weightDiff <= 30 && goalBMI >= 18.5 && goalBMI <= 30;
      
      return res.json({
        success: true,
        isRealistic,
        currentBMI: Math.round(currentBMI * 10) / 10,
        goalBMI: Math.round(goalBMI * 10) / 10,
        weeksNeeded,
        recommendations: isRealistic ? [] : [
          goalBMI < 18.5 ? "Goal weight may be too low for your height" : "",
          goalBMI > 30 ? "Consider a more ambitious weight loss goal" : "",
          weightDiff > 30 ? "Consider setting intermediate goals" : ""
        ].filter(Boolean)
      });
    }

    return res.status(404).json({ success: false, error: "Route not found", path, method });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

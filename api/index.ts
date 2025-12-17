import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc, sql } from "drizzle-orm";
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

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

    // Check if user already exists by phone + name
    if (method === "POST" && path === "/api/users/check") {
      const { phoneNumber, firstName } = req.body;
      if (!phoneNumber || !firstName) {
        return res.status(400).json({ success: false, error: "Phone number and name required" });
      }
      
      const existing = await db.select()
        .from(userProfiles)
        .where(
          and(
            eq(userProfiles.phoneNumber, phoneNumber),
            sql`LOWER(${userProfiles.firstName}) = LOWER(${firstName})`
          )
        )
        .limit(1);
      
      return res.json({ 
        success: true, 
        exists: existing.length > 0,
        userId: existing.length > 0 ? existing[0].id : null
      });
    }

    // Onboarding - create user profile and start chunked plan generation
    if (method === "POST" && path === "/api/onboarding") {
      const profileData = req.body;
      profileData.equipment = AVAILABLE_EQUIPMENT;
      
      // Check for existing user with same phone + name
      const existing = await db.select()
        .from(userProfiles)
        .where(
          and(
            eq(userProfiles.phoneNumber, profileData.phoneNumber),
            sql`LOWER(${userProfiles.firstName}) = LOWER(${profileData.firstName})`
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(409).json({ 
          success: false, 
          error: "duplicate",
          message: "User already exists with this phone number and name",
          userId: existing[0].id
        });
      }
      
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
        } as any)
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
        } as any)
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
            } as any)
            .returning();

          await db.update(planGenerationStatus)
            .set({ status: "completed", currentStep: 6, partialData: partial, planId: fitnessPlan.id, updatedAt: new Date() } as any)
            .where(eq(planGenerationStatus.id, statusId));

          return res.json({ success: true, status: "completed", planId: fitnessPlan.id, plan: partial });
        } else {
          await db.update(planGenerationStatus)
            .set({ currentStep: nextStep, partialData: partial, updatedAt: new Date() } as any)
            .where(eq(planGenerationStatus.id, statusId));

          return res.json({ success: true, status: "generating", currentStep: nextStep, totalSteps: 6 });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Generation failed";
        await db.update(planGenerationStatus)
          .set({ status: "error", error: errorMsg, updatedAt: new Date() } as any)
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
      const unmatched: string[] = [];
      const matchDetails: { name: string; matchedTo?: string; hasVideo: boolean; hasImage: boolean; hasInstructions: boolean }[] = [];
      
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

      const findSynonymMatch = (name: string, exercises: any[]): any | null => {
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
      
      // Pexels image fetch helper
      const pexelsApiKey = process.env.PEXELS_API_KEY;
      const imageCache: Record<string, any> = {};
      
      const getPexelsImage = async (exerciseName: string, primaryMuscles: string[] = []): Promise<{ url: string; source: string; photographer?: string }> => {
        const muscleTerms = primaryMuscles.slice(0, 2).join(" ");
        const searchTerms = `fitness ${exerciseName} ${muscleTerms}`.trim();
        
        if (imageCache[searchTerms]) return imageCache[searchTerms];
        
        if (!pexelsApiKey) {
          return { url: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800", source: "pexels-fallback" };
        }
        
        try {
          const pexelsResponse = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
            { headers: { Authorization: pexelsApiKey } }
          );
          
          if (pexelsResponse.ok) {
            const data = await pexelsResponse.json();
            if (data.photos && data.photos.length > 0) {
              const photo = data.photos[0];
              const result = { url: photo.src.medium, source: "pexels", photographer: photo.photographer };
              imageCache[searchTerms] = result;
              return result;
            }
          }
        } catch (e) {
          console.log("Pexels fetch error:", e);
        }
        
        return { url: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800", source: "pexels-fallback" };
      }
      
      for (const name of exerciseNames) {
        const match = findSynonymMatch(name, allExercises);
        if (match) {
          // Always fetch Pexels image as primary source (InspireUSA URLs are returning 404)
          let pexelsImage: { url: string; source: string; photographer?: string } | null = null;
          try {
            pexelsImage = await getPexelsImage(match.name, match.primaryMuscles || []);
          } catch (e) {
            console.log("Pexels error for", name, e);
          }
          // Use Pexels as primary, clear broken imageUrl
          matched[name] = { ...match, imageUrl: null, pexelsImage };
          matchDetails.push({
            name,
            matchedTo: match.name,
            hasVideo: !!match.videoUrl,
            hasImage: !!(pexelsImage?.url),
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
          .set({ difficulty, completedAt: new Date() } as any)
          .where(eq(exerciseProgress.id, existing.id));
        progress = { ...existing, difficulty };
      } else {
        [progress] = await db.insert(exerciseProgress)
          .values({ userId, planId, day, completed: 1, difficulty, completedAt: new Date() } as any)
          .returning();
      }
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (plan) {
        const maxDay = plan.durationDays || 30;
        const nextDay = Math.min(day + 1, maxDay + 1);
        await db.update(fitnessPlans)
          .set({ currentDay: nextDay, updatedAt: new Date() } as any)
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
        .set({ currentDay: day, updatedAt: new Date() } as any)
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
          .values({ userId } as any)
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
      const { currentWeight, targetWeight, weeks, sex, age, height, goal, activityLevel, language } = req.body;
      
      // Validate inputs
      if (!currentWeight || !targetWeight || !weeks) {
        return res.status(400).json({ success: false, error: "currentWeight, targetWeight, and weeks are required" });
      }
      
      const isPt = language === "pt";
      const weightDiff = Math.abs(targetWeight - currentWeight);
      const weeklyChange = weightDiff / weeks;
      
      // Scientific guidelines:
      // - Healthy weight loss: 0.5-1 kg/week (0.75 = comfortable, 1.2 = challenging but doable)
      // - Weight/muscle gain: 0.25-0.5 kg/week
      
      let status: "possible" | "challenging" | "not_possible";
      
      const isLoss = goal === "loss" || targetWeight < currentWeight;
      
      if (isLoss) {
        // Weight loss thresholds
        if (weeklyChange <= 0.75) {
          status = "possible";
        } else if (weeklyChange <= 1.2) {
          status = "challenging";
        } else {
          status = "not_possible";
        }
      } else {
        // Weight/muscle gain thresholds
        if (weeklyChange <= 0.4) {
          status = "possible";
        } else if (weeklyChange <= 0.6) {
          status = "challenging";
        } else {
          status = "not_possible";
        }
      }
      
      // Localized messages
      const messages = {
        possible: {
          pt: `Excelente! Perder ${weightDiff.toFixed(1)}kg em ${weeks} semanas (${weeklyChange.toFixed(2)}kg/semana) é um objetivo saudável e alcançável.`,
          en: `Excellent! Losing ${weightDiff.toFixed(1)}kg in ${weeks} weeks (${weeklyChange.toFixed(2)}kg/week) is a healthy and achievable goal.`
        },
        challenging: {
          pt: `${isLoss ? "Perder" : "Ganhar"} ${weightDiff.toFixed(1)}kg em ${weeks} semanas (${weeklyChange.toFixed(2)}kg/semana) é desafiador mas possível com dedicação.`,
          en: `${isLoss ? "Losing" : "Gaining"} ${weightDiff.toFixed(1)}kg in ${weeks} weeks (${weeklyChange.toFixed(2)}kg/week) is challenging but possible with dedication.`
        },
        not_possible: {
          pt: `${isLoss ? "Perder" : "Ganhar"} ${weightDiff.toFixed(1)}kg em ${weeks} semanas (${weeklyChange.toFixed(2)}kg/semana) não é recomendado. Sugerimos um período mais longo ou um objetivo mais moderado.`,
          en: `${isLoss ? "Losing" : "Gaining"} ${weightDiff.toFixed(1)}kg in ${weeks} weeks (${weeklyChange.toFixed(2)}kg/week) is not recommended. We suggest a longer timeframe or a more moderate goal.`
        }
      };
      
      const statusLabels = {
        possible: { pt: "Possível", en: "Possible" },
        challenging: { pt: "Desafiador", en: "Challenging" },
        not_possible: { pt: "Não recomendado", en: "Not recommended" }
      };
      
      console.log(`[validate-weight-goal] ${currentWeight}kg -> ${targetWeight}kg in ${weeks} weeks = ${weeklyChange.toFixed(2)} kg/week -> ${status}`);
      
      return res.json({
        success: true,
        status,
        statusLabel: isPt ? statusLabels[status].pt : statusLabels[status].en,
        message: isPt ? messages[status].pt : messages[status].en,
        weeklyChange: Math.round(weeklyChange * 100) / 100,
        weightDiff: Math.round(weightDiff * 10) / 10,
        weeks
      });
    }

    // Check for duplicate user
    if (method === "POST" && path === "/api/users/check") {
      const { phoneNumber, firstName } = req.body;
      if (!phoneNumber || !firstName) {
        return res.status(400).json({ success: false, error: "phoneNumber and firstName required" });
      }
      const phoneNormalized = phoneNumber.replace(/\s+/g, "");
      const [existing] = await db.select().from(userProfiles)
        .where(and(
          sql`LOWER(REPLACE(${userProfiles.phoneNumber}, ' ', '')) = LOWER(${phoneNormalized})`,
          sql`LOWER(${userProfiles.firstName}) = LOWER(${firstName})`
        ));
      return res.json({ success: true, exists: !!existing, userId: existing?.id });
    }

    // Generate recipe for a meal that doesn't have one
    if (method === "POST" && path === "/api/nutrition/generate-recipe") {
      const { mealDescription, mainIngredients, targetCalories, targetProtein, targetCarbs, targetFat, language } = req.body;
      
      // Validate with helpful error messages
      if (!mealDescription && !mainIngredients) {
        return res.status(400).json({ 
          success: false, 
          error: language === "pt" 
            ? "Descrição da refeição e ingredientes são necessários" 
            : "Meal description and ingredients are required",
          received: { mealDescription, mainIngredients }
        });
      }
      
      // Use defaults if one is missing
      const description = mealDescription || mainIngredients || "Refeição";
      const ingredients = mainIngredients || mealDescription || "Ingredientes variados";
      const isPt = (language || "pt") === "pt";
      const cals = targetCalories || 300;
      const prot = targetProtein || 20;
      const carbs = targetCarbs || 30;
      const fat = targetFat || 10;
      const systemPrompt = isPt
        ? `És um chef nutricional. Cria uma receita detalhada para a refeição descrita.\n\nREGRAS:\n1. Usa os ingredientes indicados com quantidades exatas em gramas\n2. Cria passos de preparação numerados (1., 2., 3., etc.)\n3. Os macros dos ingredientes devem somar aproximadamente: ${cals} kcal, ${prot}g proteína, ${carbs}g carboidratos, ${fat}g gordura\n4. Português (pt-PT)`
        : `You are a nutritional chef. Create a detailed recipe for the described meal.\n\nRULES:\n1. Use the listed ingredients with exact quantities in grams\n2. Create numbered preparation steps (1., 2., 3., etc.)\n3. Ingredient macros should sum to approximately: ${cals} kcal, ${prot}g protein, ${carbs}g carbs, ${fat}g fat\n4. English`;
      const userPrompt = isPt
        ? `Refeição: ${description}\nIngredientes principais: ${ingredients}\nMeta nutricional: ${cals} kcal, P:${prot}g, C:${carbs}g, G:${fat}g\n\nCria a receita completa com lista de ingredientes detalhada.`
        : `Meal: ${description}\nMain ingredients: ${ingredients}\nNutritional target: ${cals} kcal, P:${prot}g, C:${carbs}g, F:${fat}g\n\nCreate the complete recipe with detailed ingredient list.`;
      const jsonSchema = {
        name: "recipe_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            recipe_pt: { type: "string" },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name_pt: { type: "string" },
                  quantity: { type: "string" },
                  calories: { type: "integer" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" }
                },
                required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
                additionalProperties: false
              }
            }
          },
          required: ["recipe_pt", "ingredients"],
          additionalProperties: false
        }
      };
      const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      const aiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_schema", json_schema: jsonSchema },
          temperature: 1,
          max_completion_tokens: 4000,
        }),
      });
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Azure OpenAI API error: ${aiResponse.status} - ${errorText}`);
      }
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in response");
      const recipe = JSON.parse(content);
      return res.json({ success: true, recipe });
    }

    // Generate meal from ingredients
    if (method === "POST" && path === "/api/nutrition/meal-from-ingredients") {
      const { ingredients, targetCalories, targetProtein, targetCarbs, targetFat, mealTime, language } = req.body;
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ success: false, error: "ingredients array required" });
      }
      const isPt = (language || "pt") === "pt";
      const systemPrompt = isPt
        ? `Cria uma refeição SIMPLES e realista do dia-a-dia.\n\nREGRAS IMPORTANTES:\n1. Usa 2-4 ingredientes da lista com QUANTIDADES REALISTAS (ex: 80-100g carne, 30-40g fiambre, 150g arroz cozido)\n2. Prioriza porções normais\n3. Calorias aproximadas: ${targetCalories} kcal (±150 está OK)\n4. Preparação em 2-3 passos curtos\n5. Refeição: ${mealTime}\n6. Português (pt-PT)`
        : `Create a SIMPLE, realistic everyday meal.\n\nRULES:\n1. Use 2-4 ingredients with REALISTIC portions\n2. Prioritize normal portions\n3. Approximate calories: ${targetCalories} kcal (±150 is OK)\n4. Preparation in 2-3 short steps\n5. Meal time: ${mealTime}\n6. English`;
      const userPrompt = isPt
        ? `Ingredientes: ${ingredients.join(', ')}\nMeta: ~${targetCalories} kcal, ~${targetProtein}g proteína\n\nCria 1 refeição simples.`
        : `Ingredients: ${ingredients.join(', ')}\nTarget: ~${targetCalories} kcal, ~${targetProtein}g protein\n\nCreate 1 simple meal.`;
      const jsonSchema = {
        name: "meal_from_ingredients_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            meal: {
              type: "object",
              properties: {
                meal_time_pt: { type: "string" },
                description_pt: { type: "string" },
                main_ingredients_pt: { type: "string" },
                recipe_pt: { type: "string" },
                calories: { type: "integer" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name_pt: { type: "string" },
                      quantity: { type: "string" },
                      calories: { type: "integer" },
                      protein_g: { type: "number" },
                      carbs_g: { type: "number" },
                      fat_g: { type: "number" }
                    },
                    required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
                    additionalProperties: false
                  }
                }
              },
              required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "recipe_pt", "calories", "protein_g", "carbs_g", "fat_g", "ingredients"],
              additionalProperties: false
            }
          },
          required: ["meal"],
          additionalProperties: false
        }
      };
      const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      const aiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_schema", json_schema: jsonSchema },
          temperature: 1,
          max_completion_tokens: 8000,
        }),
      });
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Azure OpenAI API error: ${aiResponse.status} - ${errorText}`);
      }
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in response");
      const result = JSON.parse(content);
      return res.json({ success: true, meal: result.meal });
    }

    // Save custom meal
    if (method === "POST" && path === "/api/nutrition/custom-meal") {
      const { userId, planId, dayIndex, mealSlot, source, originalMeal, customMeal: customMealData } = req.body;
      if (!userId || !planId || dayIndex === undefined || mealSlot === undefined || !source || !customMealData) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }
      const [meal] = await db.insert(customMeals)
        .values({ userId, planId, dayIndex, mealSlot, source, originalMeal, customMeal: customMealData } as any)
        .returning();
      return res.json({ success: true, customMeal: meal });
    }

    // Delete custom meal (revert to original)
    if (method === "DELETE" && path.match(/^\/api\/nutrition\/custom-meal\/\d+$/)) {
      const mealId = parseInt(path.split("/").pop() || "");
      await db.delete(customMeals).where(eq(customMeals.id, mealId));
      return res.json({ success: true });
    }

    // Get custom meals for nutrition (alternate path)
    if (method === "GET" && path.match(/^\/api\/nutrition\/custom-meals\/\d+\/\d+$/)) {
      const parts = path.split("/");
      const userId = parseInt(parts[4]);
      const planId = parseInt(parts[5]);
      const meals = await db.select().from(customMeals)
        .where(and(eq(customMeals.userId, userId), eq(customMeals.planId, planId)));
      return res.json({ success: true, customMeals: meals });
    }

    // Update notification settings (with validation)
    if (method === "PATCH" && path.match(/^\/api\/notifications\/settings\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      const { waterRemindersEnabled, waterReminderIntervalMinutes, mealRemindersEnabled, 
              workoutRemindersEnabled, sleepStartHour, sleepEndHour, waterTargetMl } = req.body;
      const updateData: Record<string, any> = {};
      if (waterRemindersEnabled !== undefined) updateData.waterRemindersEnabled = Boolean(waterRemindersEnabled);
      if (waterReminderIntervalMinutes !== undefined) {
        const val = parseInt(waterReminderIntervalMinutes);
        if (val >= 30 && val <= 180) updateData.waterReminderIntervalMinutes = val;
        else return res.status(400).json({ success: false, error: "waterReminderIntervalMinutes must be 30-180" });
      }
      if (mealRemindersEnabled !== undefined) updateData.mealRemindersEnabled = Boolean(mealRemindersEnabled);
      if (workoutRemindersEnabled !== undefined) updateData.workoutRemindersEnabled = Boolean(workoutRemindersEnabled);
      if (sleepStartHour !== undefined) {
        const val = parseInt(sleepStartHour);
        if (val >= 0 && val <= 23) updateData.sleepStartHour = val;
        else return res.status(400).json({ success: false, error: "sleepStartHour must be 0-23" });
      }
      if (sleepEndHour !== undefined) {
        const val = parseInt(sleepEndHour);
        if (val >= 0 && val <= 23) updateData.sleepEndHour = val;
        else return res.status(400).json({ success: false, error: "sleepEndHour must be 0-23" });
      }
      if (waterTargetMl !== undefined) {
        const val = parseInt(waterTargetMl);
        if (val >= 1000 && val <= 5000) updateData.waterTargetMl = val;
        else return res.status(400).json({ success: false, error: "waterTargetMl must be 1000-5000" });
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(notificationSettings).set(updateData).where(eq(notificationSettings.userId, userId));
      }
      return res.json({ success: true });
    }

    // Get user notifications (with ordering and limit)
    if (method === "GET" && path.match(/^\/api\/notifications\/\d+$/) && !path.includes("settings")) {
      const userId = parseInt(path.split("/").pop() || "");
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }
      const notifs = await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      return res.json({ success: true, notifications: notifs });
    }

    // Mark notification as read (with validation)
    if (method === "PATCH" && path.match(/^\/api\/notifications\/\d+\/read$/)) {
      const notifId = parseInt(path.split("/")[3]);
      if (isNaN(notifId)) {
        return res.status(400).json({ success: false, error: "Invalid notification ID" });
      }
      const result = await db.update(notifications)
        .set({ isRead: true, readAt: new Date() } as any)
        .where(eq(notifications.id, notifId))
        .returning();
      if (result.length === 0) {
        return res.status(404).json({ success: false, error: "Notification not found" });
      }
      return res.json({ success: true });
    }

    // Get meal image from Pexels
    if (method === "POST" && path === "/api/images/meal") {
      const { description, mealTime } = req.body;
      if (!description || !mealTime) {
        return res.status(400).json({ success: false, error: "description and mealTime required" });
      }
      const pexelsApiKey = process.env.PEXELS_API_KEY;
      const searchTerms = `food ${description} ${mealTime}`.trim();
      if (!pexelsApiKey) {
        return res.json({ success: true, image: { url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800", source: "pexels-fallback" } });
      }
      try {
        const pexelsResponse = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: pexelsApiKey } }
        );
        if (pexelsResponse.ok) {
          const data = await pexelsResponse.json();
          if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            return res.json({ success: true, image: { url: photo.src.medium, source: "pexels", photographer: photo.photographer } });
          }
        }
      } catch (e) {
        console.log("Pexels meal image error:", e);
      }
      return res.json({ success: true, image: { url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800", source: "pexels-fallback" } });
    }

    // Meal swap alternatives
    if (method === "POST" && path === "/api/nutrition/meal-swap") {
      const { originalMeal, targetCalories, targetProtein, targetCarbs, targetFat, mealTime, language } = req.body;
      if (!originalMeal || !targetCalories) {
        return res.status(400).json({ success: false, error: "originalMeal and targetCalories required" });
      }
      const isPt = (language || "pt") === "pt";
      const systemPrompt = isPt
        ? `Nutricionista. Gera 3 alternativas de refeição com macros similares. Cada alternativa deve ter: description_pt, main_ingredients_pt, recipe_pt, calories, protein_g, carbs_g, fat_g. Meta: ${targetCalories} kcal. Português pt-PT.`
        : `Nutritionist. Generate 3 meal alternatives with similar macros. Each should have: description_pt, main_ingredients_pt, recipe_pt, calories, protein_g, carbs_g, fat_g. Target: ${targetCalories} kcal. English.`;
      const userPrompt = isPt
        ? `Refeição original: ${originalMeal.description_pt}\nIngredientes: ${originalMeal.main_ingredients_pt}\nHora: ${mealTime}\nMeta: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, G:${targetFat}g\n\nGera 3 alternativas variadas.`
        : `Original meal: ${originalMeal.description_pt}\nIngredients: ${originalMeal.main_ingredients_pt}\nTime: ${mealTime}\nTarget: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, F:${targetFat}g\n\nGenerate 3 varied alternatives.`;
      const jsonSchema = {
        name: "meal_swap_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            alternatives: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  meal_time_pt: { type: "string" },
                  description_pt: { type: "string" },
                  main_ingredients_pt: { type: "string" },
                  recipe_pt: { type: "string" },
                  calories: { type: "integer" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" }
                },
                required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "recipe_pt", "calories", "protein_g", "carbs_g", "fat_g"],
                additionalProperties: false
              }
            }
          },
          required: ["alternatives"],
          additionalProperties: false
        }
      };
      const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      const aiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_schema", json_schema: jsonSchema },
          temperature: 1,
          max_completion_tokens: 6000,
        }),
      });
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Azure OpenAI API error: ${aiResponse.status} - ${errorText}`);
      }
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in response");
      const result = JSON.parse(content);
      return res.json({ success: true, alternatives: result.alternatives });
    }

    // Coaching tips endpoint
    if (method === "GET" && path.match(/^\/api\/coaching\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      let [plan] = await db.select().from(fitnessPlans)
        .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)));
      if (!plan) {
        [plan] = await db.select().from(fitnessPlans)
          .where(eq(fitnessPlans.userId, userId))
          .orderBy(desc(fitnessPlans.createdAt))
          .limit(1);
      }
      if (!plan) {
        return res.status(404).json({ success: false, error: "No plan found" });
      }
      const progressEntries = await db.select().from(exerciseProgress)
        .where(and(eq(exerciseProgress.userId, userId), eq(exerciseProgress.planId, plan.id)));
      const daysCompleted = progressEntries.length;
      const totalDays = plan.durationDays || 30;
      let currentStreak = 0;
      if (progressEntries.length > 0) {
        const sortedDays = Array.from(new Set(progressEntries.map((p: any) => p.day))).sort((a: any, b: any) => a - b);
        currentStreak = 1;
        for (let i = sortedDays.length - 1; i > 0; i--) {
          if (sortedDays[i] - sortedDays[i - 1] === 1) currentStreak++;
          else break;
        }
      }
      const difficultyFeedback = { easy: 0, justRight: 0, hard: 0 };
      progressEntries.forEach((p: any) => {
        if (p.difficulty === "easy") difficultyFeedback.easy++;
        else if (p.difficulty === "just right") difficultyFeedback.justRight++;
        else if (p.difficulty === "hard") difficultyFeedback.hard++;
      });
      const isPt = profile.language === "pt";
      const systemPrompt = isPt
        ? `És um coach de fitness motivacional. Dá 2-3 dicas personalizadas com base no progresso do utilizador. Sê encorajador. Português pt-PT.`
        : `You are a motivational fitness coach. Give 2-3 personalized tips based on user progress. Be encouraging.`;
      const userPrompt = isPt
        ? `Nome: ${profile.firstName}\nProgresso: ${daysCompleted}/${totalDays} dias\nSequência: ${currentStreak} dias\nFeedback: Fácil=${difficultyFeedback.easy}, Ideal=${difficultyFeedback.justRight}, Difícil=${difficultyFeedback.hard}\nObjetivo: ${profile.goal}\n\nGera dicas de coaching.`
        : `Name: ${profile.firstName}\nProgress: ${daysCompleted}/${totalDays} days\nStreak: ${currentStreak} days\nFeedback: Easy=${difficultyFeedback.easy}, Just Right=${difficultyFeedback.justRight}, Hard=${difficultyFeedback.hard}\nGoal: ${profile.goal}\n\nGenerate coaching tips.`;
      const jsonSchema = {
        name: "coaching_tips_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            greeting: { type: "string" },
            tips: { type: "array", items: { type: "string" } },
            motivationalMessage: { type: "string" }
          },
          required: ["greeting", "tips", "motivationalMessage"],
          additionalProperties: false
        }
      };
      const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      const aiResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          response_format: { type: "json_schema", json_schema: jsonSchema },
          temperature: 1,
          max_completion_tokens: 2000,
        }),
      });
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Azure OpenAI API error: ${aiResponse.status} - ${errorText}`);
      }
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content in response");
      const result = JSON.parse(content);
      return res.json({
        success: true,
        ...result,
        daysCompleted,
        totalDays,
        currentStreak
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

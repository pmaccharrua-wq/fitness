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

const db = drizzle(pool);

const AVAILABLE_EQUIPMENT = [
  "Halteres de 2kg", "Haltere de 4kg", "Haltere de 9kg", "Kettlebell de 6kg",
  "Titanium Strength SUPREME Leg Press / Hack Squat", "Adidas Home Gym Multi-ginásio",
  "Passadeira com elevação e velocidade ajustáveis", "Bicicleta", "Máquina de step",
  "Banco Adidas", "Bola de ginástica", "Peso corporal (sem equipamento)"
];

async function generateFitnessPlanFromAI(userProfile: any): Promise<any> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

  console.log("Azure config:", {
    endpointPrefix: endpoint?.substring(0, 30) + "...",
    deployment,
    apiVersion,
    hasApiKey: !!apiKey
  });

  if (!apiKey || !endpoint || !deployment) {
    throw new Error("Azure OpenAI environment variables not configured");
  }

  const bmr = userProfile.sex === "Male"
    ? 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5
    : 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;

  const activityMultipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
  const tdee = Math.round(bmr * (activityMultipliers[userProfile.activityLevel] || 1.2));
  
  let targetCalories = tdee;
  if (userProfile.goal === "loss") targetCalories = Math.round(tdee - 400);
  else if (userProfile.goal === "muscle") targetCalories = Math.round(tdee + 300);

  const waterTarget = Math.round(userProfile.weight * 35);
  const goalPt: Record<string, string> = { loss: "Perda de Peso", muscle: "Ganho de Massa Muscular", gain: "Ganho de Peso", endurance: "Resistência" };

  const systemPrompt = `És um Coach de Fitness e Nutricionista. Gera um plano de fitness personalizado de 15 dias e plano de nutrição de 7 dias em Português. Retorna APENAS JSON válido.`;

  const userPrompt = `Perfil: ${userProfile.sex === "Male" ? "Masculino" : "Feminino"}, ${userProfile.age} anos, ${userProfile.weight}kg, ${userProfile.height}cm
Objetivo: ${goalPt[userProfile.goal] || "Fitness Geral"}
Calorias Diárias: ${targetCalories} kcal
Hidratação: ${waterTarget} ml/dia
Equipamento: ${AVAILABLE_EQUIPMENT.join(", ")}
Impedimentos: ${userProfile.impediments || "Nenhum"}

Gera JSON com estrutura:
{
  "plan_summary_pt": "resumo",
  "fitness_plan_15_days": [{"day":1,"is_rest_day":false,"workout_name_pt":"","duration_minutes":45,"estimated_calories_burnt":300,"focus_pt":"","warmup_pt":"","warmup_exercises":[],"cooldown_pt":"","cooldown_exercises":[],"exercises":[{"name":"","name_pt":"","sequence_order":1,"sets":3,"reps_or_time":"12","equipment_used":""}]}],
  "nutrition_plan_7_days": [{"day":1,"total_daily_calories":${targetCalories},"total_daily_macros":"","meals":[{"meal_time_pt":"","description_pt":"","main_ingredients_pt":"","recipe_pt":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}],
  "hydration_guidelines_pt": {"water_target_ml":${waterTarget},"notification_schedule_pt":"A cada 90 minutos"}
}`;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  console.log("Calling Azure URL:", url);
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_completion_tokens: 16000,
      temperature: 1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error("No content in AI response");

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No valid JSON in AI response");

  return JSON.parse(jsonMatch[0]);
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

    // Onboarding - create user profile and generate AI plan
    if (method === "POST" && path === "/api/onboarding") {
      const profileData = req.body;
      
      // Auto-set fixed gym equipment
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

      console.log("Generating AI plan for user:", userProfile.id);
      
      // Generate AI fitness plan
      const aiPlan = await generateFitnessPlanFromAI(userProfile);
      
      // Store the generated plan
      const [fitnessPlan] = await db.insert(fitnessPlans)
        .values({
          userId: userProfile.id,
          planData: aiPlan,
          currentDay: 1,
          durationDays: 30,
          isActive: true,
        })
        .returning();

      return res.json({
        success: true,
        userId: userProfile.id,
        planId: fitnessPlan.id,
        plan: aiPlan,
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

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

export const exerciseCandidates = pgTable("exercise_candidates", {
  id: serial("id").primaryKey(),
  exerciseId: text("exercise_id").notNull().unique(),
  name: text("name"),
  namePt: text("name_pt"),
  primaryMuscles: text("primary_muscles").array(),
  equipment: text("equipment"),
  difficulty: text("difficulty"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  instructions: text("instructions"),
  instructionsPt: text("instructions_pt"),
  status: text("status").default("pending").notNull(),
  sourceContext: text("source_context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  promotedAt: timestamp("promoted_at"),
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

export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  console.log(`[callAzureOpenAI] Starting request, maxTokens=${maxTokens}, deployment=${deployment}`);
  console.log(`[callAzureOpenAI] System prompt (first 100): ${systemPrompt.substring(0, 100)}`);
  console.log(`[callAzureOpenAI] User prompt length: ${userPrompt.length}`);
  
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
  console.log(`[callAzureOpenAI] Response in ${elapsed}ms, status: ${response.status}`);

  const responseText = await response.text();
  console.log(`[callAzureOpenAI] Raw response length: ${responseText.length}`);

  if (!response.ok) {
    console.error(`[callAzureOpenAI] ERROR response: ${responseText.slice(0, 500)}`);
    throw new Error(`Azure error: ${response.status} - ${responseText.slice(0, 200)}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error(`[callAzureOpenAI] JSON parse failed: ${responseText.slice(0, 500)}`);
    throw new Error("Azure response is not valid JSON");
  }
  
  // Detailed response logging
  const finishReason = data.choices?.[0]?.finish_reason;
  const usage = data.usage;
  console.log(`[callAzureOpenAI] finish_reason=${finishReason}, choices=${data.choices?.length || 0}`);
  console.log(`[callAzureOpenAI] Usage: prompt_tokens=${usage?.prompt_tokens}, completion_tokens=${usage?.completion_tokens}, reasoning_tokens=${usage?.completion_tokens_details?.reasoning_tokens || 0}`);
  
  if (finishReason === "length") {
    console.warn(`[callAzureOpenAI] WARNING: Response TRUNCATED (finish_reason=length)! Need more tokens.`);
  }
  
  if (data.error) {
    console.error(`[callAzureOpenAI] API error in response: ${data.error.message}`);
    throw new Error(`Azure API error: ${data.error.message}`);
  }
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error(`[callAzureOpenAI] No content! Full response: ${JSON.stringify(data).slice(0, 500)}`);
    throw new Error("No content in AI response");
  }
  
  console.log(`[callAzureOpenAI] Content length: ${content.length}, first 100: ${content.substring(0, 100)}`);
  const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error(`[callAzureOpenAI] No JSON found in content: ${content.slice(0, 300)}`);
    throw new Error("No valid JSON in AI response");
  }
  
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[callAzureOpenAI] SUCCESS: Parsed JSON, type=${Array.isArray(parsed) ? 'array' : typeof parsed}`);
    return parsed;
  } catch (parseErr) {
    console.error(`[callAzureOpenAI] JSON parse error: ${parseErr}, Content: ${jsonMatch[0].slice(0, 300)}`);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// Generate plan in 3 smaller chunks (7 workout days + 7 nutrition days)
async function generatePlanChunk(userProfile: any, step: number): Promise<any> {
  console.log(`[generatePlanChunk] Starting step ${step} for user ${userProfile.id}`);
  
  const { targetCalories, waterTarget } = calculateUserMetrics(userProfile);
  console.log(`[generatePlanChunk] Metrics: calories=${targetCalories}, water=${waterTarget}`);
  
  const goalPt: Record<string, string> = { loss: "Perda de Peso", muscle: "Ganho Muscular", gain: "Ganho de Peso", endurance: "Resistência" };
  const profile = `${userProfile.sex === "Male" ? "M" : "F"}, ${userProfile.age}a, ${userProfile.weight}kg, ${userProfile.height}cm. Obj: ${goalPt[userProfile.goal] || "Fitness"}. Cal: ${targetCalories}. Equip: ${AVAILABLE_EQUIPMENT.slice(0,5).join(",")}. Limitações: ${userProfile.impediments || "Nenhuma"}`;
  
  const dayStructure = `[{"day":N,"is_rest_day":false,"workout_name_pt":"","duration_minutes":30,"estimated_calories_burnt":200,"focus_pt":"","warmup_pt":"","warmup_exercises":[{"name_pt":"","duration_seconds":30}],"cooldown_pt":"","cooldown_exercises":[{"name_pt":"","duration_seconds":30}],"exercises":[{"name_pt":"","sequence_order":1,"sets":3,"reps_or_time":"12","equipment_used":""}]}]`;

  try {
    // Step 1: Generate workout days 1-4
    if (step === 1) {
      const prompt = `${profile}\n\nGera dias 1-4 treino. JSON array:\n${dayStructure}`;
      console.log(`[generatePlanChunk] Step 1: Calling Azure for days 1-4`);
      const result = await callAzureOpenAI(`Fitness coach. Dias 1-4. JSON array only.`, prompt, 8000);
      console.log(`[generatePlanChunk] Step 1: Got result, isArray=${Array.isArray(result)}, length=${Array.isArray(result) ? result.length : 'N/A'}`);
      return result;
    }
    // Step 2: Generate workout days 5-7
    else if (step === 2) {
      const prompt = `${profile}\n\nGera dias 5-7 treino. JSON array:\n${dayStructure}`;
      console.log(`[generatePlanChunk] Step 2: Calling Azure for days 5-7`);
      const result = await callAzureOpenAI(`Fitness coach. Dias 5-7. JSON array only.`, prompt, 8000);
      console.log(`[generatePlanChunk] Step 2: Got result, isArray=${Array.isArray(result)}, length=${Array.isArray(result) ? result.length : 'N/A'}`);
      return result;
    }
    // Step 3: Nutrition plan
    else if (step === 3) {
      const nutritionStructure = `{"plan_summary_pt":"","nutrition_plan_7_days":[{"day":1,"total_daily_calories":${targetCalories},"meals":[{"meal_time_pt":"Pequeno Almoço","description_pt":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}],"hydration_guidelines_pt":{"water_target_ml":${waterTarget}}}`;
      const prompt = `${profile}\n\nGera nutrição 7 dias. ${targetCalories} kcal/dia. JSON:\n${nutritionStructure}`;
      console.log(`[generatePlanChunk] Step 3: Calling Azure for nutrition`);
      const result = await callAzureOpenAI("Nutricionista. 7 dias. JSON only.", prompt, 10000);
      console.log(`[generatePlanChunk] Step 3: Got result, hasNutrition=${!!result?.nutrition_plan_7_days}, nutritionDays=${result?.nutrition_plan_7_days?.length || 0}`);
      return result;
    }
    throw new Error("Invalid step");
  } catch (error) {
    console.error(`[generatePlanChunk] ERROR in step ${step}:`, error);
    throw error;
  }
}

// Generate extension chunk for next 7 days (workout + nutrition)
async function generateExtensionChunk(userProfile: any, step: number, startDay: number): Promise<any> {
  const { targetCalories, waterTarget } = calculateUserMetrics(userProfile);
  const goalPt: Record<string, string> = { loss: "Perda de Peso", muscle: "Ganho Muscular", gain: "Ganho de Peso", endurance: "Resistência" };
  const profile = `${userProfile.sex === "Male" ? "M" : "F"}, ${userProfile.age}a, ${userProfile.weight}kg, ${userProfile.height}cm. Obj: ${goalPt[userProfile.goal] || "Fitness"}. Cal: ${targetCalories}. Equip: ${AVAILABLE_EQUIPMENT.slice(0,5).join(",")}. Limitações: ${userProfile.impediments || "Nenhuma"}`;
  
  const dayStructure = `[{"day":N,"is_rest_day":false,"workout_name_pt":"","duration_minutes":30,"estimated_calories_burnt":200,"focus_pt":"","warmup_pt":"","warmup_exercises":[{"name_pt":"","duration_seconds":30}],"cooldown_pt":"","cooldown_exercises":[{"name_pt":"","duration_seconds":30}],"exercises":[{"name_pt":"","sequence_order":1,"sets":3,"reps_or_time":"12","equipment_used":""}]}]`;

  const endDay = startDay + 6;
  
  // Step 1: Generate workout days (first 4)
  if (step === 1) {
    const midDay = startDay + 3;
    const prompt = `${profile}\n\nGera dias ${startDay}-${midDay} treino (continuação do plano). JSON array:\n${dayStructure}`;
    return await callAzureOpenAI(`Fitness coach. Dias ${startDay}-${midDay}. JSON array only.`, prompt, 8000);
  }
  // Step 2: Generate remaining workout days (3 days)
  else if (step === 2) {
    const fromDay = startDay + 4;
    const prompt = `${profile}\n\nGera dias ${fromDay}-${endDay} treino (continuação do plano). JSON array:\n${dayStructure}`;
    return await callAzureOpenAI(`Fitness coach. Dias ${fromDay}-${endDay}. JSON array only.`, prompt, 8000);
  }
  // Step 3: Nutrition plan for next 7 days
  else if (step === 3) {
    const nutritionStructure = `{"nutrition_plan_7_days":[{"day":${startDay},"total_daily_calories":${targetCalories},"meals":[{"meal_time_pt":"Pequeno Almoço","description_pt":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]}]}`;
    const prompt = `${profile}\n\nGera nutrição para dias ${startDay}-${endDay}. ${targetCalories} kcal/dia. JSON:\n${nutritionStructure}`;
    return await callAzureOpenAI("Nutricionista. 7 dias. JSON only.", prompt, 10000);
  }
  throw new Error("Invalid extension step");
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
      
      // Create generation status tracker (3 steps: 2 workout chunks + 1 nutrition = 7 days each)
      const [status] = await db.insert(planGenerationStatus)
        .values({
          userId: userProfile.id,
          status: "generating",
          currentStep: 0,
          totalSteps: 3,
          partialData: { fitness_plan_7_days: [], nutrition_plan_7_days: [], plan_summary_pt: "", hydration_guidelines_pt: null }
        } as any)
        .returning();

      return res.json({
        success: true,
        userId: userProfile.id,
        statusId: status.id,
        status: "generating",
        currentStep: 0,
        totalSteps: 3,
        message: "Profile created. Call /api/generate-chunk to continue."
      });
    }

    // Generate next chunk of the plan (3 steps: days 1-4, days 5-7, nutrition)
    if (method === "POST" && path === "/api/generate-chunk") {
      const { userId, statusId } = req.body;
      
      console.log(`[generate-chunk] Request received: userId=${userId}, statusId=${statusId}`);
      
      const [status] = await db.select().from(planGenerationStatus).where(eq(planGenerationStatus.id, statusId));
      if (!status) {
        console.log(`[generate-chunk] Status ${statusId} not found`);
        return res.status(404).json({ success: false, error: "Status not found" });
      }
      if (status.status === "completed") {
        console.log(`[generate-chunk] Status ${statusId} already completed, planId=${status.planId}`);
        return res.json({ success: true, status: "completed", planId: status.planId });
      }
      if (status.status === "error") {
        console.log(`[generate-chunk] Status ${statusId} has error: ${status.error}`);
        return res.status(500).json({ success: false, error: status.error });
      }

      const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!userProfile) {
        console.log(`[generate-chunk] User ${userId} not found`);
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const nextStep = status.currentStep + 1;
      console.log(`[generate-chunk] Generating chunk ${nextStep}/3 for user ${userId}, statusId=${statusId}`);

      try {
        console.log(`[generate-chunk] Calling generatePlanChunk for step ${nextStep}`);
        const chunkData = await generatePlanChunk(userProfile, nextStep);
        console.log(`[generate-chunk] Chunk data received, type: ${Array.isArray(chunkData) ? "array" : typeof chunkData}, length: ${Array.isArray(chunkData) ? chunkData.length : 'N/A'}`);
        const partial = (status.partialData || {}) as any;

        // Steps 1-2: Workout days (4 + 3 days = 7 total)
        if (nextStep <= 2) {
          const days = Array.isArray(chunkData) ? chunkData : [];
          partial.fitness_plan_7_days = [...(partial.fitness_plan_7_days || []), ...days];
          console.log(`[generate-chunk] Added ${days.length} workout days, total now: ${partial.fitness_plan_7_days.length}`);
        } 
        // Step 3: Nutrition plan
        else {
          partial.plan_summary_pt = chunkData.plan_summary_pt || "";
          partial.nutrition_plan_7_days = chunkData.nutrition_plan_7_days || [];
          partial.hydration_guidelines_pt = chunkData.hydration_guidelines_pt || null;
          console.log(`[generate-chunk] Added nutrition plan, ${partial.nutrition_plan_7_days.length} days`);
        }

        if (nextStep >= 3) {
          // All chunks done - save final plan with 7 days initially
          console.log(`[generate-chunk] Step 3 complete - saving final plan to DB for user ${userId}`);
          
          try {
            const [fitnessPlan] = await db.insert(fitnessPlans)
              .values({
                userId: userProfile.id,
                planData: partial,
                currentDay: 1,
                durationDays: 7,
                generatedWorkoutDays: 7,
                generatedNutritionDays: 7,
                generationStatus: "idle",
                isActive: true,
              } as any)
              .returning();
            
            console.log(`[generate-chunk] SUCCESS - Created fitness plan ${fitnessPlan.id} for user ${userId}`);

            await db.update(planGenerationStatus)
              .set({ status: "completed", currentStep: 3, partialData: partial, planId: fitnessPlan.id, updatedAt: new Date() } as any)
              .where(eq(planGenerationStatus.id, statusId));
            
            console.log(`[generate-chunk] Updated generation status ${statusId} to completed with planId=${fitnessPlan.id}`);

            return res.json({ success: true, status: "completed", planId: fitnessPlan.id, plan: partial });
          } catch (dbError) {
            console.error(`[generate-chunk] DB ERROR saving plan for user ${userId}:`, dbError);
            throw dbError;
          }
        } else {
          await db.update(planGenerationStatus)
            .set({ currentStep: nextStep, partialData: partial, updatedAt: new Date() } as any)
            .where(eq(planGenerationStatus.id, statusId));
          
          console.log(`[generate-chunk] Updated status ${statusId} to step ${nextStep}/3`);

          return res.json({ success: true, status: "generating", currentStep: nextStep, totalSteps: 3 });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Generation failed";
        console.error(`[generate-chunk] ERROR for user ${userId}, step ${nextStep}:`, error);
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

    // Start extending the plan by 7 more days
    if (method === "POST" && path.match(/^\/api\/plans\/\d+\/extend$/)) {
      const planId = parseInt(path.split("/")[3]);
      
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });
      
      // Check if extension is already in progress
      if (plan.generationStatus === "extending") {
        return res.json({ success: true, status: "extending", message: "Extension already in progress" });
      }
      
      // Compute startDay from actual data, not just the counter (handles legacy plans)
      const planData = (plan.planData || {}) as any;
      const workoutDays = planData.fitness_plan_7_days || planData.fitness_plan_15_days || [];
      const actualWorkoutDays = Array.isArray(workoutDays) ? workoutDays.length : 0;
      const startDay = actualWorkoutDays + 1;
      
      // Check if already at max
      if (actualWorkoutDays >= 30) {
        return res.status(400).json({ success: false, error: "Plan already has maximum 30 days" });
      }
      
      // Mark plan as extending with updated timestamp
      await db.update(fitnessPlans)
        .set({ 
          generationStatus: "extending",
          updatedAt: new Date()
        } as any)
        .where(eq(fitnessPlans.id, planId));
      
      return res.json({
        success: true,
        status: "extending",
        planId,
        startDay,
        message: "Extension started. Call /api/plans/:id/extend-chunk to continue."
      });
    }

    // Generate next chunk of the extension
    if (method === "POST" && path.match(/^\/api\/plans\/\d+\/extend-chunk$/)) {
      const planId = parseInt(path.split("/")[3]);
      const { step = 1 } = req.body;
      
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });
      
      const [userProfile] = await db.select().from(userProfiles).where(eq(userProfiles.id, plan.userId));
      if (!userProfile) return res.status(404).json({ success: false, error: "User not found" });
      
      const planData = (plan.planData || {}) as any;
      
      // Detect which key format is used (legacy vs new) and normalize to new format
      const legacyKey = 'fitness_plan_15_days';
      const newKey = 'fitness_plan_7_days';
      const usesLegacyKey = planData[legacyKey] && !planData[newKey];
      
      // Get existing workout days from whichever key exists
      let workoutDays = planData[newKey] || planData[legacyKey] || [];
      if (!Array.isArray(workoutDays)) workoutDays = [];
      
      // Compute startDay from actual data length
      const startDay = workoutDays.length + 1;
      
      const nutritionDays = planData.nutrition_plan_7_days || [];
      
      try {
        console.log(`Generating extension chunk ${step}/3 for plan ${planId}, starting day ${startDay}, current days: ${workoutDays.length}`);
        const chunkData = await generateExtensionChunk(userProfile, step, startDay);
        console.log("Extension chunk data received, type:", Array.isArray(chunkData) ? "array" : typeof chunkData);
        
        // Steps 1-2: Add new workout days
        if (step <= 2) {
          const newDays = Array.isArray(chunkData) ? chunkData : [];
          const updatedWorkoutDays = [...workoutDays, ...newDays];
          
          // Always use the new key format and remove legacy key if present
          planData[newKey] = updatedWorkoutDays;
          if (usesLegacyKey) {
            delete planData[legacyKey];
          }
          
          await db.update(fitnessPlans)
            .set({ 
              planData,
              updatedAt: new Date()
            } as any)
            .where(eq(fitnessPlans.id, planId));
          
          return res.json({ success: true, status: "extending", step, totalSteps: 3 });
        }
        // Step 3: Add nutrition days and finalize
        else {
          const newNutritionDays = chunkData.nutrition_plan_7_days || [];
          planData.nutrition_plan_7_days = [...nutritionDays, ...newNutritionDays];
          
          // Compute counters from actual data
          const finalWorkoutDays = planData[newKey] || [];
          const finalNutritionDays = planData.nutrition_plan_7_days || [];
          const newGeneratedWorkoutDays = Array.isArray(finalWorkoutDays) ? finalWorkoutDays.length : 7;
          const newGeneratedNutritionDays = Array.isArray(finalNutritionDays) ? finalNutritionDays.length : 7;
          const newDurationDays = Math.max(newGeneratedWorkoutDays, plan.durationDays || 30);
          
          await db.update(fitnessPlans)
            .set({
              planData,
              durationDays: newDurationDays,
              generatedWorkoutDays: newGeneratedWorkoutDays,
              generatedNutritionDays: newGeneratedNutritionDays,
              generationStatus: "idle",
              updatedAt: new Date()
            } as any)
            .where(eq(fitnessPlans.id, planId));
          
          return res.json({
            success: true,
            status: "completed",
            generatedWorkoutDays: newGeneratedWorkoutDays,
            generatedNutritionDays: newGeneratedNutritionDays,
            durationDays: newDurationDays
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Extension failed";
        console.error("Extension error:", error);
        await db.update(fitnessPlans)
          .set({ 
            generationStatus: "error",
            updatedAt: new Date()
          } as any)
          .where(eq(fitnessPlans.id, planId));
        return res.status(500).json({ success: false, error: errorMsg });
      }
    }

    // Check plan extension status
    if (method === "GET" && path.match(/^\/api\/plans\/\d+\/status$/)) {
      const planId = parseInt(path.split("/")[3]);
      const [plan] = await db.select().from(fitnessPlans).where(eq(fitnessPlans.id, planId));
      if (!plan) return res.status(404).json({ success: false, error: "Plan not found" });
      
      return res.json({
        success: true,
        generationStatus: plan.generationStatus || "idle",
        generatedWorkoutDays: plan.generatedWorkoutDays || plan.durationDays || 7,
        generatedNutritionDays: plan.generatedNutritionDays || 7,
        durationDays: plan.durationDays || 7
      });
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
      
      // Compute actual generated days from plan data for accuracy (handles legacy plans)
      const planData = (plan.planData || {}) as any;
      const workoutDays = planData.fitness_plan_7_days || planData.fitness_plan_15_days || [];
      const nutritionDays = planData.nutrition_plan_7_days || [];
      const actualWorkoutDays = Array.isArray(workoutDays) ? workoutDays.length : (plan.generatedWorkoutDays || 7);
      const actualNutritionDays = Array.isArray(nutritionDays) ? nutritionDays.length : (plan.generatedNutritionDays || 7);
      
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
        generatedWorkoutDays: actualWorkoutDays,
        generatedNutritionDays: actualNutritionDays,
        generationStatus: plan.generationStatus || "idle",
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

    // Activate a plan
    if (method === "PATCH" && path.match(/^\/api\/plan\/\d+\/activate$/)) {
      const planId = parseInt(path.split("/")[3]);
      const { userId } = req.body;
      if (isNaN(planId) || !userId) {
        return res.status(400).json({ success: false, error: "Invalid plan or user ID" });
      }
      // Deactivate all other plans for this user
      await db.update(fitnessPlans)
        .set({ isActive: false } as any)
        .where(eq(fitnessPlans.userId, userId));
      // Activate the requested plan
      await db.update(fitnessPlans)
        .set({ isActive: true } as any)
        .where(eq(fitnessPlans.id, planId));
      return res.json({ success: true });
    }

    // Delete a plan
    if (method === "DELETE" && path.match(/^\/api\/plan\/\d+$/) && !path.includes("/day")) {
      const planId = parseInt(path.split("/").pop() || "");
      if (isNaN(planId)) {
        return res.status(400).json({ success: false, error: "Invalid plan ID" });
      }
      await db.delete(fitnessPlans).where(eq(fitnessPlans.id, planId));
      return res.json({ success: true });
    }

    // Delete user and all data
    if (method === "DELETE" && path.match(/^\/api\/users\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
      }
      // Verify user exists
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!profile) {
        return res.status(404).json({ success: false, error: "User not found" });
      }
      // Delete all related data in order
      await db.delete(coachMessages).where(eq(coachMessages.userId, userId));
      await db.delete(customMeals).where(eq(customMeals.userId, userId));
      await db.delete(exerciseProgress).where(eq(exerciseProgress.userId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(fitnessPlans).where(eq(fitnessPlans.userId, userId));
      await db.delete(userProfiles).where(eq(userProfiles.id, userId));
      return res.json({ success: true, message: "Account deleted successfully" });
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
      // Support both new format (exercises array with name/exerciseId objects) and legacy format (exerciseNames array)
      const { exercises, exerciseNames } = req.body;
      const exerciseInputs: { name?: string; exerciseId?: string }[] = exercises || 
        (exerciseNames ? exerciseNames.map((n: string) => ({ name: n })) : null);
      
      if (!exerciseInputs || !Array.isArray(exerciseInputs)) {
        return res.status(400).json({ success: false, error: "exercises or exerciseNames array required" });
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
        // Warmup exercises
        "marcha no lugar": "high_knees", "marcha no lugar com elevação de joelhos": "high_knees",
        "rotações de braços": "arm_circles", "rotação de braços": "arm_circles", "arm circles": "arm_circles",
        "rotações de anca": "hip_circles", "rotação de anca": "hip_circles", "hip circles": "hip_circles",
        "agachamentos leves": "squat_bodyweight",
        // Cooldown/Stretching exercises  
        "alongamento de quadríceps": "quad_stretch", "alongamento quadríceps": "quad_stretch",
        "alongamento de isquiotibiais": "hamstring_stretch",
        "alongamento de peito": "chest_stretch",
        "alongamento de costas": "back_stretch", "alongamento costas": "back_stretch",
        "respiração profunda": "deep_breathing",
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
        
        // Step 5: Word-based fuzzy matching - STRICT (only exact word matches, requires 3+ words)
        const inputWords = normalized.split(/[\s\-_]+/).filter(w => w.length > 3);
        if (inputWords.length >= 3) {
          for (const ex of exercises) {
            const exWords = [...ex.name.toLowerCase().split(/[\s\-_]+/), ...ex.namePt.toLowerCase().split(/[\s\-_]+/)];
            // Only count EXACT word matches, not partial contains
            const matchingWords = inputWords.filter(w => exWords.some(ew => ew === w));
            // Require at least 3 exact matching words to avoid false positives
            if (matchingWords.length >= 3) {
              console.log(`[match] Fuzzy: "${name}" -> ${ex.name} (${matchingWords.length} exact words)`);
              return ex;
            }
          }
        }
        
        console.log(`[match] UNMATCHED: "${name}" - no match found (will be skipped)`);
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
      
      // Also create a map keyed by exerciseId for reliable lookups
      const byId: Record<string, any> = {};
      
      for (const input of exerciseInputs) {
        const name = input.name || "";
        const requestedId = input.exerciseId;
        
        // Priority 1: Direct ID lookup if exerciseId is provided
        let match = null;
        if (requestedId) {
          match = allExercises.find(ex => ex.id === requestedId);
          if (match) {
            console.log(`[match] Direct ID: exerciseId "${requestedId}" -> ${match.name}`);
          }
        }
        
        // Priority 2: Name-based lookup if no ID or ID not found
        if (!match && name) {
          match = findSynonymMatch(name, allExercises);
        }
        
        if (match) {
          // Always fetch Pexels image as primary source (InspireUSA URLs are returning 404)
          let pexelsImage: { url: string; source: string; photographer?: string } | null = null;
          try {
            pexelsImage = await getPexelsImage(match.name, match.primaryMuscles || []);
          } catch (e) {
            console.log("Pexels error for", name || requestedId, e);
          }
          // Include original input name for reference
          const matchData = { ...match, imageUrl: null, pexelsImage, inputName: name, inputExerciseId: requestedId };
          // Key by input name (backward compat)
          if (name) {
            matched[name] = matchData;
          }
          // Also key by exerciseId (new reliable method)
          byId[match.id] = matchData;
          matchDetails.push({
            name: name || match.name,
            matchedTo: match.name,
            exerciseId: match.id,
            hasVideo: !!match.videoUrl,
            hasImage: !!(pexelsImage?.url),
            hasInstructions: !!(match.instructions || match.instructionsPt)
          });
        } else if (name) {
          unmatched.push({ name, exerciseId: requestedId });
        } else if (requestedId) {
          unmatched.push({ name: null, exerciseId: requestedId });
        }
      }
      
      // Log summary for debugging
      if (unmatched.length > 0) {
        console.log(`[exercises/match] UNMATCHED exercises (${unmatched.length}):`, unmatched.map(u => u.name || u.exerciseId));
        
        // Stage unmatched exercises as candidates for enrichment
        for (const unmatchedItem of unmatched) {
          const unmatchedName = unmatchedItem.name;
          const unmatchedId = unmatchedItem.exerciseId;
          
          // Generate a canonical ID slug - prefer provided ID, otherwise derive from name
          let exerciseIdSlug = unmatchedId;
          if (!exerciseIdSlug && unmatchedName) {
            exerciseIdSlug = unmatchedName
              .toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_|_$/g, "");
          }
          
          if (!exerciseIdSlug) continue; // Skip if we can't generate an ID
          
          try {
            // Check if already exists in candidates
            const [existing] = await db.select().from(exerciseCandidates)
              .where(eq(exerciseCandidates.exerciseId, exerciseIdSlug));
            
            if (!existing) {
              await db.insert(exerciseCandidates).values({
                exerciseId: exerciseIdSlug,
                namePt: unmatchedName || null,
                status: "pending",
                sourceContext: `Detected from plan matching at ${new Date().toISOString()}. Original: name="${unmatchedName}", id="${unmatchedId}"`
              });
              console.log(`[exercises/match] Staged new candidate: ${exerciseIdSlug} (from name="${unmatchedName}", id="${unmatchedId}")`);
            }
          } catch (e) {
            console.log(`[exercises/match] Could not stage candidate ${exerciseIdSlug}:`, e);
          }
        }
      }
      
      const missingData = matchDetails.filter(m => !m.hasVideo || !m.hasImage || !m.hasInstructions);
      if (missingData.length > 0) {
        console.log(`[exercises/match] Matched but MISSING data:`, missingData.map(m => ({
          name: m.name,
          matchedTo: m.matchedTo,
          exerciseId: m.exerciseId,
          missing: [
            !m.hasVideo ? 'video' : null,
            !m.hasImage ? 'image' : null,
            !m.hasInstructions ? 'instructions' : null
          ].filter(Boolean)
        })));
      }
      
      // Return both maps: byName for backward compat, byId for new reliable lookups
      return res.json({ success: true, exercises: matched, exercisesById: byId, matchDetails });
    }

    // Enrich pending exercise candidates with AI descriptions, images, and videos
    // Protected endpoint - requires admin key or internal call
    if (method === "POST" && path === "/api/exercises/enrich") {
      const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
      const expectedKey = process.env.ADMIN_API_KEY || "fitness-admin-2024";
      if (adminKey !== expectedKey) {
        return res.status(401).json({ success: false, error: "Unauthorized - admin key required" });
      }
      
      const pendingCandidates = await db.select().from(exerciseCandidates)
        .where(eq(exerciseCandidates.status, "pending"));
      
      if (pendingCandidates.length === 0) {
        return res.json({ success: true, message: "No pending candidates to enrich", enriched: 0 });
      }
      
      const pexelsApiKey = process.env.PEXELS_API_KEY;
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
      const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5";
      
      const enrichedIds: string[] = [];
      
      for (const candidate of pendingCandidates.slice(0, 5)) { // Process max 5 at a time
        try {
          const exerciseName = candidate.namePt || candidate.name || candidate.exerciseId;
          
          // 1. Generate AI descriptions (EN/PT)
          let instructions = candidate.instructions;
          let instructionsPt = candidate.instructionsPt;
          let name = candidate.name;
          let primaryMuscles = candidate.primaryMuscles;
          let equipment = candidate.equipment;
          let difficulty = candidate.difficulty;
          
          if (azureEndpoint && azureApiKey && (!instructions || !instructionsPt)) {
            try {
              const aiResponse = await fetch(
                `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2025-01-01-preview`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "api-key": azureApiKey
                  },
                  body: JSON.stringify({
                    messages: [
                      {
                        role: "system",
                        content: "You are a fitness expert. Provide exercise information in JSON format."
                      },
                      {
                        role: "user",
                        content: `Provide information about the exercise "${exerciseName}". Return JSON with:
{
  "name_en": "English name",
  "name_pt": "Portuguese name", 
  "instructions_en": "Step by step instructions in English (2-3 sentences)",
  "instructions_pt": "Instruções passo a passo em Português (2-3 frases)",
  "primary_muscles": ["muscle1", "muscle2"],
  "equipment": "bodyweight/dumbbell/barbell/etc",
  "difficulty": "beginner/intermediate/advanced"
}`
                      }
                    ],
                    max_completion_tokens: 600,
                    temperature: 1
                  })
                }
              );
              
              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const content = aiData.choices?.[0]?.message?.content || "";
                try {
                  const jsonMatch = content.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    name = parsed.name_en || name;
                    instructions = parsed.instructions_en || instructions;
                    instructionsPt = parsed.instructions_pt || instructionsPt;
                    primaryMuscles = parsed.primary_muscles || primaryMuscles;
                    equipment = parsed.equipment || equipment;
                    difficulty = parsed.difficulty || difficulty;
                  }
                } catch (parseErr) {
                  console.log(`[enrich] Could not parse AI response for ${exerciseName}`);
                }
              }
            } catch (aiErr) {
              console.log(`[enrich] AI error for ${exerciseName}:`, aiErr);
            }
          }
          
          // 2. Fetch Pexels image
          let imageUrl = candidate.imageUrl;
          if (!imageUrl && pexelsApiKey) {
            try {
              const searchTerm = `fitness ${name || exerciseName} exercise`;
              const pexelsResponse = await fetch(
                `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=landscape`,
                { headers: { Authorization: pexelsApiKey } }
              );
              if (pexelsResponse.ok) {
                const pexelsData = await pexelsResponse.json();
                if (pexelsData.photos?.[0]) {
                  imageUrl = pexelsData.photos[0].src.medium;
                }
              }
            } catch (pexErr) {
              console.log(`[enrich] Pexels error for ${exerciseName}:`, pexErr);
            }
          }
          
          // 3. Search for YouTube video (using simple search URL)
          let videoUrl = candidate.videoUrl;
          if (!videoUrl) {
            // Generate a YouTube search URL that users can follow
            const searchQuery = encodeURIComponent(`${name || exerciseName} exercise tutorial how to`);
            videoUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
          }
          
          // Update the candidate
          await db.update(exerciseCandidates)
            .set({
              name: name || null,
              namePt: candidate.namePt || (name ? name : null),
              instructions: instructions || null,
              instructionsPt: instructionsPt || null,
              primaryMuscles: primaryMuscles || null,
              equipment: equipment || null,
              difficulty: difficulty || null,
              imageUrl: imageUrl || null,
              videoUrl: videoUrl || null,
              status: (instructions && instructionsPt && imageUrl) ? "enriched" : "pending"
            } as any)
            .where(eq(exerciseCandidates.id, candidate.id));
          
          if (instructions && instructionsPt && imageUrl) {
            enrichedIds.push(candidate.exerciseId);
            console.log(`[enrich] Successfully enriched: ${candidate.exerciseId}`);
          }
        } catch (err) {
          console.log(`[enrich] Error enriching ${candidate.exerciseId}:`, err);
        }
      }
      
      return res.json({ 
        success: true, 
        enriched: enrichedIds.length,
        enrichedIds,
        pending: pendingCandidates.length - enrichedIds.length
      });
    }

    // Auto-promote enriched candidates to exercise_library
    // Protected endpoint - requires admin key or internal call
    if (method === "POST" && path === "/api/exercises/promote") {
      const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
      const expectedKey = process.env.ADMIN_API_KEY || "fitness-admin-2024";
      if (adminKey !== expectedKey) {
        return res.status(401).json({ success: false, error: "Unauthorized - admin key required" });
      }
      
      const enrichedCandidates = await db.select().from(exerciseCandidates)
        .where(eq(exerciseCandidates.status, "enriched"));
      
      if (enrichedCandidates.length === 0) {
        return res.json({ success: true, message: "No enriched candidates to promote", promoted: 0 });
      }
      
      const promotedIds: string[] = [];
      
      for (const candidate of enrichedCandidates) {
        // Check if already exists in exercise_library
        const [existing] = await db.select().from(exerciseLibrary)
          .where(eq(exerciseLibrary.id, candidate.exerciseId));
        
        if (existing) {
          // Mark as already promoted
          await db.update(exerciseCandidates)
            .set({ status: "promoted", promotedAt: new Date() } as any)
            .where(eq(exerciseCandidates.id, candidate.id));
          continue;
        }
        
        // Validate required fields
        if (!candidate.name || !candidate.namePt || !candidate.primaryMuscles || !candidate.equipment || !candidate.difficulty) {
          console.log(`[promote] Candidate ${candidate.exerciseId} missing required fields, skipping`);
          continue;
        }
        
        try {
          // Insert into exercise_library
          await db.insert(exerciseLibrary).values({
            id: candidate.exerciseId,
            name: candidate.name,
            namePt: candidate.namePt,
            primaryMuscles: candidate.primaryMuscles,
            secondaryMuscles: [],
            equipment: candidate.equipment,
            difficulty: candidate.difficulty,
            imageUrl: candidate.imageUrl,
            videoUrl: candidate.videoUrl,
            instructions: candidate.instructions,
            instructionsPt: candidate.instructionsPt
          });
          
          // Mark candidate as promoted
          await db.update(exerciseCandidates)
            .set({ status: "promoted", promotedAt: new Date() } as any)
            .where(eq(exerciseCandidates.id, candidate.id));
          
          promotedIds.push(candidate.exerciseId);
          console.log(`[promote] Successfully promoted: ${candidate.exerciseId}`);
        } catch (err) {
          console.log(`[promote] Error promoting ${candidate.exerciseId}:`, err);
        }
      }
      
      return res.json({ 
        success: true, 
        promoted: promotedIds.length,
        promotedIds
      });
    }

    // Get exercise candidates (for admin view)
    if (method === "GET" && path === "/api/exercises/candidates") {
      const candidates = await db.select().from(exerciseCandidates)
        .orderBy(desc(exerciseCandidates.createdAt));
      return res.json({ success: true, candidates });
    }

    // Enrich a single exercise on-demand (user-facing)
    // Takes exercise name/id and generates description, image, video
    if (method === "POST" && path === "/api/exercises/enrich-single") {
      console.log(`[enrich-single] Request received, body:`, JSON.stringify(req.body));
      const { exerciseName, exerciseNamePt, exerciseId } = req.body;
      
      if (!exerciseName && !exerciseNamePt && !exerciseId) {
        console.log(`[enrich-single] Missing required fields`);
        return res.status(400).json({ success: false, error: "exerciseName, exerciseNamePt, or exerciseId required" });
      }
      
      const searchName = exerciseName || exerciseNamePt || exerciseId;
      const generatedId = exerciseId || searchName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      
      console.log(`[enrich-single] Enriching exercise: ${searchName} (id: ${generatedId})`);
      
      const pexelsApiKey = process.env.PEXELS_API_KEY;
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
      const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5";
      
      let result: any = {
        id: generatedId,
        name: exerciseName || exerciseNamePt || searchName,
        namePt: exerciseNamePt || exerciseName || searchName,
        instructions: null,
        instructionsPt: null,
        primaryMuscles: [],
        secondaryMuscles: [],
        equipment: "bodyweight",
        difficulty: "beginner",
        imageUrl: null,
        videoUrl: null
      };
      
      // 1. Generate AI descriptions (EN/PT)
      if (azureEndpoint && azureApiKey) {
        try {
          const aiResponse = await fetch(
            `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2025-01-01-preview`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": azureApiKey
              },
              body: JSON.stringify({
                messages: [
                  {
                    role: "system",
                    content: "You are a fitness expert. Provide exercise information in JSON format only, no other text."
                  },
                  {
                    role: "user",
                    content: `Provide complete information about the exercise "${searchName}". Return ONLY valid JSON:
{
  "name_en": "English name of the exercise",
  "name_pt": "Nome do exercício em Português",
  "instructions_en": "Clear step-by-step instructions in English (2-3 sentences)",
  "instructions_pt": "Instruções claras passo a passo em Português (2-3 frases)",
  "primary_muscles": ["muscle1", "muscle2"],
  "secondary_muscles": ["muscle1"],
  "equipment": "bodyweight/dumbbell/barbell/kettlebell/machine/cable/bench/stability ball",
  "difficulty": "beginner/intermediate/advanced"
}`
                  }
                ],
                max_completion_tokens: 6000,
                temperature: 1
              })
            }
          );
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const finishReason = aiData.choices?.[0]?.finish_reason;
            const usage = aiData.usage;
            const content = aiData.choices?.[0]?.message?.content || "";
            
            const debugInfo = {
              finishReason,
              reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens,
              completionTokens: usage?.completion_tokens,
              contentLength: content.length,
              contentPreview: content.substring(0, 100)
            };
            console.log(`[enrich-single] Azure response for ${searchName}:`, debugInfo);
            result._debug = debugInfo;
            
            if (finishReason === "length") {
              console.log(`[enrich-single] WARNING: Response truncated (finish_reason=length) for ${searchName}`);
            }
            
            if (!content || content.trim() === "") {
              console.log(`[enrich-single] WARNING: Empty content from Azure for ${searchName}, full response:`, JSON.stringify(aiData, null, 2));
            }
            
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                result.name = parsed.name_en || result.name || searchName;
                result.namePt = parsed.name_pt || result.namePt || searchName;
                result.instructions = parsed.instructions_en || null;
                result.instructionsPt = parsed.instructions_pt || null;
                result.primaryMuscles = parsed.primary_muscles || [];
                result.secondaryMuscles = parsed.secondary_muscles || [];
                result.equipment = parsed.equipment || "bodyweight";
                result.difficulty = parsed.difficulty || "intermediate";
                console.log(`[enrich-single] AI generated data for: ${searchName}, instructions: ${result.instructions ? 'YES' : 'NO'}`);
              } else {
                console.log(`[enrich-single] No JSON found in content for ${searchName}:`, content);
              }
            } catch (parseErr) {
              console.log(`[enrich-single] Could not parse AI response for ${searchName}:`, parseErr, content);
            }
          } else {
            console.log(`[enrich-single] AI response not OK:`, await aiResponse.text());
          }
        } catch (aiErr) {
          console.log(`[enrich-single] AI error for ${searchName}:`, aiErr);
        }
      } else {
        console.log(`[enrich-single] Azure OpenAI not configured, skipping AI enrichment`);
      }
      
      // 2. Fetch Pexels image
      if (pexelsApiKey) {
        try {
          const searchTerm = `fitness ${result.name || searchName} exercise workout`;
          const pexelsResponse = await fetch(
            `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=3&orientation=landscape`,
            { headers: { Authorization: pexelsApiKey } }
          );
          if (pexelsResponse.ok) {
            const pexelsData = await pexelsResponse.json();
            if (pexelsData.photos?.[0]) {
              result.imageUrl = pexelsData.photos[0].src.large;
              result.pexelsImage = {
                url: pexelsData.photos[0].src.large,
                source: pexelsData.photos[0].url,
                photographer: pexelsData.photos[0].photographer
              };
              console.log(`[enrich-single] Found Pexels image for: ${searchName}`);
            }
          }
        } catch (pexErr) {
          console.log(`[enrich-single] Pexels error for ${searchName}:`, pexErr);
        }
      } else {
        console.log(`[enrich-single] PEXELS_API_KEY not configured, skipping image fetch`);
      }
      
      // 3. Generate YouTube search URL
      const youtubeSearchName = result.name || searchName;
      const searchQuery = encodeURIComponent(`${youtubeSearchName} exercise tutorial how to proper form`);
      result.videoUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
      
      // 4. Save to exercise_library if we have enough data
      if (result.name && result.instructions && result.primaryMuscles?.length > 0) {
        try {
          // Check if already exists
          const [existing] = await db.select().from(exerciseLibrary)
            .where(eq(exerciseLibrary.id, generatedId));
          
          if (!existing) {
            await db.insert(exerciseLibrary).values({
              id: generatedId,
              name: result.name,
              namePt: result.namePt || result.name,
              primaryMuscles: result.primaryMuscles,
              secondaryMuscles: result.secondaryMuscles || [],
              equipment: result.equipment,
              difficulty: result.difficulty,
              imageUrl: result.imageUrl,
              videoUrl: result.videoUrl,
              instructions: result.instructions,
              instructionsPt: result.instructionsPt
            });
            result.savedToLibrary = true;
            console.log(`[enrich-single] Saved to exercise_library: ${generatedId}`);
          } else {
            // Update existing entry with new data
            await db.update(exerciseLibrary)
              .set({
                imageUrl: result.imageUrl || existing.imageUrl,
                videoUrl: result.videoUrl || existing.videoUrl,
                instructions: result.instructions || existing.instructions,
                instructionsPt: result.instructionsPt || existing.instructionsPt
              })
              .where(eq(exerciseLibrary.id, generatedId));
            result.savedToLibrary = true;
            result.updated = true;
            console.log(`[enrich-single] Updated exercise_library: ${generatedId}`);
          }
        } catch (dbErr) {
          console.log(`[enrich-single] DB error saving ${generatedId}:`, dbErr);
          result.savedToLibrary = false;
        }
      }
      
      console.log(`[enrich-single] Returning response for: ${generatedId}, success: true`);
      return res.json({ success: true, exercise: result, _debug: result._debug });
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
      const progressPercentage = Math.min(100, Math.round((daysCompleted / totalDays) * 100));
      let currentStreak = 0;
      if (progressEntries.length > 0) {
        const sortedDays = Array.from(new Set(progressEntries.map((p: any) => p.day))).sort((a: any, b: any) => a - b);
        currentStreak = 1;
        for (let i = sortedDays.length - 1; i > 0; i--) {
          if (sortedDays[i] - sortedDays[i - 1] === 1) currentStreak++;
          else break;
        }
      }
      const isPt = profile.language === "pt";
      
      // Generate fallback coaching tips (faster, no AI call needed for simple messages)
      let motivationalMessage = "";
      let coachingTip = "";
      let streakMessage: string | null = null;

      if (daysCompleted === 0) {
        motivationalMessage = isPt 
          ? `${profile.firstName}, hoje é o dia perfeito para começar a tua transformação!`
          : `${profile.firstName}, today is the perfect day to start your transformation!`;
        coachingTip = isPt
          ? "Começa devagar e foca na consistência, não na intensidade."
          : "Start slow and focus on consistency, not intensity.";
      } else if (progressPercentage >= 80) {
        motivationalMessage = isPt
          ? `${profile.firstName}, estás quase a terminar! A disciplina vence o talento.`
          : `${profile.firstName}, you're almost there! Discipline beats talent.`;
        coachingTip = isPt
          ? "Mantém o foco nestas últimas semanas para terminar forte!"
          : "Stay focused these last weeks to finish strong!";
      } else if (progressPercentage >= 50) {
        motivationalMessage = isPt
          ? `${profile.firstName}, ultrapassaste a metade do caminho! Continua assim!`
          : `${profile.firstName}, you've passed the halfway mark! Keep going!`;
        coachingTip = isPt
          ? "O teu corpo já está a adaptar-se. Mantém a consistência!"
          : "Your body is adapting. Stay consistent!";
      } else {
        motivationalMessage = isPt
          ? `${profile.firstName}, cada treino conta. Estás a construir hábitos!`
          : `${profile.firstName}, every workout counts. You're building habits!`;
        coachingTip = isPt
          ? "Foca-te no progresso, não na perfeição."
          : "Focus on progress, not perfection.";
      }

      if (currentStreak >= 7) {
        streakMessage = isPt
          ? `Incrível! ${currentStreak} dias consecutivos! Estás imparável!`
          : `Amazing! ${currentStreak} consecutive days! You're unstoppable!`;
      } else if (currentStreak >= 3) {
        streakMessage = isPt
          ? `Boa sequência de ${currentStreak} dias! Mantém o ritmo!`
          : `Great ${currentStreak}-day streak! Keep the momentum!`;
      }

      return res.json({
        success: true,
        motivationalMessage,
        coachingTip,
        streakMessage,
        progressPercentage,
        daysCompleted,
        totalDays,
        currentStreak
      });
    }

    // Virtual Coach - Get messages
    if (method === "GET" && path.match(/^\/api\/coach\/\d+\/messages$/)) {
      const userId = parseInt(path.split("/")[3]);
      const messages = await db.select().from(coachMessages)
        .where(eq(coachMessages.userId, userId))
        .orderBy(coachMessages.createdAt);
      return res.json({ success: true, messages });
    }

    // Virtual Coach - Send message (chat) with full plan context
    if (method === "POST" && path.match(/^\/api\/coach\/\d+\/chat$/)) {
      console.log(`[COACH-CHAT] ========== START ==========`);
      console.log(`[COACH-CHAT] Timestamp: ${new Date().toISOString()}`);
      
      const userId = parseInt(path.split("/")[3]);
      const { message } = req.body;
      
      console.log(`[COACH-CHAT] userId=${userId}, message="${message?.substring(0, 100) || 'EMPTY'}"`);
      
      if (!message) {
        console.log(`[COACH-CHAT] ERROR: Message is empty or missing`);
        return res.status(400).json({ success: false, error: "Message is required" });
      }

      console.log(`[COACH-CHAT] Step 1: Fetching user profile...`);
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!profile) {
        console.log(`[COACH-CHAT] ERROR: User ${userId} not found in database`);
        return res.status(404).json({ success: false, error: "User not found" });
      }
      console.log(`[COACH-CHAT] Step 1 OK: Found profile for ${profile.firstName}, language=${profile.language}`);

      // Get active plan and progress for context
      console.log(`[COACH-CHAT] Step 2: Fetching active plan for user ${userId}...`);
      const [activePlan] = await db.select().from(fitnessPlans)
        .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)))
        .limit(1);
      
      console.log(`[COACH-CHAT] Step 2 OK: activePlan=${activePlan ? `id=${activePlan.id}` : 'NONE'}`);
      
      const progress = activePlan ? await db.select().from(exerciseProgress)
        .where(eq(exerciseProgress.planId, activePlan.id)) : [];
      console.log(`[COACH-CHAT] Step 2b: Found ${progress.length} progress entries`);

      // Build plan context
      const isPt = profile.language === "pt";
      console.log(`[COACH-CHAT] Language: ${isPt ? 'Portuguese' : 'English'}`);
      let planContextStr = "";
      
      if (activePlan) {
        const planData = activePlan.planData as any;
        const workoutDays = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days || [];
        const nutritionDays = planData?.nutrition_plan_7_days || [];
        const currentDay = activePlan.currentDay || 1;
        const completedDays = progress.filter((p: any) => p.completed).length;
        const totalWorkoutDays = workoutDays.filter((d: any) => !d.is_rest_day).length;
        const completionRate = totalWorkoutDays > 0 ? Math.round((completedDays / totalWorkoutDays) * 100) : 0;
        
        // Get today's workout details
        const todayIndex = (currentDay - 1) % workoutDays.length;
        const todayWorkout = workoutDays[todayIndex];
        const todayProgress = progress.find((p: any) => p.day === currentDay);
        
        // Get nutrition for today
        const nutritionIndex = (currentDay - 1) % nutritionDays.length;
        const todayNutrition = nutritionDays[nutritionIndex];
        
        const workoutInfo = todayWorkout?.is_rest_day 
          ? (isPt ? "Dia de descanso" : "Rest day")
          : `"${todayWorkout?.workout_name_pt || 'Treino'}" (${todayWorkout?.focus_pt || ''}) - ${(todayWorkout?.exercises || []).length} exercícios`;
        
        const exercises = (todayWorkout?.exercises || []).slice(0, 5).map((e: any) => e.name_pt || e.name).join(", ");
        
        planContextStr = isPt ? `
PLANO ATUAL DO UTILIZADOR:
- Dia atual: ${currentDay}
- Progresso: ${completedDays}/${totalWorkoutDays} treinos (${completionRate}%)

TREINO DE HOJE: ${workoutInfo}
${exercises ? `Exercícios: ${exercises}` : ""}
${todayProgress?.completed ? "✓ CONCLUÍDO" : ""}

NUTRIÇÃO DE HOJE: ${todayNutrition?.total_daily_calories || 0} kcal
${(todayNutrition?.meals || []).slice(0, 3).map((m: any) => m.name_pt || m.name).join(", ")}

Podes responder sobre o plano, exercícios e nutrição do utilizador.` : `
USER'S CURRENT PLAN:
- Current day: ${currentDay}
- Progress: ${completedDays}/${totalWorkoutDays} workouts (${completionRate}%)

TODAY'S WORKOUT: ${workoutInfo}
${exercises ? `Exercises: ${exercises}` : ""}
${todayProgress?.completed ? "✓ COMPLETED" : ""}

TODAY'S NUTRITION: ${todayNutrition?.total_daily_calories || 0} kcal
${(todayNutrition?.meals || []).slice(0, 3).map((m: any) => m.name || m.name_pt).join(", ")}

You can answer about the user's plan, exercises and nutrition.`;
      }

      console.log(`[COACH-CHAT] Step 3: Built plan context, length=${planContextStr.length}`);

      const goalMap: Record<string, { pt: string; en: string }> = {
        loss: { pt: "perda de peso", en: "weight loss" },
        muscle: { pt: "ganho muscular", en: "muscle gain" },
        maintenance: { pt: "manutenção", en: "maintenance" }
      };
      const userGoal = profile.goal ? (isPt ? goalMap[profile.goal]?.pt : goalMap[profile.goal]?.en) || profile.goal : "";
      console.log(`[COACH-CHAT] Step 3b: User goal=${userGoal}`);

      const systemPrompt = isPt
        ? `És o Coach Virtual do AI Fitness Planner - um treinador pessoal amigável e motivador.

SOBRE O UTILIZADOR:
- Nome: ${profile.firstName}
- Objetivo: ${userGoal}
- Peso: ${profile.weight}kg
${planContextStr}

REGRAS:
1. Responde SEMPRE em Português (pt-PT)
2. Sê motivador e conciso (máx 3 parágrafos)
3. Usa linguagem informal (tu) e emojis ocasionais 💪
4. Podes discutir os exercícios e refeições do plano
5. Se pedirem novo plano, confirma antes de criar`
        : `You are the Virtual Coach of AI Fitness Planner - a friendly and motivating personal trainer.

ABOUT THE USER:
- Name: ${profile.firstName}
- Goal: ${userGoal}
- Weight: ${profile.weight}kg
${planContextStr}

RULES:
1. ALWAYS respond in English
2. Be motivating and concise (max 3 paragraphs)
3. Use informal language and occasional emojis 💪
4. You can discuss the exercises and meals in the plan
5. If they ask for a new plan, confirm before creating`;

      // Save user message
      console.log(`[COACH-CHAT] Step 4: Saving user message to DB...`);
      let userMessage;
      try {
        [userMessage] = await db.insert(coachMessages)
          .values({ userId, role: "user", content: message })
          .returning();
        console.log(`[COACH-CHAT] Step 4 OK: Saved user message id=${userMessage.id}`);
      } catch (dbErr) {
        console.error(`[COACH-CHAT] Step 4 ERROR: Failed to save user message:`, dbErr);
        throw dbErr;
      }

      // Get conversation history
      console.log(`[COACH-CHAT] Step 5: Fetching conversation history...`);
      const history = await db.select().from(coachMessages)
        .where(eq(coachMessages.userId, userId))
        .orderBy(coachMessages.createdAt);
      console.log(`[COACH-CHAT] Step 5 OK: Found ${history.length} messages in history`);

      // Build conversation for AI
      const messages = history.slice(-10).map((m: any) => ({
        role: m.role,
        content: m.content
      }));
      console.log(`[COACH-CHAT] Step 5b: Using last ${messages.length} messages for AI context`);

      try {
        console.log(`[COACH-CHAT] Step 6: Getting Azure config...`);
        const { apiKey, endpoint, deployment, apiVersion } = getAzureConfig();
        console.log(`[COACH-CHAT] Step 6 OK: deployment=${deployment}, apiVersion=${apiVersion}`);
        console.log(`[COACH-CHAT] Step 6b: endpoint starts with=${endpoint?.substring(0, 40)}...`);
        console.log(`[COACH-CHAT] Step 6c: apiKey length=${apiKey?.length || 0}, starts with=${apiKey?.substring(0, 5)}...`);
        
        const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
        console.log(`[COACH-CHAT] Step 6d: Full URL=${url}`);
        
        console.log(`[COACH-CHAT] System prompt length: ${systemPrompt.length}`);
        console.log(`[COACH-CHAT] System prompt (first 200): ${systemPrompt.substring(0, 200)}...`);
        
        const requestBody = {
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_completion_tokens: 4000,
          temperature: 1
        };
        
        console.log(`[COACH-CHAT] Step 7: Calling Azure OpenAI...`);
        console.log(`[COACH-CHAT] Step 7: Request has ${requestBody.messages.length} messages, max_tokens=4000`);
        
        const fetchStartTime = Date.now();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api-key": apiKey },
          body: JSON.stringify(requestBody)
        });
        const fetchElapsed = Date.now() - fetchStartTime;

        console.log(`[COACH-CHAT] Step 7 RESPONSE: status=${response.status}, time=${fetchElapsed}ms`);
        console.log(`[COACH-CHAT] Step 7b: Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[COACH-CHAT] Step 7 ERROR: Azure returned ${response.status}`);
          console.error(`[COACH-CHAT] Step 7 ERROR body: ${errorText.substring(0, 500)}`);
          throw new Error(`Azure API error: ${response.status} - ${errorText}`);
        }

        console.log(`[COACH-CHAT] Step 8: Parsing JSON response...`);
        const responseText = await response.text();
        console.log(`[COACH-CHAT] Step 8: Raw response length=${responseText.length}`);
        console.log(`[COACH-CHAT] Step 8b: Raw response (first 300): ${responseText.substring(0, 300)}`);
        
        let data;
        try {
          data = JSON.parse(responseText);
          console.log(`[COACH-CHAT] Step 8 OK: Parsed JSON successfully`);
        } catch (parseErr) {
          console.error(`[COACH-CHAT] Step 8 ERROR: Failed to parse JSON:`, parseErr);
          console.error(`[COACH-CHAT] Step 8 ERROR: Full raw response: ${responseText}`);
          throw new Error(`Failed to parse Azure response as JSON`);
        }
        
        // Detailed logging
        const finishReason = data.choices?.[0]?.finish_reason;
        const usage = data.usage;
        const contentLength = data.choices?.[0]?.message?.content?.length || 0;
        
        console.log(`[COACH-CHAT] Step 9: Response analysis:`);
        console.log(`[COACH-CHAT]   - finish_reason=${finishReason}`);
        console.log(`[COACH-CHAT]   - content_length=${contentLength}`);
        console.log(`[COACH-CHAT]   - prompt_tokens=${usage?.prompt_tokens}`);
        console.log(`[COACH-CHAT]   - completion_tokens=${usage?.completion_tokens}`);
        console.log(`[COACH-CHAT]   - reasoning_tokens=${usage?.completion_tokens_details?.reasoning_tokens || 0}`);
        console.log(`[COACH-CHAT]   - choices count=${data.choices?.length || 0}`);
        
        if (finishReason === "length") {
          console.warn(`[COACH-CHAT] WARNING: Response TRUNCATED (finish_reason=length)! Need more tokens.`);
        }
        
        if (!data.choices?.[0]?.message?.content) {
          console.error(`[COACH-CHAT] Step 9 ERROR: No content in response!`);
          console.error(`[COACH-CHAT] Full data object:`, JSON.stringify(data, null, 2));
        }
        
        const aiResponse = data.choices?.[0]?.message?.content || (isPt ? "Desculpa, não consegui responder." : "Sorry, I couldn't respond.");
        
        console.log(`[COACH-CHAT] Step 9b: AI response (first 200): "${aiResponse.substring(0, 200)}"`);

        // Save assistant message
        console.log(`[COACH-CHAT] Step 10: Saving assistant message to DB...`);
        let assistantMessage;
        try {
          [assistantMessage] = await db.insert(coachMessages)
            .values({ userId, role: "assistant", content: aiResponse })
            .returning();
          console.log(`[COACH-CHAT] Step 10 OK: Saved assistant message id=${assistantMessage.id}`);
        } catch (dbErr) {
          console.error(`[COACH-CHAT] Step 10 ERROR: Failed to save assistant message:`, dbErr);
          throw dbErr;
        }

        // Detect intent
        const lowerMessage = message.toLowerCase();
        let intent = "general";
        let confidence = 0.5;
        if (lowerMessage.includes("sim") || lowerMessage.includes("yes") || lowerMessage.includes("criar") || lowerMessage.includes("create")) {
          intent = "authorize_plan";
          confidence = 0.9;
        }
        console.log(`[COACH-CHAT] Step 11: Detected intent=${intent}, confidence=${confidence}`);

        console.log(`[COACH-CHAT] ========== SUCCESS - END ==========`);
        return res.json({
          success: true,
          userMessage,
          assistantMessage,
          intent,
          intentConfidence: confidence
        });
      } catch (error) {
        console.error(`[COACH-CHAT] ========== ERROR - END ==========`);
        console.error(`[COACH-CHAT] Caught error:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : "";
        console.error(`[COACH-CHAT] Error message: ${errorMessage}`);
        console.error(`[COACH-CHAT] Error stack: ${errorStack}`);
        return res.status(500).json({ success: false, error: "Failed to get AI response", details: errorMessage });
      }
    }

    // Virtual Coach - Clear messages
    if (method === "DELETE" && path.match(/^\/api\/coach\/\d+\/messages$/)) {
      const userId = parseInt(path.split("/")[3]);
      await db.delete(coachMessages).where(eq(coachMessages.userId, userId));
      return res.json({ success: true });
    }

    // Virtual Coach - Regenerate plan
    if (method === "POST" && path.match(/^\/api\/coach\/\d+\/regenerate-plan$/)) {
      const userId = parseInt(path.split("/")[3]);
      const { coachContext } = req.body;
      
      console.log(`[regenerate-plan] Starting for user ${userId}`);

      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
      if (!profile) {
        console.log(`[regenerate-plan] User ${userId} not found`);
        return res.status(404).json({ success: false, error: "User not found" });
      }

      const isPt = profile.language === "pt";
      console.log(`[regenerate-plan] User ${userId} found, language: ${isPt ? 'pt' : 'en'}`);

      // Deactivate current plan
      const deactivateResult = await db.update(fitnessPlans)
        .set({ isActive: false } as any)
        .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)));
      console.log(`[regenerate-plan] Deactivated existing plans for user ${userId}`);

      // Create generation status
      try {
        const [status] = await db.insert(planGenerationStatus)
          .values({
            userId,
            status: "generating",
            currentStep: 0,
            totalSteps: 3,
            partialData: { fitness_plan_7_days: [], nutrition_plan_7_days: [] }
          } as any)
          .returning();
        console.log(`[regenerate-plan] Created generation status ${status.id} for user ${userId}`);

        // Add coach message
        await db.insert(coachMessages)
          .values({
            userId,
            role: "assistant",
            content: isPt
              ? "Perfeito! Estou a gerar um novo plano de 7 dias para ti. Vai ao Dashboard e usa o botão Continuar para acompanhar o progresso. 🏋️"
              : "Perfect! I'm generating a new 7-day plan for you. Go to Dashboard and use the Continue button to track progress. 🏋️"
          });
        console.log(`[regenerate-plan] Added coach confirmation message for user ${userId}`);

        return res.json({
          success: true,
          statusId: status.id,
          message: isPt ? "A gerar novo plano..." : "Generating new plan..."
        });
      } catch (dbError) {
        console.error(`[regenerate-plan] DB error for user ${userId}:`, dbError);
        throw dbError;
      }
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

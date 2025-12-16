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

    return res.status(404).json({ success: false, error: "Route not found", path, method });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const db = drizzle(pool, { schema });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const path = req.url?.replace(/\?.*$/, "") || "";

  try {
    // POST /api/login
    if (method === "POST" && path === "/api/login") {
      const { phoneNumber, pin } = req.body;
      if (!phoneNumber || !pin) {
        return res.status(400).json({ success: false, error: "Phone number and PIN are required" });
      }
      const [user] = await db.select().from(schema.userProfiles)
        .where(and(eq(schema.userProfiles.phoneNumber, phoneNumber), eq(schema.userProfiles.pin, pin)))
        .limit(1);
      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid phone number or PIN" });
      }
      return res.json({ success: true, userId: user.id, language: user.language });
    }

    // GET /api/plan/:userId
    if (method === "GET" && path.match(/^\/api\/plan\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      let [plan] = await db.select().from(schema.fitnessPlans)
        .where(and(eq(schema.fitnessPlans.userId, userId), eq(schema.fitnessPlans.isActive, true)))
        .orderBy(desc(schema.fitnessPlans.createdAt))
        .limit(1);
      if (!plan) {
        [plan] = await db.select().from(schema.fitnessPlans)
          .where(eq(schema.fitnessPlans.userId, userId))
          .orderBy(desc(schema.fitnessPlans.createdAt))
          .limit(1);
      }
      if (!plan) {
        return res.status(404).json({ success: false, error: "No plan found" });
      }
      const progress = await db.select().from(schema.exerciseProgress)
        .where(and(eq(schema.exerciseProgress.userId, userId), eq(schema.exerciseProgress.planId, plan.id)));
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

    // GET /api/profile/:userId
    if (method === "GET" && path.match(/^\/api\/profile\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      const [profile] = await db.select().from(schema.userProfiles).where(eq(schema.userProfiles.id, userId));
      if (!profile) {
        return res.status(404).json({ success: false, error: "User profile not found" });
      }
      return res.json({ success: true, profile });
    }

    // GET /api/exercises
    if (method === "GET" && path === "/api/exercises") {
      const exercises = await db.select().from(schema.exerciseLibrary);
      return res.json({ success: true, exercises });
    }

    // GET /api/exercises/:id
    if (method === "GET" && path.match(/^\/api\/exercises\/[^/]+$/)) {
      const id = path.split("/").pop() || "";
      const [exercise] = await db.select().from(schema.exerciseLibrary).where(eq(schema.exerciseLibrary.id, id));
      if (!exercise) {
        return res.status(404).json({ success: false, error: "Exercise not found" });
      }
      return res.json({ success: true, exercise });
    }

    // POST /api/exercises/match
    if (method === "POST" && path === "/api/exercises/match") {
      const { exerciseNames } = req.body;
      if (!exerciseNames || !Array.isArray(exerciseNames)) {
        return res.status(400).json({ success: false, error: "exerciseNames array required" });
      }
      const allExercises = await db.select().from(schema.exerciseLibrary);
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

    // POST /api/progress
    if (method === "POST" && path === "/api/progress") {
      const { userId, planId, day, difficulty } = req.body;
      if (!userId || !planId || !day || !difficulty) {
        return res.status(400).json({ success: false, error: "userId, planId, day, and difficulty are required" });
      }
      const [existing] = await db.select().from(schema.exerciseProgress)
        .where(and(
          eq(schema.exerciseProgress.userId, userId),
          eq(schema.exerciseProgress.planId, planId),
          eq(schema.exerciseProgress.day, day)
        ));
      let progress;
      if (existing) {
        await db.update(schema.exerciseProgress)
          .set({ difficulty, completedAt: new Date() })
          .where(eq(schema.exerciseProgress.id, existing.id));
        progress = { ...existing, difficulty };
      } else {
        [progress] = await db.insert(schema.exerciseProgress)
          .values({ userId, planId, day, completed: 1, difficulty, completedAt: new Date() })
          .returning();
      }
      const [plan] = await db.select().from(schema.fitnessPlans).where(eq(schema.fitnessPlans.id, planId));
      if (plan) {
        const maxDay = plan.durationDays || 30;
        const nextDay = Math.min(day + 1, maxDay + 1);
        await db.update(schema.fitnessPlans)
          .set({ currentDay: nextDay, updatedAt: new Date() })
          .where(eq(schema.fitnessPlans.id, planId));
      }
      return res.json({ success: true, progress });
    }

    // PATCH /api/plan/:planId/day
    if (method === "PATCH" && path.match(/^\/api\/plan\/\d+\/day$/)) {
      const planId = parseInt(path.split("/")[3]);
      const { day } = req.body;
      const [plan] = await db.select().from(schema.fitnessPlans).where(eq(schema.fitnessPlans.id, planId));
      if (!plan) {
        return res.status(404).json({ success: false, error: "Plan not found" });
      }
      const maxDay = plan.durationDays || 30;
      if (day > maxDay + 1) {
        return res.status(400).json({ success: false, error: `Day cannot exceed ${maxDay}` });
      }
      await db.update(schema.fitnessPlans)
        .set({ currentDay: day, updatedAt: new Date() })
        .where(eq(schema.fitnessPlans.id, planId));
      return res.json({ success: true, currentDay: day });
    }

    // GET /api/custom-meals/:userId/:planId
    if (method === "GET" && path.match(/^\/api\/custom-meals\/\d+\/\d+$/)) {
      const parts = path.split("/");
      const userId = parseInt(parts[3]);
      const planId = parseInt(parts[4]);
      const customMeals = await db.select().from(schema.customMeals)
        .where(and(eq(schema.customMeals.userId, userId), eq(schema.customMeals.planId, planId)));
      return res.json({ success: true, customMeals });
    }

    // GET /api/notifications/settings/:userId
    if (method === "GET" && path.match(/^\/api\/notifications\/settings\/\d+$/)) {
      const userId = parseInt(path.split("/").pop() || "");
      let [settings] = await db.select().from(schema.notificationSettings)
        .where(eq(schema.notificationSettings.userId, userId));
      if (!settings) {
        [settings] = await db.insert(schema.notificationSettings)
          .values({ userId })
          .returning();
      }
      return res.json({ success: true, settings });
    }

    // Fallback for unmatched routes
    return res.status(404).json({ success: false, error: "Route not found", path, method });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}

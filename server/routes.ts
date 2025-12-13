import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFitnessPlan } from "./services/azure-ai";
import { insertUserProfileSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create user profile and generate AI fitness plan
  app.post("/api/onboarding", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertUserProfileSchema.parse(req.body);

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

      const plan = await storage.getUserLatestPlan(userId);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: "No plan found for this user",
        });
      }

      // Get user progress
      const progress = await storage.getUserProgress(userId, plan.id);

      res.json({
        success: true,
        plan: plan.planData,
        currentDay: plan.currentDay,
        planId: plan.id,
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

      // Update current day in plan if needed
      await storage.updatePlanCurrentDay(planId, day + 1);

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
        day: z.number().min(1).max(30),
      });

      const { day } = schema.parse(req.body);

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

  return httpServer;
}

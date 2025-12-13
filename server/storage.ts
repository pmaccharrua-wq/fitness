import {
  userProfiles,
  fitnessPlans,
  exerciseProgress,
  type UserProfile,
  type InsertUserProfile,
  type FitnessPlan,
  type InsertFitnessPlan,
  type ExerciseProgress,
  type InsertExerciseProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User Profile Operations
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  
  // Fitness Plan Operations
  createFitnessPlan(data: InsertFitnessPlan): Promise<FitnessPlan>;
  getFitnessPlan(id: number): Promise<FitnessPlan | undefined>;
  getUserLatestPlan(userId: number): Promise<FitnessPlan | undefined>;
  updatePlanCurrentDay(planId: number, day: number): Promise<void>;
  
  // Exercise Progress Operations
  createExerciseProgress(data: InsertExerciseProgress): Promise<ExerciseProgress>;
  getExerciseProgress(userId: number, planId: number, day: number): Promise<ExerciseProgress | undefined>;
  getUserProgress(userId: number, planId: number): Promise<ExerciseProgress[]>;
  updateExerciseProgress(id: number, difficulty: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User Profile Operations
  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db
      .insert(userProfiles)
      .values(data)
      .returning();
    return profile;
  }

  async getUserProfile(id: number): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, id));
    return profile;
  }

  // Fitness Plan Operations
  async createFitnessPlan(data: InsertFitnessPlan): Promise<FitnessPlan> {
    const [plan] = await db
      .insert(fitnessPlans)
      .values(data)
      .returning();
    return plan;
  }

  async getFitnessPlan(id: number): Promise<FitnessPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.id, id));
    return plan;
  }

  async getUserLatestPlan(userId: number): Promise<FitnessPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.userId, userId))
      .orderBy(desc(fitnessPlans.createdAt))
      .limit(1);
    return plan;
  }

  async updatePlanCurrentDay(planId: number, day: number): Promise<void> {
    await db
      .update(fitnessPlans)
      .set({ currentDay: day, updatedAt: new Date() })
      .where(eq(fitnessPlans.id, planId));
  }

  // Exercise Progress Operations
  async createExerciseProgress(data: InsertExerciseProgress): Promise<ExerciseProgress> {
    const [progress] = await db
      .insert(exerciseProgress)
      .values(data)
      .returning();
    return progress;
  }

  async getExerciseProgress(
    userId: number,
    planId: number,
    day: number
  ): Promise<ExerciseProgress | undefined> {
    const [progress] = await db
      .select()
      .from(exerciseProgress)
      .where(
        and(
          eq(exerciseProgress.userId, userId),
          eq(exerciseProgress.planId, planId),
          eq(exerciseProgress.day, day)
        )
      );
    return progress;
  }

  async getUserProgress(userId: number, planId: number): Promise<ExerciseProgress[]> {
    return await db
      .select()
      .from(exerciseProgress)
      .where(
        and(
          eq(exerciseProgress.userId, userId),
          eq(exerciseProgress.planId, planId)
        )
      )
      .orderBy(exerciseProgress.day);
  }

  async updateExerciseProgress(id: number, difficulty: string): Promise<void> {
    await db
      .update(exerciseProgress)
      .set({
        completed: 1,
        difficulty,
        completedAt: new Date(),
      })
      .where(eq(exerciseProgress.id, id));
  }
}

export const storage = new DatabaseStorage();

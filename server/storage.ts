import {
  userProfiles,
  fitnessPlans,
  exerciseProgress,
  exerciseLibrary,
  notificationSettings,
  notificationLog,
  type UserProfile,
  type InsertUserProfile,
  type FitnessPlan,
  type InsertFitnessPlan,
  type ExerciseProgress,
  type InsertExerciseProgress,
  type ExerciseLibraryItem,
  type InsertExerciseLibraryItem,
  type NotificationSettingsType,
  type InsertNotificationSettings,
  type NotificationLogType,
  type InsertNotificationLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // User Profile Operations
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  getUserByPhoneAndPin(phoneNumber: string, pin: string): Promise<UserProfile | undefined>;
  
  // Fitness Plan Operations
  createFitnessPlan(data: InsertFitnessPlan): Promise<FitnessPlan>;
  getFitnessPlan(id: number): Promise<FitnessPlan | undefined>;
  getUserLatestPlan(userId: number): Promise<FitnessPlan | undefined>;
  getUserActivePlan(userId: number): Promise<FitnessPlan | undefined>;
  getUserPlans(userId: number): Promise<FitnessPlan[]>;
  updatePlanCurrentDay(planId: number, day: number): Promise<void>;
  setActivePlan(userId: number, planId: number): Promise<void>;
  deletePlan(planId: number): Promise<void>;
  
  // Exercise Progress Operations
  createExerciseProgress(data: InsertExerciseProgress): Promise<ExerciseProgress>;
  getExerciseProgress(userId: number, planId: number, day: number): Promise<ExerciseProgress | undefined>;
  getUserProgress(userId: number, planId: number): Promise<ExerciseProgress[]>;
  updateExerciseProgress(id: number, difficulty: string): Promise<void>;

  // Exercise Library Operations
  seedExerciseLibrary(exercises: InsertExerciseLibraryItem[]): Promise<void>;
  getAllExercises(): Promise<ExerciseLibraryItem[]>;
  getExerciseById(id: string): Promise<ExerciseLibraryItem | undefined>;
  getExercisesByIds(ids: string[]): Promise<ExerciseLibraryItem[]>;

  // Notification Settings Operations
  createNotificationSettings(data: InsertNotificationSettings): Promise<NotificationSettingsType>;
  getNotificationSettings(userId: number): Promise<NotificationSettingsType | undefined>;
  updateNotificationSettings(userId: number, data: Partial<InsertNotificationSettings>): Promise<void>;

  // Notification Log Operations
  createNotificationLog(data: InsertNotificationLog): Promise<NotificationLogType>;
  getUserNotifications(userId: number, limit?: number): Promise<NotificationLogType[]>;
  markNotificationRead(id: number): Promise<void>;
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

  async getUserByPhoneAndPin(phoneNumber: string, pin: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(
        and(
          eq(userProfiles.phoneNumber, phoneNumber),
          eq(userProfiles.pin, pin)
        )
      )
      .orderBy(desc(userProfiles.id))
      .limit(1);
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

  async getUserActivePlan(userId: number): Promise<FitnessPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fitnessPlans)
      .where(and(eq(fitnessPlans.userId, userId), eq(fitnessPlans.isActive, true)))
      .orderBy(desc(fitnessPlans.createdAt))
      .limit(1);
    return plan;
  }

  async getUserPlans(userId: number): Promise<FitnessPlan[]> {
    return await db
      .select()
      .from(fitnessPlans)
      .where(eq(fitnessPlans.userId, userId))
      .orderBy(desc(fitnessPlans.createdAt));
  }

  async updatePlanCurrentDay(planId: number, day: number): Promise<void> {
    await db
      .update(fitnessPlans)
      .set({ currentDay: day, updatedAt: new Date() })
      .where(eq(fitnessPlans.id, planId));
  }

  async setActivePlan(userId: number, planId: number): Promise<void> {
    await db
      .update(fitnessPlans)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(fitnessPlans.userId, userId));
    await db
      .update(fitnessPlans)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(fitnessPlans.id, planId));
  }

  async deletePlan(planId: number): Promise<void> {
    await db
      .delete(exerciseProgress)
      .where(eq(exerciseProgress.planId, planId));
    await db
      .delete(fitnessPlans)
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

  // Exercise Library Operations
  async seedExerciseLibrary(exercises: InsertExerciseLibraryItem[]): Promise<void> {
    for (const exercise of exercises) {
      await db
        .insert(exerciseLibrary)
        .values(exercise)
        .onConflictDoUpdate({
          target: exerciseLibrary.id,
          set: {
            name: exercise.name,
            namePt: exercise.namePt,
            primaryMuscles: exercise.primaryMuscles,
            secondaryMuscles: exercise.secondaryMuscles,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
            imageUrl: exercise.imageUrl,
            videoUrl: exercise.videoUrl,
            instructions: exercise.instructions,
            instructionsPt: exercise.instructionsPt,
          },
        });
    }
  }

  async getAllExercises(): Promise<ExerciseLibraryItem[]> {
    return await db.select().from(exerciseLibrary);
  }

  async getExerciseById(id: string): Promise<ExerciseLibraryItem | undefined> {
    const [exercise] = await db
      .select()
      .from(exerciseLibrary)
      .where(eq(exerciseLibrary.id, id));
    return exercise;
  }

  async getExercisesByIds(ids: string[]): Promise<ExerciseLibraryItem[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(exerciseLibrary)
      .where(inArray(exerciseLibrary.id, ids));
  }

  // Notification Settings Operations
  async createNotificationSettings(data: InsertNotificationSettings): Promise<NotificationSettingsType> {
    const [settings] = await db
      .insert(notificationSettings)
      .values(data)
      .returning();
    return settings;
  }

  async getNotificationSettings(userId: number): Promise<NotificationSettingsType | undefined> {
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    return settings;
  }

  async updateNotificationSettings(userId: number, data: Partial<InsertNotificationSettings>): Promise<void> {
    await db
      .update(notificationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationSettings.userId, userId));
  }

  // Notification Log Operations
  async createNotificationLog(data: InsertNotificationLog): Promise<NotificationLogType> {
    const [log] = await db
      .insert(notificationLog)
      .values(data)
      .returning();
    return log;
  }

  async getUserNotifications(userId: number, limit: number = 50): Promise<NotificationLogType[]> {
    return await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.userId, userId))
      .orderBy(desc(notificationLog.sentAt))
      .limit(limit);
  }

  async markNotificationRead(id: number): Promise<void> {
    await db
      .update(notificationLog)
      .set({ read: true })
      .where(eq(notificationLog.id, id));
  }
}

export const storage = new DatabaseStorage();

import { pgTable, text, integer, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// User Profile Table
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  sex: text("sex").notNull(),
  age: integer("age").notNull(),
  weight: integer("weight").notNull(), // in kg
  height: integer("height").notNull(), // in cm
  goal: text("goal").notNull(), // "loss", "muscle", "endurance", "gain"
  activityLevel: text("activity_level").notNull(),
  equipment: text("equipment").array(),
  impediments: text("impediments"),
  somatotype: text("somatotype"), // "ectomorph", "mesomorph", "endomorph"
  currentBodyComp: text("current_body_comp"), // Current body composition description
  targetBodyComp: text("target_body_comp"), // Target body composition description
  timePerDay: integer("time_per_day").default(45), // Workout time in minutes
  difficulty: text("difficulty").default("medium"), // "very_easy", "easy", "medium", "hard", "very_hard"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fitness Plans Table
export const fitnessPlans = pgTable("fitness_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  planData: jsonb("plan_data").notNull(), // Stores the entire 30-day plan from Azure AI
  currentDay: integer("current_day").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Exercise Progress Tracking
export const exerciseProgress = pgTable("exercise_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  planId: integer("plan_id").notNull().references(() => fitnessPlans.id),
  day: integer("day").notNull(),
  completed: integer("completed").default(0).notNull(), // 0 = not started, 1 = completed
  difficulty: text("difficulty"), // "easy", "just right", "hard"
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type FitnessPlan = typeof fitnessPlans.$inferSelect;
export type InsertFitnessPlan = z.infer<typeof insertFitnessPlanSchema>;

export type ExerciseProgress = typeof exerciseProgress.$inferSelect;
export type InsertExerciseProgress = z.infer<typeof insertExerciseProgressSchema>;

// Insert Schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertFitnessPlanSchema = createInsertSchema(fitnessPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExerciseProgressSchema = createInsertSchema(exerciseProgress).omit({
  id: true,
  createdAt: true,
});

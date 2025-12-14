import { pgTable, text, integer, serial, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Exercise Library - Local database of exercises with media assets
export const exerciseLibrary = pgTable("exercise_library", {
  id: text("id").primaryKey(), // Unique exercise ID (e.g., "squat_barbell", "pushup_standard")
  name: text("name").notNull(), // Display name
  namePt: text("name_pt").notNull(), // Portuguese name
  primaryMuscles: text("primary_muscles").array().notNull(), // e.g., ["quadriceps", "glutes"]
  secondaryMuscles: text("secondary_muscles").array(), // e.g., ["hamstrings", "core"]
  equipment: text("equipment").notNull(), // "barbell", "dumbbell", "bodyweight", etc.
  difficulty: text("difficulty").notNull(), // "beginner", "intermediate", "advanced"
  imageUrl: text("image_url"), // URL to exercise image/GIF
  videoUrl: text("video_url"), // YouTube video link
  instructions: text("instructions"), // Brief exercise instructions in English
  instructionsPt: text("instructions_pt"), // Brief exercise instructions in Portuguese
});

// Notification Settings - User preferences for reminders
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id).unique(),
  waterRemindersEnabled: boolean("water_reminders_enabled").default(true).notNull(),
  waterReminderIntervalMinutes: integer("water_reminder_interval_minutes").default(90).notNull(),
  mealRemindersEnabled: boolean("meal_reminders_enabled").default(true).notNull(),
  workoutRemindersEnabled: boolean("workout_reminders_enabled").default(true).notNull(),
  sleepStartHour: integer("sleep_start_hour").default(23).notNull(), // 11 PM
  sleepEndHour: integer("sleep_end_hour").default(7).notNull(), // 7 AM
  waterTargetMl: integer("water_target_ml").default(2500).notNull(), // Daily water target
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification Log - Track sent notifications
export const notificationLog = pgTable("notification_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  type: text("type").notNull(), // "water", "meal", "workout"
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  read: boolean("read").default(false).notNull(),
});

// User Profile Table
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(), // Username / first name
  phoneNumber: text("phone_number").notNull(), // Portuguese phone with +351 prefix
  pin: text("pin").default("0000").notNull(), // 4-digit PIN for login
  language: text("language").default("pt").notNull(), // "pt" for Portuguese, "en" for English
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
  isActive: boolean("is_active").default(true).notNull(), // Whether this is the active plan
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

export type ExerciseLibraryItem = typeof exerciseLibrary.$inferSelect;
export type InsertExerciseLibraryItem = z.infer<typeof insertExerciseLibrarySchema>;

export type NotificationSettingsType = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

export type NotificationLogType = typeof notificationLog.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

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

export const insertExerciseLibrarySchema = createInsertSchema(exerciseLibrary);

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationLogSchema = createInsertSchema(notificationLog).omit({
  id: true,
  sentAt: true,
});

// Custom Meals - User-replaced or AI-generated meals
export const customMeals = pgTable("custom_meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  planId: integer("plan_id").notNull().references(() => fitnessPlans.id),
  dayIndex: integer("day_index").notNull(), // Which nutrition day (0-6)
  mealSlot: integer("meal_slot").notNull(), // Which meal in the day (0, 1, 2, etc.)
  source: text("source").notNull(), // "swap" or "ingredient_ai"
  originalMeal: jsonb("original_meal"), // The original meal data
  customMeal: jsonb("custom_meal").notNull(), // The replacement meal data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CustomMeal = typeof customMeals.$inferSelect;
export type InsertCustomMeal = z.infer<typeof insertCustomMealSchema>;

export const insertCustomMealSchema = createInsertSchema(customMeals).omit({
  id: true,
  createdAt: true,
});

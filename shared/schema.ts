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

// Exercise Candidates - Staging table for new exercises detected from AI plans
export const exerciseCandidates = pgTable("exercise_candidates", {
  id: serial("id").primaryKey(),
  exerciseId: text("exercise_id").notNull().unique(), // Canonical ID slug (e.g., "step_ups")
  name: text("name"), // English name
  namePt: text("name_pt"), // Portuguese name (from AI plan)
  primaryMuscles: text("primary_muscles").array(),
  equipment: text("equipment"),
  difficulty: text("difficulty"),
  imageUrl: text("image_url"), // Pexels image
  videoUrl: text("video_url"), // YouTube video
  instructions: text("instructions"), // AI-generated English instructions
  instructionsPt: text("instructions_pt"), // AI-generated Portuguese instructions
  status: text("status").default("pending").notNull(), // pending, enriched, promoted, rejected
  sourceContext: text("source_context"), // Original context from AI plan
  createdAt: timestamp("created_at").defaultNow().notNull(),
  promotedAt: timestamp("promoted_at"),
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
  targetWeight: integer("target_weight"), // Target weight in kg
  weightGoalWeeks: integer("weight_goal_weeks"), // Timeframe to reach target weight in weeks
  goalRealistic: boolean("goal_realistic"), // Whether AI determined goal is realistic
  goalFeedback: text("goal_feedback"), // AI feedback on the goal
  timePerDay: integer("time_per_day").default(45), // Workout time in minutes
  difficulty: text("difficulty").default("medium"), // "very_easy", "easy", "medium", "hard", "very_hard"
  mealsPerDay: integer("meals_per_day").default(5), // Number of meals per day (2-6)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fitness Plans Table
export const fitnessPlans = pgTable("fitness_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  planData: jsonb("plan_data").notNull(), // Stores the entire plan from Azure AI
  currentDay: integer("current_day").default(1).notNull(),
  durationDays: integer("duration_days").default(30).notNull(), // Plan duration: 30, 60, or 90 days
  generatedWorkoutDays: integer("generated_workout_days").default(7).notNull(), // How many workout days have been generated
  generatedNutritionDays: integer("generated_nutrition_days").default(7).notNull(), // How many nutrition days have been generated
  generationStatus: text("generation_status").default("idle").notNull(), // idle, generating, failed
  generationStartedAt: timestamp("generation_started_at"), // When extension generation started (for timeout detection)
  generationContext: text("generation_context"), // Original context from coach for consistent extensions
  startDate: timestamp("start_date").defaultNow().notNull(), // When the plan started
  endDate: timestamp("end_date"), // When the plan ends (calculated from startDate + durationDays)
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

export type ExerciseCandidate = typeof exerciseCandidates.$inferSelect;
export type InsertExerciseCandidate = z.infer<typeof insertExerciseCandidateSchema>;

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

export const insertExerciseCandidateSchema = createInsertSchema(exerciseCandidates).omit({
  id: true,
  createdAt: true,
  promotedAt: true,
});

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

// Virtual Coach Chat Messages
export const coachMessages = pgTable("coach_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => userProfiles.id),
  role: text("role").notNull(), // "user" or "assistant"
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CoachMessage = typeof coachMessages.$inferSelect;
export type InsertCoachMessage = z.infer<typeof insertCoachMessageSchema>;

export const insertCoachMessageSchema = createInsertSchema(coachMessages).omit({
  id: true,
  createdAt: true,
});

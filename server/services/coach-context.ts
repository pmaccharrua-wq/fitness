import { storage } from "../storage";
import { FitnessPlan, ExerciseProgress, UserProfile } from "@shared/schema";

export interface WorkoutDaySummary {
  day: number;
  name: string;
  focus: string;
  duration: number;
  exerciseCount: number;
  exercises: string[];
  isRestDay: boolean;
  completed: boolean;
  difficulty?: string;
}

export interface NutritionDaySummary {
  day: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealCount: number;
  meals: string[];
}

export interface CoachContext {
  hasPlan: boolean;
  planSummary: string;
  completionStats: {
    totalWorkoutDays: number;
    completedDays: number;
    completionRate: number;
    currentDay: number;
    daysRemaining: number;
    currentStreak: number;
  } | null;
  recentProgress: string;
  exerciseCategories: string[];
  nutritionSummary: string;
  canCreateNewPlan: boolean;
  todayWorkout: WorkoutDaySummary | null;
  yesterdayWorkout: WorkoutDaySummary | null;
  tomorrowWorkout: WorkoutDaySummary | null;
  todayNutrition: NutritionDaySummary | null;
  userGoal: string;
  userMetrics: string;
}

function buildWorkoutSummary(dayData: any, dayProgress: any, isPt: boolean): WorkoutDaySummary {
  if (!dayData) return null as any;
  
  const exercises = (dayData.exercises || []).map((e: any) => 
    isPt ? (e.name_pt || e.name) : (e.name || e.name_pt)
  ).slice(0, 6);
  
  return {
    day: dayData.day,
    name: dayData.workout_name_pt || dayData.workout_name || `Day ${dayData.day}`,
    focus: dayData.focus_pt || dayData.focus || "",
    duration: dayData.duration_minutes || 30,
    exerciseCount: (dayData.exercises || []).length,
    exercises,
    isRestDay: dayData.is_rest_day || false,
    completed: dayProgress?.completed || false,
    difficulty: dayProgress?.difficulty
  };
}

function buildNutritionSummary(dayData: any, isPt: boolean): NutritionDaySummary | null {
  if (!dayData) return null;
  
  const meals = (dayData.meals || []).map((m: any) => 
    isPt ? (m.name_pt || m.name) : (m.name || m.name_pt)
  ).slice(0, 6);
  
  return {
    day: dayData.day,
    calories: dayData.total_daily_calories || 0,
    protein: dayData.macros?.protein_grams || 0,
    carbs: dayData.macros?.carbs_grams || 0,
    fats: dayData.macros?.fat_grams || 0,
    mealCount: (dayData.meals || []).length,
    meals
  };
}

export async function getCoachContext(userId: number, language: string = "pt"): Promise<CoachContext> {
  const isPt = language === "pt";
  
  const [profile, activePlan, progress] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getUserActivePlan(userId),
    storage.getUserProgress(userId, 0).catch(() => [])
  ]);

  const goalLabels: Record<string, { pt: string; en: string }> = {
    loss: { pt: "perda de peso", en: "weight loss" },
    muscle: { pt: "ganho muscular", en: "muscle gain" },
    maintenance: { pt: "manutenção", en: "maintenance" },
    endurance: { pt: "resistência", en: "endurance" }
  };

  const userGoal = profile?.goal 
    ? (isPt ? goalLabels[profile.goal]?.pt : goalLabels[profile.goal]?.en) || profile.goal
    : "";
  
  const userMetrics = profile 
    ? `${profile.weight}kg, ${profile.height}cm, ${profile.age} ${isPt ? "anos" : "years"}`
    : "";

  if (!activePlan) {
    return {
      hasPlan: false,
      planSummary: isPt 
        ? "O utilizador ainda não tem um plano de fitness ativo."
        : "The user doesn't have an active fitness plan yet.",
      completionStats: null,
      recentProgress: "",
      exerciseCategories: [],
      nutritionSummary: "",
      canCreateNewPlan: true,
      todayWorkout: null,
      yesterdayWorkout: null,
      tomorrowWorkout: null,
      todayNutrition: null,
      userGoal,
      userMetrics
    };
  }

  const planData = activePlan.planData as any;
  const workoutDays = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days || [];
  const nutritionDays = planData?.nutrition_plan_7_days || [];
  
  const userProgress = await storage.getUserProgress(userId, activePlan.id);
  const completedDays = userProgress.filter(p => p.completed).length;
  const totalWorkoutDays = workoutDays.filter((d: any) => !d.is_rest_day).length;
  
  const completionRate = totalWorkoutDays > 0 
    ? Math.round((completedDays / totalWorkoutDays) * 100) 
    : 0;

  const currentDay = activePlan.currentDay || 1;
  const generatedWorkoutDays = activePlan.generatedWorkoutDays || workoutDays.length;
  const daysRemaining = generatedWorkoutDays - currentDay;

  // Calculate current streak
  const completedDayNumbers = userProgress
    .filter(p => p.completed)
    .map(p => p.day)
    .sort((a, b) => b - a);
  
  let currentStreak = 0;
  if (completedDayNumbers.length > 0) {
    currentStreak = 1;
    for (let i = 0; i < completedDayNumbers.length - 1; i++) {
      if (completedDayNumbers[i] - completedDayNumbers[i + 1] === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  const recentProgressEntries = userProgress
    .slice(-5)
    .map(p => {
      const day = workoutDays.find((d: any) => d.day === p.day);
      const dayName = day?.workout_name_pt || `Day ${p.day}`;
      const status = p.completed 
        ? (isPt ? "concluído" : "completed")
        : (isPt ? "não concluído" : "not completed");
      const difficulty = p.difficulty || "";
      return `- Dia ${p.day} (${dayName}): ${status}${difficulty ? ` - ${difficulty}` : ""}`;
    })
    .join("\n");

  const exerciseNames: string[] = workoutDays.flatMap((d: any) => 
    (d.exercises || []).map((e: any) => String(e.name_pt || e.name || ""))
  );
  const exerciseCategories: string[] = Array.from(new Set(exerciseNames)).slice(0, 10);

  const nutritionSummary = nutritionDays.length > 0
    ? (isPt 
        ? `Plano nutricional de ${nutritionDays.length} dias incluído com ${nutritionDays[0]?.total_daily_calories || 0} calorias/dia.`
        : `${nutritionDays.length}-day nutrition plan included with ${nutritionDays[0]?.total_daily_calories || 0} calories/day.`)
    : (isPt ? "Sem plano nutricional." : "No nutrition plan.");

  const planSummaryText = isPt
    ? `Plano ativo: ${generatedWorkoutDays} dias de treino gerados. Dia atual: ${currentDay}. Taxa de conclusão: ${completionRate}%. Sequência atual: ${currentStreak} dias. ${daysRemaining <= 2 ? "Pode estender o plano com +7 dias." : ""}`
    : `Active plan: ${generatedWorkoutDays} workout days generated. Current day: ${currentDay}. Completion rate: ${completionRate}%. Current streak: ${currentStreak} days. ${daysRemaining <= 2 ? "Can extend plan with +7 days." : ""}`;

  // Build workout summaries for today, yesterday, tomorrow (guard against empty arrays)
  let todayWorkout: WorkoutDaySummary | null = null;
  let yesterdayWorkout: WorkoutDaySummary | null = null;
  let tomorrowWorkout: WorkoutDaySummary | null = null;
  let todayNutrition: NutritionDaySummary | null = null;

  if (workoutDays.length > 0) {
    const todayIndex = (currentDay - 1) % workoutDays.length;
    const yesterdayIndex = currentDay > 1 ? ((currentDay - 2) % workoutDays.length) : -1;
    const tomorrowIndex = currentDay < generatedWorkoutDays ? (currentDay % workoutDays.length) : -1;

    const todayData = workoutDays[todayIndex];
    const yesterdayData = yesterdayIndex >= 0 ? workoutDays[yesterdayIndex] : null;
    const tomorrowData = tomorrowIndex >= 0 ? workoutDays[tomorrowIndex] : null;

    const todayProgress = userProgress.find(p => p.day === currentDay);
    const yesterdayProgress = userProgress.find(p => p.day === currentDay - 1);

    todayWorkout = todayData ? buildWorkoutSummary(todayData, todayProgress, isPt) : null;
    yesterdayWorkout = yesterdayData ? buildWorkoutSummary(yesterdayData, yesterdayProgress, isPt) : null;
    tomorrowWorkout = tomorrowData ? buildWorkoutSummary(tomorrowData, null, isPt) : null;
  }

  // Nutrition for today (guard against empty arrays)
  if (nutritionDays.length > 0) {
    const nutritionDayIndex = (currentDay - 1) % nutritionDays.length;
    const todayNutritionData = nutritionDays[nutritionDayIndex];
    todayNutrition = buildNutritionSummary(todayNutritionData, isPt);
  }

  return {
    hasPlan: true,
    planSummary: planSummaryText,
    completionStats: {
      totalWorkoutDays,
      completedDays,
      completionRate,
      currentDay,
      daysRemaining,
      currentStreak
    },
    recentProgress: recentProgressEntries || (isPt ? "Sem progresso registado ainda." : "No progress recorded yet."),
    exerciseCategories,
    nutritionSummary,
    canCreateNewPlan: completionRate < 30 || daysRemaining <= 0,
    todayWorkout,
    yesterdayWorkout,
    tomorrowWorkout,
    todayNutrition,
    userGoal,
    userMetrics
  };
}

export interface IntentClassification {
  intent: "none" | "suggest_plan" | "authorize_plan" | "extend_plan";
  confidence: number;
}

export function classifyUserIntent(message: string, language: string = "pt"): IntentClassification {
  const lowerMessage = message.toLowerCase();
  
  const authorizePlanKeywords = [
    "sim, cria", "sim cria", "pode criar", "cria o plano", "criar plano", 
    "gera o plano", "gerar plano", "quero o plano", "quero um plano",
    "yes, create", "yes create", "create the plan", "create plan",
    "generate plan", "i want the plan", "i want a plan",
    "aceito", "vamos", "força", "bora", "let's do it", "go ahead",
    "faz isso", "do it", "ok cria", "ok gera", "sim por favor", "yes please"
  ];
  
  const suggestPlanKeywords = [
    "novo plano", "mudar plano", "outro plano", "plano diferente",
    "não está a funcionar", "muito difícil", "muito fácil",
    "new plan", "change plan", "different plan", "not working",
    "too hard", "too easy", "recomeçar", "start over"
  ];
  
  const extendPlanKeywords = [
    "mais dias", "estender", "prolongar", "continuar plano",
    "more days", "extend", "continue plan", "+7 dias", "+7 days"
  ];

  for (const keyword of authorizePlanKeywords) {
    if (lowerMessage.includes(keyword)) {
      return { intent: "authorize_plan", confidence: 0.9 };
    }
  }

  for (const keyword of extendPlanKeywords) {
    if (lowerMessage.includes(keyword)) {
      return { intent: "extend_plan", confidence: 0.85 };
    }
  }

  for (const keyword of suggestPlanKeywords) {
    if (lowerMessage.includes(keyword)) {
      return { intent: "suggest_plan", confidence: 0.8 };
    }
  }

  return { intent: "none", confidence: 1.0 };
}

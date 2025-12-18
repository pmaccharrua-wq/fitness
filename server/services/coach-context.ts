import { storage } from "../storage";
import { FitnessPlan, ExerciseProgress, UserProfile } from "@shared/schema";

export interface CoachContext {
  hasPlan: boolean;
  planSummary: string;
  completionStats: {
    totalWorkoutDays: number;
    completedDays: number;
    completionRate: number;
    currentDay: number;
    daysRemaining: number;
  } | null;
  recentProgress: string;
  exerciseCategories: string[];
  nutritionSummary: string;
  canCreateNewPlan: boolean;
}

export async function getCoachContext(userId: number, language: string = "pt"): Promise<CoachContext> {
  const isPt = language === "pt";
  
  const [profile, activePlan, progress] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getUserActivePlan(userId),
    storage.getUserProgress(userId, 0).catch(() => [])
  ]);

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
      canCreateNewPlan: true
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
    ? `Plano ativo: ${generatedWorkoutDays} dias de treino gerados. Dia atual: ${currentDay}. Taxa de conclusão: ${completionRate}%. ${daysRemaining <= 2 ? "Pode estender o plano com +7 dias." : ""}`
    : `Active plan: ${generatedWorkoutDays} workout days generated. Current day: ${currentDay}. Completion rate: ${completionRate}%. ${daysRemaining <= 2 ? "Can extend plan with +7 days." : ""}`;

  return {
    hasPlan: true,
    planSummary: planSummaryText,
    completionStats: {
      totalWorkoutDays,
      completedDays,
      completionRate,
      currentDay,
      daysRemaining
    },
    recentProgress: recentProgressEntries || (isPt ? "Sem progresso registado ainda." : "No progress recorded yet."),
    exerciseCategories,
    nutritionSummary,
    canCreateNewPlan: completionRate < 30 || daysRemaining <= 0
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

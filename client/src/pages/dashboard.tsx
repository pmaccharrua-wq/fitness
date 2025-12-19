import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import DayCard from "@/components/DayCard";
import WorkoutTimer from "@/components/WorkoutTimer";
import ProgressCharts from "@/components/ProgressCharts";
import ExerciseCard from "@/components/ExerciseCard";
import MealCard, { type MealData } from "@/components/MealCard";
import AIMealBuilder from "@/components/AIMealBuilder";
import CoachingCard from "@/components/CoachingCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Flame, Clock, Trophy, Loader2, Trash2, CheckCircle, ChevronLeft, ChevronRight, RefreshCw, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserPlan, getUserId, recordProgress, matchExercises, getUserPlans, activatePlan, deletePlan, getCustomMeals, deleteCustomMeal, renewPlan, extendPlan } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

interface CustomMealRecord {
  id: number;
  dayIndex: number;
  mealSlot: number;
  customMeal: MealData;
  originalMeal: MealData | null;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [planData, setPlanData] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<any[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<Record<string, any>>({});
  const [exerciseLibraryById, setExerciseLibraryById] = useState<Record<string, any>>({});
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [customMeals, setCustomMeals] = useState<CustomMealRecord[]>([]);
  const [durationDays, setDurationDays] = useState(30);
  const [isExpired, setIsExpired] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isExtending, setIsExtending] = useState(false);
  const [generatedWorkoutDays, setGeneratedWorkoutDays] = useState(7);
  const latestDayRef = useRef<number>(1);
  const { t, language } = useTranslation();

  // Helper to look up exercise by ID first (reliable), then by name (fallback)
  const getLibraryMatch = (ex: any) => {
    // Try by exerciseId first (most reliable)
    if (ex.exerciseId && exerciseLibraryById[ex.exerciseId]) {
      return exerciseLibraryById[ex.exerciseId];
    }
    // Fallback to name-based lookup
    const exerciseKey = ex.name || ex.name_pt;
    return exerciseLibrary[exerciseKey];
  };

  // Handler for when an exercise is enriched - updates the library so it persists
  const handleEnrichmentComplete = (exerciseName: string, enrichedData: any) => {
    setExerciseLibrary(prev => ({
      ...prev,
      [exerciseName]: enrichedData
    }));
    if (enrichedData.id) {
      setExerciseLibraryById(prev => ({
        ...prev,
        [enrichedData.id]: enrichedData
      }));
    }
  };

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    loadPlan(userId);
  }, []);

  useEffect(() => {
    const fitnessPlanData = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days;
    if (fitnessPlanData) {
      latestDayRef.current = selectedDay;
      loadExerciseMatches(selectedDay);
    }
  }, [selectedDay, planData]);

  async function loadExerciseMatches(day: number) {
    const fitnessPlanData = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days;
    const planLength = fitnessPlanData?.length || 15;
    const dayIndex = ((day - 1) % planLength);
    const todaysPlan = fitnessPlanData?.[dayIndex] || fitnessPlanData?.[0];
    if (todaysPlan?.exercises) {
      const mainExercises = todaysPlan.exercises.map((ex: any) => ({ name: ex.name || ex.name_pt, exerciseId: ex.exerciseId }));
      const warmupExercises = (todaysPlan.warmup_exercises || []).map((ex: any) => ({ name: ex.name || ex.name_pt, exerciseId: ex.exerciseId }));
      const cooldownExercises = (todaysPlan.cooldown_exercises || []).map((ex: any) => ({ name: ex.name || ex.name_pt, exerciseId: ex.exerciseId }));
      const allExercises = [...warmupExercises, ...mainExercises, ...cooldownExercises].filter(ex => ex.name || ex.exerciseId);
      try {
        const matchResult = await matchExercises(allExercises);
        if (matchResult.success && day === latestDayRef.current) {
          setExerciseLibrary(matchResult.exercises);
          // Also store by ID for reliable lookups
          if (matchResult.exercisesById) {
            setExerciseLibraryById(matchResult.exercisesById);
          }
        }
      } catch (e) {
        console.error("Error matching exercises:", e);
      }
    }
  }

  async function loadPlan(userId: number) {
    try {
      const [planResponse, plansResponse] = await Promise.all([
        getUserPlan(userId),
        getUserPlans(userId)
      ]);
      if (planResponse.success) {
        setPlanData(planResponse.plan);
        setCurrentDay(planResponse.currentDay);
        setSelectedDay(planResponse.currentDay);
        setPlanId(planResponse.planId);
        setProgress(planResponse.progress || []);
        setDurationDays(planResponse.durationDays || 30);
        setIsExpired(planResponse.isExpired || false);
        setGeneratedWorkoutDays(planResponse.generatedWorkoutDays || planResponse.durationDays || 7);
        
        // Fetch custom meals for this plan
        const customMealsResponse = await getCustomMeals(userId, planResponse.planId);
        if (customMealsResponse.success && customMealsResponse.customMeals) {
          setCustomMeals(customMealsResponse.customMeals);
        }
      } else {
        toast.error(t("dashboard", "loadFailed"));
        setLocation("/onboarding");
      }
      if (plansResponse.success) {
        setAllPlans(plansResponse.plans || []);
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      toast.error(t("dashboard", "errorLoading"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleMealSwapped(dayIndex: number, mealSlot: number, newMeal: MealData, originalMeal: MealData) {
    setCustomMeals(prev => {
      const filtered = prev.filter(cm => !(cm.dayIndex === dayIndex && cm.mealSlot === mealSlot));
      return [...filtered, { id: -1, dayIndex, mealSlot, customMeal: newMeal, originalMeal }];
    });
    toast.success(language === "pt" ? "Refeição trocada!" : "Meal swapped!");
  }

  async function handleRevertMeal(customMealId: number) {
    try {
      const response = await deleteCustomMeal(customMealId);
      if (response.success) {
        setCustomMeals(prev => prev.filter(cm => cm.id !== customMealId));
        toast.success(language === "pt" ? "Refeição original restaurada" : "Original meal restored");
      }
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao reverter" : "Error reverting");
    }
  }

  function handleAIMealGenerated(meal: MealData, mealSlot: number) {
    setCustomMeals(prev => {
      const filtered = prev.filter(cm => !(cm.dayIndex === 0 && cm.mealSlot === mealSlot));
      return [...filtered, { id: -1, dayIndex: 0, mealSlot, customMeal: meal, originalMeal: null }];
    });
    toast.success(language === "pt" ? "Refeição criada com IA!" : "AI meal created!");
  }

  function getMealForSlot(dayIdx: number, meals: MealData[], mealIdx: number): { meal: MealData; isCustom: boolean; customMealId?: number } {
    const customMeal = customMeals.find(cm => cm.dayIndex === dayIdx && cm.mealSlot === mealIdx);
    if (customMeal) {
      return { meal: customMeal.customMeal, isCustom: true, customMealId: customMeal.id > 0 ? customMeal.id : undefined };
    }
    return { meal: meals[mealIdx], isCustom: false };
  }

  async function handleActivatePlan(targetPlanId: number) {
    const userId = getUserId();
    if (!userId) return;
    try {
      await activatePlan(targetPlanId, userId);
      await loadPlan(userId);
      toast.success(language === "pt" ? "Plano ativado!" : "Plan activated!");
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao ativar plano" : "Error activating plan");
    }
  }

  async function handleDeletePlan(targetPlanId: number) {
    const userId = getUserId();
    if (!userId) return;
    try {
      await deletePlan(targetPlanId);
      await loadPlan(userId);
      toast.success(language === "pt" ? "Plano eliminado!" : "Plan deleted!");
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao eliminar plano" : "Error deleting plan");
    }
  }

  async function handleRenewPlan(newDuration: number = 30) {
    const userId = getUserId();
    if (!userId) return;
    setIsRenewing(true);
    try {
      const response = await renewPlan(userId, newDuration);
      if (response.success) {
        await loadPlan(userId);
        toast.success(language === "pt" ? "Novo plano criado!" : "New plan created!");
      } else {
        toast.error(response.error || (language === "pt" ? "Erro ao criar plano" : "Error creating plan"));
      }
    } catch (error) {
      toast.error(language === "pt" ? "Erro ao criar plano" : "Error creating plan");
    } finally {
      setIsRenewing(false);
    }
  }

  async function handleExtendPlan() {
    if (!planId) return;
    setIsExtending(true);
    try {
      const result = await extendPlan(planId);
      if (result.success) {
        const userId = getUserId();
        if (userId) {
          await loadPlan(userId);
        }
        toast.success(result.message || (language === "pt" ? "Mais 7 dias gerados!" : "7 more days generated!"));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error extending plan:", error);
      toast.error(language === "pt" ? "Erro ao gerar mais dias" : "Error generating more days");
    } finally {
      setIsExtending(false);
    }
  }

  function handleDayChange(day: number) {
    if (day >= 1 && day <= durationDays) {
      setSelectedDay(day);
    }
  }

  async function handleWorkoutComplete() {
    setShowTimer(false);
    const userId = getUserId();
    if (userId && planId) {
      try {
        await recordProgress({
          userId,
          planId,
          day: currentDay,
          difficulty: "just right"
        });
        setProgress([...progress, { day: currentDay }]);
        toast.success(language === "pt" ? "Treino concluído! Excelente trabalho!" : "Workout complete! Great job!");
        if (currentDay < durationDays) {
          setCurrentDay(currentDay + 1);
          setSelectedDay(currentDay + 1);
        }
      } catch (error) {
        toast.error(language === "pt" ? "Erro ao guardar progresso" : "Error saving progress");
      }
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground" data-testid="text-loading">{t("dashboard", "loading")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const fitnessPlan = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days;
  const planLength = fitnessPlan?.length || 15;
  const totalDays = durationDays;

  if (!planData || !fitnessPlan) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h2 className="text-2xl font-bold" data-testid="text-no-plan">{t("dashboard", "noPlan")}</h2>
          <Button onClick={() => setLocation("/onboarding")} data-testid="button-create-plan">{t("dashboard", "createPlan")}</Button>
        </div>
      </Layout>
    );
  }

  const dayIndex = ((selectedDay - 1) % planLength);
  const todaysPlan = fitnessPlan[dayIndex] || fitnessPlan[0];
  const nutritionPlan = planData.nutrition_plan_7_days || planData.nutrition_plan_3_days || [];
  const hydrationGuidelines = planData.hydration_guidelines_pt;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Expiry Banner */}
        {isExpired && (
          <Card className="bg-orange-500/20 border-orange-500/50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-orange-600" data-testid="text-plan-expired">
                    {language === "pt" ? "O seu plano terminou!" : "Your plan has ended!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt" ? "Crie um novo plano para continuar a sua jornada fitness." : "Create a new plan to continue your fitness journey."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="30" onValueChange={(v) => handleRenewPlan(parseInt(v))}>
                    <SelectTrigger className="w-32" data-testid="select-renew-duration" disabled={isRenewing}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 {language === "pt" ? "dias" : "days"}</SelectItem>
                      <SelectItem value="60">60 {language === "pt" ? "dias" : "days"}</SelectItem>
                      <SelectItem value="90">90 {language === "pt" ? "dias" : "days"}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => handleRenewPlan(30)} disabled={isRenewing} data-testid="button-renew-plan">
                    {isRenewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {language === "pt" ? "Novo Plano" : "New Plan"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Coaching Card */}
        <CoachingCard />

        {/* Day Picker */}
        <Card className="bg-card/50 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-bold">{language === "pt" ? "Navegar Dias" : "Browse Days"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleDayChange(selectedDay - 1)}
                  disabled={selectedDay <= 1}
                  data-testid="button-prev-day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                  <SelectTrigger className="w-24" data-testid="select-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {language === "pt" ? "Dia" : "Day"} {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleDayChange(selectedDay + 1)}
                  disabled={selectedDay >= totalDays}
                  data-testid="button-next-day"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  / {totalDays} {language === "pt" ? "dias" : "days"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate More Days - always show if plan can be extended */}
        {generatedWorkoutDays < 30 && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-primary" data-testid="text-extend-plan">
                    {language === "pt" ? "Queres mais 7 dias de treino?" : "Want 7 more days of training?"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "pt" 
                      ? `Tens ${generatedWorkoutDays} dias gerados. Clica para gerar os próximos 7 dias.`
                      : `You have ${generatedWorkoutDays} days generated. Click to generate the next 7 days.`}
                  </p>
                </div>
                <Button 
                  onClick={handleExtendPlan} 
                  disabled={isExtending}
                  data-testid="button-extend-plan"
                  className="whitespace-nowrap"
                >
                  {isExtending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {language === "pt" ? "A gerar..." : "Generating..."}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {language === "pt" ? "Gerar +7 Dias" : "Generate +7 Days"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {allPlans && allPlans.length > 1 && (
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-heading text-lg mb-3">{language === "pt" ? "Seus Planos" : "Your Plans"}</h3>
              <div className="flex flex-wrap gap-3">
                {allPlans.map((plan: any) => (
                  <div key={plan.id} className={`flex items-center gap-2 p-3 rounded-lg border ${plan.id === planId ? "border-primary bg-primary/10" : "border-border"}`} data-testid={`plan-card-${plan.id}`}>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {new Date(plan.createdAt).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {language === "pt" ? "Dia" : "Day"} {plan.currentDay}
                      </div>
                    </div>
                    {plan.id === planId ? (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleActivatePlan(plan.id)} data-testid={`button-activate-${plan.id}`}>
                        {language === "pt" ? "Ativar" : "Activate"}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" data-testid={`button-delete-${plan.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{language === "pt" ? "Eliminar Plano?" : "Delete Plan?"}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {language === "pt" ? "Esta ação não pode ser revertida. Todo o progresso deste plano será perdido." : "This action cannot be undone. All progress for this plan will be lost."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{language === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePlan(plan.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {language === "pt" ? "Eliminar" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase" data-testid="text-todays-focus">
              {selectedDay === currentDay ? t("dashboard", "todaysFocus") : (language === "pt" ? `Dia ${selectedDay}` : `Day ${selectedDay}`)}
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-day-info">
              {t("dashboard", "dayOf", { current: String(selectedDay), total: String(totalDays) })} • {todaysPlan.workout_name_pt}
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-primary text-primary-foreground font-bold text-lg px-8" 
            data-testid="button-start-workout"
            onClick={() => setShowTimer(true)}
          >
            <PlayCircle className="w-6 h-6 mr-2" /> {t("dashboard", "startWorkout")}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-calories">{todaysPlan.estimated_calories_burnt}</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "kcalTarget")}</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todaysPlan.duration_minutes || 45}m</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "duration")}</div>
              </div>
            </CardContent>
          </Card>
           <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-progress">{progress.length}/{totalDays}</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "daysComplete")}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workout" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="workout" data-testid="tab-workout">{t("dashboard", "todaysWorkout")}</TabsTrigger>
            <TabsTrigger value="nutrition" data-testid="tab-nutrition">{t("dashboard", "nutritionPlan")}</TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">{language === "pt" ? "Progresso" : "Progress"}</TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">{t("dashboard", "fullSchedule")}</TabsTrigger>
          </TabsList>

          <TabsContent value="workout" className="space-y-4">
             {todaysPlan.is_rest_day ? (
               <Card className="bg-card/50 border-primary/20">
                 <CardContent className="p-8 text-center">
                   <h3 className="text-xl font-heading mb-2">{language === "pt" ? "Dia de Descanso" : "Rest Day"}</h3>
                   <p className="text-muted-foreground">{language === "pt" ? "Recupere e prepare-se para o próximo treino!" : "Recover and prepare for your next workout!"}</p>
                 </CardContent>
               </Card>
             ) : (
               <>
                 {(todaysPlan.warmup_exercises?.length > 0 || todaysPlan.warmup_pt) && (
                   <div>
                     <h4 className="font-bold text-green-600 mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                       {language === "pt" ? "Aquecimento" : "Warm-up"}
                     </h4>
                     {todaysPlan.warmup_exercises?.length > 0 ? (
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {todaysPlan.warmup_exercises.map((ex: any, i: number) => {
                           return (
                             <ExerciseCard 
                               key={`warmup-${i}`} 
                               exercise={{ 
                                 name: ex.name,
                                 name_pt: ex.name_pt, 
                                 sets: 1, 
                                 reps_or_time: language === "pt" ? `${ex.duration_seconds} segundos` : `${ex.duration_seconds} seconds`,
                                 reps_or_time_pt: `${ex.duration_seconds} segundos`,
                                 focus: ex.description_pt || (language === "pt" ? "Aquecimento" : "Warm-up"),
                                 equipment_used: language === "pt" ? "Peso corporal" : "Bodyweight",
                                 equipment_used_pt: "Peso corporal"
                               }} 
                               libraryMatch={getLibraryMatch(ex)} 
                               index={i}
                               onEnrichmentComplete={handleEnrichmentComplete}
                             />
                           );
                         })}
                       </div>
                     ) : (
                       <Card className="bg-green-500/10 border-green-500/30" data-testid="card-warmup">
                         <CardContent className="p-4">
                           <p className="text-sm text-muted-foreground">{todaysPlan.warmup_pt}</p>
                         </CardContent>
                       </Card>
                     )}
                   </div>
                 )}
                 <div>
                   <h4 className="font-bold text-primary mb-3 flex items-center gap-2">
                     <span className="w-2 h-2 bg-primary rounded-full"></span>
                     {language === "pt" ? "Exercícios Principais" : "Main Exercises"}
                   </h4>
                   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {(todaysPlan.exercises || []).map((ex: any, i: number) => {
                        return (
                          <ExerciseCard 
                            key={i} 
                            exercise={{ ...ex, focus: todaysPlan.focus_pt }} 
                            libraryMatch={getLibraryMatch(ex)} 
                            index={i}
                            onEnrichmentComplete={handleEnrichmentComplete}
                          />
                        );
                      })}
                   </div>
                 </div>
                 {(todaysPlan.cooldown_exercises?.length > 0 || todaysPlan.cooldown_pt) && (
                   <div>
                     <h4 className="font-bold text-blue-600 mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                       {language === "pt" ? "Arrefecimento" : "Cool-down"}
                     </h4>
                     {todaysPlan.cooldown_exercises?.length > 0 ? (
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                         {todaysPlan.cooldown_exercises.map((ex: any, i: number) => {
                           return (
                             <ExerciseCard 
                               key={`cooldown-${i}`} 
                               exercise={{ 
                                 name: ex.name,
                                 name_pt: ex.name_pt, 
                                 sets: 1, 
                                 reps_or_time: language === "pt" ? `${ex.duration_seconds} segundos` : `${ex.duration_seconds} seconds`,
                                 reps_or_time_pt: `${ex.duration_seconds} segundos`,
                                 focus: ex.description_pt || (language === "pt" ? "Arrefecimento" : "Cool-down"),
                                 equipment_used: language === "pt" ? "Peso corporal" : "Bodyweight",
                                 equipment_used_pt: "Peso corporal"
                               }} 
                               libraryMatch={getLibraryMatch(ex)} 
                               index={i}
                               onEnrichmentComplete={handleEnrichmentComplete}
                             />
                           );
                         })}
                       </div>
                     ) : (
                       <Card className="bg-blue-500/10 border-blue-500/30" data-testid="card-cooldown">
                         <CardContent className="p-4">
                           <p className="text-sm text-muted-foreground">{todaysPlan.cooldown_pt}</p>
                         </CardContent>
                       </Card>
                     )}
                   </div>
                 )}
               </>
             )}
          </TabsContent>

          <TabsContent value="nutrition">
            {nutritionPlan.length > 0 && (() => {
              // Find nutrition day matching selected day, or use modulo for cycling
              const nutritionDayIndex = nutritionPlan.findIndex((n: any) => n.day === selectedDay);
              const selectedNutritionDay = nutritionDayIndex >= 0 
                ? nutritionPlan[nutritionDayIndex] 
                : nutritionPlan[(selectedDay - 1) % nutritionPlan.length];
              const dayIndexForMeals = nutritionDayIndex >= 0 ? nutritionDayIndex : (selectedDay - 1) % nutritionPlan.length;
              
              return (
              <>
                <div className="mb-6">
                  <Card className="bg-card/50 border-primary/20">
                    <CardContent className="p-6">
                      <h3 className="font-heading text-xl mb-4" data-testid="text-daily-targets">
                        {t("dashboard", "dailyTargets")} - {language === "pt" ? "Dia" : "Day"} {selectedDay}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-primary" data-testid="text-calorie-target">{selectedNutritionDay?.total_daily_calories}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "calories")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{hydrationGuidelines?.water_target_ml || 2500} ml</div>
                          <div className="text-xs text-muted-foreground">{language === "pt" ? "Água/dia" : "Water/day"}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{selectedNutritionDay?.total_daily_macros?.split(",")[0] || ""}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "protein")}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{selectedNutritionDay?.total_daily_macros?.split(",")[1] || ""}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "carbs")}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-end mb-4">
                  {planId && getUserId() && (
                    <AIMealBuilder
                      userId={getUserId()!}
                      planId={planId}
                      dayIndex={dayIndexForMeals}
                      defaultTargets={{
                        calories: Math.round((selectedNutritionDay?.total_daily_calories || 2000) / 5),
                        protein: 30,
                        carbs: 50,
                        fat: 15,
                      }}
                      onMealGenerated={handleAIMealGenerated}
                    />
                  )}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedNutritionDay?.meals?.map((meal: any, idx: number) => {
                    const { meal: displayMeal, isCustom, customMealId } = getMealForSlot(dayIndexForMeals, selectedNutritionDay?.meals || [], idx);
                    const userId = getUserId();
                    return (
                      <MealCard
                        key={idx}
                        meal={displayMeal}
                        index={idx}
                        dayIndex={dayIndexForMeals}
                        userId={userId || undefined}
                        planId={planId || undefined}
                        isCustomMeal={isCustom}
                        customMealId={customMealId}
                        onMealSwapped={handleMealSwapped}
                        onRevertMeal={customMealId ? handleRevertMeal : undefined}
                      />
                    );
                  })}
                </div>
              </>
            );})()}
          </TabsContent>

          <TabsContent value="progress">
            <ProgressCharts 
              progress={progress}
              planData={planData}
              currentDay={currentDay}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: totalDays }, (_, i) => {
                const dayNum = i + 1;
                const dayIdx = i % planLength;
                const dayPlan = fitnessPlan[dayIdx];
                // Find nutrition day for this specific day
                const nutritionIdx = nutritionPlan.findIndex((n: any) => n.day === dayNum);
                const dayNutrition = nutritionIdx >= 0 
                  ? nutritionPlan[nutritionIdx] 
                  : nutritionPlan[(dayNum - 1) % nutritionPlan.length];
                const dayData = {
                  day: dayNum,
                  workout_name: dayPlan?.workout_name_pt || "",
                  estimated_calories_burnt: dayPlan?.estimated_calories_burnt || 0,
                  exercises: dayPlan?.exercises || [],
                  meals: dayNutrition?.meals || [],
                };
                const isCompleted = progress.some(p => p.day === dayNum);
                return (
                  <div 
                    key={dayNum} 
                    className="cursor-pointer" 
                    onClick={() => setSelectedDay(dayNum)}
                  >
                    <DayCard 
                      day={dayData} 
                      isActive={dayNum === selectedDay}
                      isCompleted={isCompleted}
                    />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <WorkoutTimer
        exercises={todaysPlan.exercises}
        exerciseLibrary={exerciseLibrary}
        exerciseLibraryById={exerciseLibraryById}
        warmupExercises={todaysPlan.warmup_exercises || []}
        cooldownExercises={todaysPlan.cooldown_exercises || []}
        open={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleWorkoutComplete}
      />
    </Layout>
  );
}

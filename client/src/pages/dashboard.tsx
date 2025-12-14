import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import DayCard from "@/components/DayCard";
import WorkoutTimer from "@/components/WorkoutTimer";
import ProgressCharts from "@/components/ProgressCharts";
import ExerciseCard from "@/components/ExerciseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Flame, Clock, Trophy, Loader2 } from "lucide-react";
import healthyMealImage from "@assets/generated_images/healthy_meal_prep_with_vibrant_vegetables.png";
import { getUserPlan, getUserId, recordProgress, matchExercises } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [planData, setPlanData] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<any[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<Record<string, any>>({});
  const latestDayRef = useRef<number>(1);
  const { t, language } = useTranslation();

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    loadPlan(userId);
  }, []);

  useEffect(() => {
    const fitnessPlanData = planData?.fitness_plan_15_days || planData?.fitness_plan_7_days;
    if (fitnessPlanData) {
      latestDayRef.current = currentDay;
      loadExerciseMatches(currentDay);
    }
  }, [currentDay, planData]);

  async function loadExerciseMatches(day: number) {
    const fitnessPlanData = planData?.fitness_plan_15_days || planData?.fitness_plan_7_days;
    const planLength = fitnessPlanData?.length || 15;
    const dayIndex = ((day - 1) % planLength);
    const todaysPlan = fitnessPlanData?.[dayIndex] || fitnessPlanData?.[0];
    if (todaysPlan?.exercises) {
      const exerciseNames = todaysPlan.exercises.map((ex: any) => ex.name || ex.name_pt);
      try {
        const matchResult = await matchExercises(exerciseNames);
        if (matchResult.success && day === latestDayRef.current) {
          setExerciseLibrary(matchResult.exercises);
        }
      } catch (e) {
        console.error("Error matching exercises:", e);
      }
    }
  }

  async function loadPlan(userId: number) {
    try {
      const response = await getUserPlan(userId);
      if (response.success) {
        setPlanData(response.plan);
        setCurrentDay(response.currentDay);
        setPlanId(response.planId);
        setProgress(response.progress || []);
      } else {
        toast.error(t("dashboard", "loadFailed"));
        setLocation("/onboarding");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      toast.error(t("dashboard", "errorLoading"));
    } finally {
      setIsLoading(false);
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
        const fitnessPlanData = planData?.fitness_plan_15_days || planData?.fitness_plan_7_days;
        const planLength = fitnessPlanData?.length || 15;
        if (currentDay < planLength) {
          setCurrentDay(currentDay + 1);
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

  const fitnessPlan = planData?.fitness_plan_15_days || planData?.fitness_plan_7_days;
  const totalDays = fitnessPlan?.length || 15;

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

  const dayIndex = ((currentDay - 1) % totalDays);
  const todaysPlan = fitnessPlan[dayIndex] || fitnessPlan[0];
  const nutritionPlan = planData.nutrition_plan_7_days || planData.nutrition_plan_3_days || [];
  const hydrationGuidelines = planData.hydration_guidelines_pt;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase" data-testid="text-todays-focus">{t("dashboard", "todaysFocus")}</h1>
            <p className="text-muted-foreground mt-2" data-testid="text-day-info">
              {t("dashboard", "dayOf", { current: String(currentDay), total: String(totalDays) })} • {todaysPlan.workout_name_pt}
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
                <div className="text-2xl font-bold">45m</div>
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
                 {todaysPlan.warmup_pt && (
                   <Card className="bg-green-500/10 border-green-500/30" data-testid="card-warmup">
                     <CardContent className="p-4">
                       <h4 className="font-bold text-green-600 mb-2">{language === "pt" ? "Aquecimento" : "Warm-up"}</h4>
                       <p className="text-sm text-muted-foreground">{todaysPlan.warmup_pt}</p>
                     </CardContent>
                   </Card>
                 )}
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(todaysPlan.exercises || []).map((ex: any, i: number) => {
                      const exerciseKey = ex.name || ex.name_pt;
                      return (
                        <ExerciseCard 
                          key={i} 
                          exercise={{ ...ex, focus: todaysPlan.focus_pt }} 
                          libraryMatch={exerciseLibrary[exerciseKey]} 
                          index={i} 
                        />
                      );
                    })}
                 </div>
                 {todaysPlan.cooldown_pt && (
                   <Card className="bg-blue-500/10 border-blue-500/30" data-testid="card-cooldown">
                     <CardContent className="p-4">
                       <h4 className="font-bold text-blue-600 mb-2">{language === "pt" ? "Arrefecimento" : "Cool-down"}</h4>
                       <p className="text-sm text-muted-foreground">{todaysPlan.cooldown_pt}</p>
                     </CardContent>
                   </Card>
                 )}
               </>
             )}
          </TabsContent>

          <TabsContent value="nutrition">
            {nutritionPlan.length > 0 && (
              <>
                <div className="mb-6">
                  <Card className="bg-card/50 border-primary/20">
                    <CardContent className="p-6">
                      <h3 className="font-heading text-xl mb-4" data-testid="text-daily-targets">{t("dashboard", "dailyTargets")}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-2xl font-bold text-primary" data-testid="text-calorie-target">{nutritionPlan[0]?.total_daily_calories}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "calories")}</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{hydrationGuidelines?.water_target_ml || 2500} ml</div>
                          <div className="text-xs text-muted-foreground">{language === "pt" ? "Água/dia" : "Water/day"}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{nutritionPlan[0]?.total_daily_macros?.split(",")[0] || ""}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "protein")}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{nutritionPlan[0]?.total_daily_macros?.split(",")[1] || ""}</div>
                          <div className="text-xs text-muted-foreground">{t("dashboard", "carbs")}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {nutritionPlan[0]?.meals?.map((meal: any, idx: number) => (
                     <Card key={idx} className="overflow-hidden" data-testid={`card-recipe-${idx}`}>
                       <div className="h-32 bg-muted relative">
                         <img src={healthyMealImage} alt="Meal" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                           <h3 className="text-lg font-heading font-bold text-white capitalize">{meal.meal_time_pt}</h3>
                         </div>
                       </div>
                       <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-sm">{meal.description_pt}</h4>
                            <span className="text-primary font-bold text-sm">{meal.calories} kcal</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-muted p-2 rounded">
                              <div className="text-xs text-muted-foreground">PRO</div>
                              <div className="font-bold text-sm">{meal.protein_g}g</div>
                            </div>
                             <div className="bg-muted p-2 rounded">
                              <div className="text-xs text-muted-foreground">CARB</div>
                              <div className="font-bold text-sm">{meal.carbs_g}g</div>
                            </div>
                             <div className="bg-muted p-2 rounded">
                              <div className="text-xs text-muted-foreground">FAT</div>
                              <div className="font-bold text-sm">{meal.fat_g}g</div>
                            </div>
                          </div>

                          <div>
                            <h5 className="font-bold mb-1 text-xs uppercase text-muted-foreground">{t("dashboard", "ingredients")}</h5>
                            <p className="text-xs">{meal.main_ingredients_pt}</p>
                          </div>
                       </CardContent>
                     </Card>
                   ))}
                </div>
              </>
            )}
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
              {fitnessPlan.map((day: any) => {
                const dayData = {
                  day: day.day,
                  workout_name: day.workout_name_pt,
                  estimated_calories_burnt: day.estimated_calories_burnt,
                  exercises: day.exercises,
                  meals: nutritionPlan[0]?.meals || [],
                };
                return (
                  <DayCard key={day.day} day={dayData} isActive={day.day === currentDay} />
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <WorkoutTimer
        exercises={todaysPlan.exercises}
        open={showTimer}
        onClose={() => setShowTimer(false)}
        onComplete={handleWorkoutComplete}
      />
    </Layout>
  );
}

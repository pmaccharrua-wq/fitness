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
    if (planData?.fitness_plan_30_days) {
      latestDayRef.current = currentDay;
      loadExerciseMatches(currentDay);
    }
  }, [currentDay, planData]);

  async function loadExerciseMatches(day: number) {
    const todaysPlan = planData?.fitness_plan_30_days[day - 1] || planData?.fitness_plan_30_days[0];
    if (todaysPlan?.exercises) {
      const exerciseNames = todaysPlan.exercises.map((ex: any) => ex.name);
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
        if (currentDay < 30) {
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

  if (!planData || !planData.fitness_plan_30_days) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h2 className="text-2xl font-bold" data-testid="text-no-plan">{t("dashboard", "noPlan")}</h2>
          <Button onClick={() => setLocation("/onboarding")} data-testid="button-create-plan">{t("dashboard", "createPlan")}</Button>
        </div>
      </Layout>
    );
  }

  const todaysPlan = planData.fitness_plan_30_days[currentDay - 1] || planData.fitness_plan_30_days[0];
  const nutritionGuidelines = planData.nutrition_guidelines;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase" data-testid="text-todays-focus">{t("dashboard", "todaysFocus")}</h1>
            <p className="text-muted-foreground mt-2" data-testid="text-day-info">
              {t("dashboard", "dayOf", { current: String(currentDay), total: "30" })} • {todaysPlan.workout_name}
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
                <div className="text-2xl font-bold" data-testid="text-progress">{progress.length}/30</div>
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
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {todaysPlan.exercises.map((ex: any, i: number) => (
                  <ExerciseCard 
                    key={i} 
                    exercise={ex} 
                    libraryMatch={exerciseLibrary[ex.name]} 
                    index={i} 
                  />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="nutrition">
            <div className="mb-6">
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-heading text-xl mb-4" data-testid="text-daily-targets">{t("dashboard", "dailyTargets")}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-primary" data-testid="text-calorie-target">{nutritionGuidelines.daily_calorie_target}</div>
                      <div className="text-xs text-muted-foreground">{t("dashboard", "calories")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.protein_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{t("dashboard", "protein")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.carbs_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{t("dashboard", "carbs")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.fat_percentage}%</div>
                      <div className="text-xs text-muted-foreground">{t("dashboard", "fat")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {nutritionGuidelines.sample_recipes.map((recipe: any, idx: number) => (
                 <Card key={idx} className="overflow-hidden" data-testid={`card-recipe-${idx}`}>
                   <div className="h-32 bg-muted relative">
                     <img src={healthyMealImage} alt="Meal" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                       <h3 className="text-lg font-heading font-bold text-white capitalize">{recipe.meal}</h3>
                     </div>
                   </div>
                   <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-sm">{recipe.description}</h4>
                        <span className="text-primary font-bold text-sm">{recipe.calories} kcal</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground">PRO</div>
                          <div className="font-bold text-sm">{recipe.macros.protein}</div>
                        </div>
                         <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground">CARB</div>
                          <div className="font-bold text-sm">{recipe.macros.carbs}</div>
                        </div>
                         <div className="bg-muted p-2 rounded">
                          <div className="text-xs text-muted-foreground">FAT</div>
                          <div className="font-bold text-sm">{recipe.macros.fat}</div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-bold mb-1 text-xs uppercase text-muted-foreground">{t("dashboard", "ingredients")}</h5>
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                          {recipe.ingredients.map((ing: string) => (
                            <li key={ing}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                   </CardContent>
                 </Card>
               ))}
            </div>
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
              {planData.fitness_plan_30_days.map((day: any) => {
                const dayData = {
                  day: day.day,
                  workout_name: day.workout_name,
                  estimated_calories_burnt: day.estimated_calories_burnt,
                  exercises: day.exercises,
                  meals: nutritionGuidelines.sample_recipes,
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

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import DayCard from "@/components/DayCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Flame, Clock, Trophy, Loader2 } from "lucide-react";
import healthyMealImage from "@assets/generated_images/healthy_meal_prep_with_vibrant_vegetables.png";
import { getUserPlan, getUserId, recordProgress } from "@/lib/api";
import { toast } from "sonner";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [planData, setPlanData] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [planId, setPlanId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLocation("/onboarding");
      return;
    }

    loadPlan(userId);
  }, []);

  async function loadPlan(userId: number) {
    try {
      const response = await getUserPlan(userId);
      if (response.success) {
        setPlanData(response.plan);
        setCurrentDay(response.currentDay);
        setPlanId(response.planId);
        setProgress(response.progress || []);
      } else {
        toast.error("Failed to load your plan");
        setLocation("/onboarding");
      }
    } catch (error) {
      console.error("Error loading plan:", error);
      toast.error("An error occurred loading your plan");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading your personalized plan...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!planData || !planData.fitness_plan_30_days) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h2 className="text-2xl font-bold">No plan found</h2>
          <Button onClick={() => setLocation("/onboarding")}>Create Your Plan</Button>
        </div>
      </Layout>
    );
  }

  const todaysPlan = planData.fitness_plan_30_days[currentDay - 1] || planData.fitness_plan_30_days[0];
  const nutritionGuidelines = planData.nutrition_guidelines;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase">Today's Focus</h1>
            <p className="text-muted-foreground mt-2">Day {currentDay} of 30 • {todaysPlan.workout_name}</p>
          </div>
          <Button size="lg" className="bg-primary text-primary-foreground font-bold text-lg px-8">
            <PlayCircle className="w-6 h-6 mr-2" /> Start Workout
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{todaysPlan.estimated_calories_burnt}</div>
                <div className="text-xs text-muted-foreground uppercase">Kcal Target</div>
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
                <div className="text-xs text-muted-foreground uppercase">Duration</div>
              </div>
            </CardContent>
          </Card>
           <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{progress.length}/30</div>
                <div className="text-xs text-muted-foreground uppercase">Days Complete</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="workout" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="workout">Today's Workout</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition Plan</TabsTrigger>
            <TabsTrigger value="schedule">Full 30-Day Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="workout" className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {todaysPlan.exercises.map((ex: any, i: number) => (
                  <Card key={i} className="hover:border-primary transition-colors">
                    <CardHeader>
                      <CardTitle className="text-lg">{ex.name}</CardTitle>
                      <div className="text-sm text-primary font-medium">{ex.focus}</div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Sets</span>
                        <span className="font-bold">{ex.sets}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Reps/Time</span>
                        <span className="font-bold">{ex.reps_or_time}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Equipment</span>
                         <span className="font-bold">{ex.equipment_used}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>

          <TabsContent value="nutrition">
            <div className="mb-6">
              <Card className="bg-card/50 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-heading text-xl mb-4">Daily Targets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-primary">{nutritionGuidelines.daily_calorie_target}</div>
                      <div className="text-xs text-muted-foreground">Calories</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.protein_percentage}%</div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.carbs_percentage}%</div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{nutritionGuidelines.macros.fat_percentage}%</div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {nutritionGuidelines.sample_recipes.map((recipe: any, idx: number) => (
                 <Card key={idx} className="overflow-hidden">
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
                        <h5 className="font-bold mb-1 text-xs uppercase text-muted-foreground">Ingredients</h5>
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
    </Layout>
  );
}

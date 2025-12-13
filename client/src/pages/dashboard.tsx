import Layout from "@/components/Layout";
import DayCard from "@/components/DayCard";
import { mockPlan } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayCircle, Flame, Clock, Trophy } from "lucide-react";
import healthyMealImage from "@assets/generated_images/healthy_meal_prep_with_vibrant_vegetables.png";

export default function Dashboard() {
  const currentDay = mockPlan[0]; // Day 1

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase">Today's Focus</h1>
            <p className="text-muted-foreground mt-2">Day 1 of 30 • {currentDay.workout_name}</p>
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
                <div className="text-2xl font-bold">450</div>
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
                <div className="text-2xl font-bold">1/30</div>
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
                {currentDay.exercises.map((ex, i) => (
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
            <div className="grid md:grid-cols-2 gap-8">
               <Card className="overflow-hidden">
                 <div className="h-48 bg-muted relative">
                   <img src={healthyMealImage} alt="Meal" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                     <h3 className="text-2xl font-heading font-bold text-white">Lunch Recommendation</h3>
                   </div>
                 </div>
                 <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-bold">{currentDay.meals[0].description}</h4>
                      <span className="text-primary font-bold">{currentDay.meals[0].calories} kcal</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted p-2 rounded">
                        <div className="text-xs text-muted-foreground">PRO</div>
                        <div className="font-bold">{currentDay.meals[0].macros.protein}</div>
                      </div>
                       <div className="bg-muted p-2 rounded">
                        <div className="text-xs text-muted-foreground">CARB</div>
                        <div className="font-bold">{currentDay.meals[0].macros.carbs}</div>
                      </div>
                       <div className="bg-muted p-2 rounded">
                        <div className="text-xs text-muted-foreground">FAT</div>
                        <div className="font-bold">{currentDay.meals[0].macros.fat}</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-bold mb-2 text-sm uppercase text-muted-foreground">Ingredients</h5>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {currentDay.meals[0].ingredients.map(ing => (
                          <li key={ing}>{ing}</li>
                        ))}
                      </ul>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {mockPlan.map((day) => (
                <DayCard key={day.day} day={day} isActive={day.day === 1} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

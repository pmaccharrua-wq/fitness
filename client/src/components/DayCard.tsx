import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPlan } from "@/lib/mockData";
import { Dumbbell, Utensils, Flame, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayCardProps {
  day: DayPlan;
  isActive?: boolean;
}

export default function DayCard({ day, isActive }: DayCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className={cn(
        "h-full overflow-hidden border-2 transition-colors duration-300",
        isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
      )}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
              isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              Day {day.day}
            </span>
            {isActive && <CheckCircle2 className="w-5 h-5 text-primary animate-pulse" />}
          </div>
          <CardTitle className="text-lg leading-tight mt-2">{day.workout_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>{day.estimated_calories_burnt} kcal</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span>{day.exercises.length} Exercises</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <Utensils className="w-4 h-4 text-primary" />
              <span>{day.meals.length} Meals</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

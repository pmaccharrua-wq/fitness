import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Dumbbell, Bed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ProgressRecord {
  day: number;
  completedAt?: string;
}

interface WeeklyCalendarStripProps {
  startDate: string | Date;
  durationDays: number;
  progress: ProgressRecord[];
  planData: any;
  currentDay: number;
  onDayClick?: (day: number) => void;
}

export default function WeeklyCalendarStrip({
  startDate,
  durationDays,
  progress,
  planData,
  currentDay,
  onDayClick
}: WeeklyCalendarStripProps) {
  const { language } = useTranslation();
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;
  
  const start = useMemo(() => new Date(startDate), [startDate]);
  const fitnessPlan = planData?.fitness_plan_7_days || planData?.fitness_plan_15_days || [];
  const planLength = fitnessPlan.length;
  
  // Don't render if we don't have valid plan data
  if (!planData || planLength === 0) {
    return null;
  }

  const completedDays = useMemo(() => {
    return new Set(progress.map(p => p.day));
  }, [progress]);

  const getDayPlan = (planDay: number) => {
    const dayIndex = (planDay - 1) % planLength;
    return fitnessPlan[dayIndex];
  };

  const isRestDay = (planDay: number) => {
    const dayPlan = getDayPlan(planDay);
    return dayPlan?.is_rest_day || false;
  };

  const weekDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentWeekStart = Math.max(1, currentDay - 3);
    const currentWeekEnd = Math.min(durationDays, currentWeekStart + 6);
    
    for (let planDay = currentWeekStart; planDay <= currentWeekEnd; planDay++) {
      const dayDate = new Date(start);
      dayDate.setDate(dayDate.getDate() + planDay - 1);
      dayDate.setHours(0, 0, 0, 0);
      
      const isToday = planDay === currentDay;
      const restDay = isRestDay(planDay);
      const isCompleted = completedDays.has(planDay);
      const isPast = planDay < currentDay;
      
      let status: "completed" | "missed" | "rest" | "today" | "upcoming" = "upcoming";
      
      if (isCompleted) {
        status = "completed";
      } else if (restDay) {
        status = "rest";
      } else if (isToday) {
        status = "today";
      } else if (isPast) {
        status = "missed";
      }

      const dayNames = language === "pt"
        ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      days.push({
        planDay,
        date: dayDate,
        dayName: dayNames[dayDate.getDay()],
        dayOfMonth: dayDate.getDate(),
        status,
        isToday,
        isRestDay: restDay,
        workoutName: getDayPlan(planDay)?.workout_name_pt || ""
      });
    }
    
    return days;
  }, [start, currentDay, durationDays, completedDays, planLength, fitnessPlan, language]);

  const getStatusIcon = (status: string, isRest: boolean) => {
    if (isRest) return <Bed className="w-4 h-4" />;
    switch (status) {
      case "completed":
        return <Check className="w-4 h-4" />;
      case "missed":
        return <X className="w-4 h-4" />;
      default:
        return <Dumbbell className="w-4 h-4" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/50";
      case "missed":
        return "bg-red-500/20 text-red-500 border-red-500/50";
      case "rest":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "today":
        return "bg-primary text-primary-foreground border-primary";
      case "upcoming":
        return "bg-muted text-muted-foreground border-muted-foreground/30";
      default:
        return "";
    }
  };

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-sm">
            {txt("Esta Semana", "This Week")}
          </h3>
          <span className="text-xs text-muted-foreground">
            {txt("Dia", "Day")} {currentDay}/{durationDays}
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <button
              key={day.planDay}
              onClick={() => onDayClick?.(day.planDay)}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg border transition-all",
                "hover:scale-105",
                getStatusClass(day.status),
                day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              data-testid={`week-day-${day.planDay}`}
            >
              <span className="text-[10px] font-medium uppercase">{day.dayName}</span>
              <span className="text-lg font-bold">{day.dayOfMonth}</span>
              {getStatusIcon(day.status, day.isRestDay)}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground justify-center">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-green-500" /> {txt("Feito", "Done")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-red-500" /> {txt("Falhado", "Missed")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-blue-400" /> {txt("Descanso", "Rest")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

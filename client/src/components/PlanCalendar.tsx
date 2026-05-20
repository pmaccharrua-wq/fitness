import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Dumbbell, Bed, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface ProgressRecord {
  day: number;
  completedAt?: string;
}

interface PlanCalendarProps {
  startDate: string | Date;
  durationDays: number;
  progress: ProgressRecord[];
  planData: any;
  currentDay: number;
  onDayClick?: (day: number) => void;
}

type DayStatus = "completed" | "missed" | "rest" | "upcoming" | "today" | "outside";

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  planDay: number | null;
  isRestDay: boolean;
  status: DayStatus;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export default function PlanCalendar({
  startDate,
  durationDays,
  progress,
  planData,
  currentDay,
  onDayClick
}: PlanCalendarProps) {
  const { language } = useTranslation();
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;
  
  const start = useMemo(() => {
    if (typeof startDate === "string") {
      const m = startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    const d = new Date(startDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, [startDate]);
  const [viewMonth, setViewMonth] = useState(() => {
    let planStart: Date;
    if (typeof startDate === "string") {
      const m = startDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      planStart = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(startDate);
    } else {
      planStart = new Date(startDate);
    }
    return new Date(planStart.getFullYear(), planStart.getMonth(), 1);
  });

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

  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekDay = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = startWeekDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        planDay: null,
        isRestDay: false,
        status: "outside",
        isCurrentMonth: false,
        isToday: false
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      date.setHours(0, 0, 0, 0);
      
      const startNorm = new Date(start);
      startNorm.setHours(0, 0, 0, 0);
      
      const diffTime = date.getTime() - startNorm.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const planDay = diffDays >= 0 && diffDays < durationDays ? diffDays + 1 : null;
      
      const isToday = date.getTime() === today.getTime();
      let status: DayStatus = "outside";
      let restDay = false;

      if (planDay !== null) {
        restDay = isRestDay(planDay);
        
        if (completedDays.has(planDay)) {
          status = "completed";
        } else if (restDay) {
          status = "rest";
        } else if (isToday) {
          status = "today";
        } else if (date < today) {
          status = "missed";
        } else {
          status = "upcoming";
        }
      }

      days.push({
        date,
        dayOfMonth: d,
        planDay,
        isRestDay: restDay,
        status,
        isCurrentMonth: true,
        isToday
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        planDay: null,
        isRestDay: false,
        status: "outside",
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  }, [viewMonth, start, durationDays, completedDays, planLength, fitnessPlan]);

  const weekDays = language === "pt" 
    ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const monthNames = language === "pt"
    ? ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const getStatusIcon = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.planDay === null) return null;
    
    switch (day.status) {
      case "completed":
        return <Check className="w-3 h-3 text-green-500" />;
      case "missed":
        return <X className="w-3 h-3 text-red-500" />;
      case "rest":
        return <Bed className="w-3 h-3 text-blue-400" />;
      case "today":
      case "upcoming":
        return <Dumbbell className="w-3 h-3 text-primary" />;
      default:
        return null;
    }
  };

  const getStatusClass = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return "text-muted-foreground/30";
    if (day.planDay === null) return "text-muted-foreground/50";
    
    switch (day.status) {
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/50";
      case "missed":
        return "bg-red-500/20 text-red-500 border-red-500/50";
      case "rest":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "today":
        return "bg-primary/20 text-primary border-primary ring-2 ring-primary";
      case "upcoming":
        return "bg-muted text-foreground border-muted-foreground/30";
      default:
        return "";
    }
  };

  const completedCount = Array.from(completedDays).length;
  const totalWorkoutDays = Array.from({ length: durationDays }, (_, i) => i + 1)
    .filter(d => !isRestDay(d)).length;

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {txt("Calendário do Plano", "Plan Calendar")}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="button-prev-month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="button-next-month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
            {txt("Concluído", "Completed")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
            {txt("Falhado", "Missed")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500/10 border border-blue-500/30" />
            {txt("Descanso", "Rest")}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/20 border border-primary" />
            {txt("Hoje", "Today")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => (
            <button
              key={i}
              onClick={() => day.planDay && onDayClick?.(day.planDay)}
              disabled={!day.planDay}
              className={cn(
                "aspect-square p-1 rounded-lg border text-sm font-medium transition-all",
                "flex flex-col items-center justify-center gap-0.5",
                "hover:scale-105 disabled:hover:scale-100",
                getStatusClass(day),
                day.planDay && "cursor-pointer"
              )}
              data-testid={`calendar-day-${day.dayOfMonth}`}
            >
              <span>{day.dayOfMonth}</span>
              {getStatusIcon(day)}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {txt("Progresso", "Progress")}: <span className="font-bold text-primary">{completedCount}/{totalWorkoutDays}</span> {txt("treinos", "workouts")}
          </span>
          <span className="text-muted-foreground">
            {txt("Dia atual", "Current day")}: <span className="font-bold text-foreground">{currentDay}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

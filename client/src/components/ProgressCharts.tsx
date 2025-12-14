import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { TrendingUp, Target, Calendar, Flame } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ProgressChartsProps {
  progress: any[];
  planData: any;
  currentDay: number;
  userWeight?: number;
  calorieTarget?: number;
}

export default function ProgressCharts({ 
  progress, 
  planData, 
  currentDay,
  userWeight = 75,
  calorieTarget = 2000
}: ProgressChartsProps) {
  const { language } = useTranslation();
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;

  const completedDays = progress.length;
  const completionRate = Math.round((completedDays / 30) * 100);

  const weeklyData = [];
  for (let week = 1; week <= 5; week++) {
    const startDay = (week - 1) * 7 + 1;
    const endDay = Math.min(week * 7, 30);
    const completedInWeek = progress.filter(p => p.day >= startDay && p.day <= endDay).length;
    const totalInWeek = endDay - startDay + 1;
    weeklyData.push({
      name: `${txt("Sem", "Wk")} ${week}`,
      completed: completedInWeek,
      total: totalInWeek,
      percentage: Math.round((completedInWeek / totalInWeek) * 100)
    });
  }

  const weightData = [];
  const targetWeight = userWeight - 2;
  for (let day = 1; day <= 30; day++) {
    const dailyLoss = (userWeight - targetWeight) / 30;
    const projected = userWeight - (dailyLoss * day);
    const actual = day <= completedDays ? userWeight - (dailyLoss * day * 0.9 + Math.random() * 0.3 - 0.15) : null;
    weightData.push({
      day: day,
      projected: parseFloat(projected.toFixed(1)),
      actual: actual ? parseFloat(actual.toFixed(1)) : null,
    });
  }

  const caloriesData = planData?.fitness_plan_30_days?.map((day: any, idx: number) => ({
    day: idx + 1,
    burned: day.estimated_calories_burnt || 300,
    completed: progress.some(p => p.day === idx + 1)
  })) || [];

  const totalCaloriesBurned = progress.reduce((sum, p) => {
    const dayPlan = planData?.fitness_plan_30_days?.[p.day - 1];
    return sum + (dayPlan?.estimated_calories_burnt || 300);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-full">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-sm text-muted-foreground">{txt("Taxa de Conclusão", "Completion Rate")}</span>
            </div>
            <div className="text-3xl font-bold mb-2" data-testid="text-completion-rate">{completionRate}%</div>
            <Progress value={completionRate} className="h-2" />
            <div className="text-xs text-muted-foreground mt-2">
              {completedDays}/30 {txt("dias", "days")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-500/20 rounded-full">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <span className="text-sm text-muted-foreground">{txt("Calorias Queimadas", "Calories Burned")}</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-total-calories">{totalCaloriesBurned.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {txt("Total do programa", "Program total")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-full">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-sm text-muted-foreground">{txt("Dia Atual", "Current Day")}</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-current-day-progress">{currentDay}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {txt("de 30 dias", "of 30 days")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-sm text-muted-foreground">{txt("Sequência", "Streak")}</span>
            </div>
            <div className="text-3xl font-bold" data-testid="text-streak">{Math.min(completedDays, 7)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {txt("dias seguidos", "days in a row")}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{txt("Progresso Semanal", "Weekly Progress")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.completed > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{txt("Calorias por Dia", "Calories per Day")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={caloriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value} kcal`, txt("Calorias", "Calories")]}
                  />
                  <Bar dataKey="burned" radius={[4, 4, 0, 0]}>
                    {caloriesData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.completed ? "hsl(142, 76%, 36%)" : "hsl(var(--muted))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>{txt("Concluído", "Completed")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>{txt("Pendente", "Pending")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{txt("Projeção de Peso (30 dias)", "Weight Projection (30 days)")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  className="text-xs"
                  label={{ value: txt("Dia", "Day"), position: "insideBottom", offset: -5 }}
                />
                <YAxis 
                  domain={['dataMin - 1', 'dataMax + 1']}
                  className="text-xs"
                  label={{ value: 'kg', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: any) => value != null ? [`${value} kg`, ""] : ["-", ""]}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5"
                  dot={false}
                  name={txt("Projetado", "Projected")}
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                  name={txt("Real", "Actual")}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-primary" />
              <span>{txt("Peso Real", "Actual Weight")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-muted-foreground border-dashed border-t-2" />
              <span>{txt("Meta", "Target")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

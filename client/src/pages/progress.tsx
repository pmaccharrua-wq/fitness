import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import ProgressCharts from "@/components/ProgressCharts";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getUserPlan, getUserId } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

export default function Progress() {
  const [, setLocation] = useLocation();
  const [planData, setPlanData] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<any[]>([]);
  const { t, language } = useTranslation();

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
      const planResponse = await getUserPlan(userId);
      if (planResponse.success) {
        setPlanData(planResponse.plan);
        setCurrentDay(planResponse.currentDay);
        setProgress(planResponse.progress || []);
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

  if (!planData) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h2 className="text-2xl font-bold" data-testid="text-no-plan">{t("dashboard", "noPlan")}</h2>
          <Button onClick={() => setLocation("/onboarding")} data-testid="button-create-plan">{t("dashboard", "createPlan")}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-heading font-bold uppercase" data-testid="text-progress-title">
            {language === "pt" ? "Meu Progresso" : "My Progress"}
          </h1>
          <p className="text-muted-foreground mt-2" data-testid="text-progress-subtitle">
            {language === "pt" ? "Acompanhe sua evolução ao longo do programa" : "Track your evolution throughout the program"}
          </p>
        </div>

        <ProgressCharts 
          progress={progress}
          planData={planData}
          currentDay={currentDay}
        />
      </div>
    </Layout>
  );
}

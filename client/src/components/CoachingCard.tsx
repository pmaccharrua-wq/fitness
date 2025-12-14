import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, Flame, RefreshCw, Loader2 } from "lucide-react";
import { getCoachingTips, getUserId, type CoachingTipsResponse } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export default function CoachingCard() {
  const [coaching, setCoaching] = useState<CoachingTipsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { language } = useTranslation();

  async function loadCoachingTips() {
    const userId = getUserId();
    if (!userId) return;
    
    try {
      const response = await getCoachingTips(userId);
      if (response.success) {
        setCoaching(response);
      }
    } catch (error) {
      console.error("Error loading coaching tips:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadCoachingTips();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadCoachingTips();
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-6 flex items-center justify-center min-h-[120px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!coaching) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 border-primary/20 overflow-hidden relative" data-testid="card-coaching">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-full">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg" data-testid="text-coaching-title">
              {language === "pt" ? "O Teu Coach" : "Your Coach"}
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
            data-testid="button-refresh-coaching"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={coaching.motivationalMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground leading-relaxed" data-testid="text-motivational-message">
                {coaching.motivationalMessage}
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg border border-border/50">
              <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground" data-testid="text-coaching-tip">
                {coaching.coachingTip}
              </p>
            </div>

            {coaching.streakMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20"
              >
                <Flame className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <p className="text-sm font-medium text-orange-600" data-testid="text-streak-message">
                  {coaching.streakMessage}
                </p>
              </motion.div>
            )}

            <div className="flex items-center gap-4 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {language === "pt" ? "Progresso:" : "Progress:"}
                </span>
                <span className="text-sm font-bold text-primary" data-testid="text-progress-percent">
                  {coaching.progressPercentage}%
                </span>
              </div>
              {coaching.currentStreak > 0 && (
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium" data-testid="text-streak-count">
                    {coaching.currentStreak} {language === "pt" ? "dias" : "days"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

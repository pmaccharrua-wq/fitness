import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipForward, ChevronRight, CheckCircle2, X, Timer } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Exercise {
  name: string;
  sets: number;
  reps_or_time: string;
  focus: string;
  equipment_used: string;
}

interface WorkoutTimerProps {
  exercises: Exercise[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function WorkoutTimer({ exercises, open, onClose, onComplete }: WorkoutTimerProps) {
  const { t, language } = useTranslation();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  
  const currentExercise = exercises[currentExerciseIndex];
  const totalExercises = exercises.length;
  const progressPercent = ((currentExerciseIndex + 1) / totalExercises) * 100;
  
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && !isResting) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isResting]);

  useEffect(() => {
    let restInterval: NodeJS.Timeout;
    if (isResting && restSeconds > 0) {
      restInterval = setInterval(() => {
        setRestSeconds((s) => {
          if (s <= 1) {
            setIsResting(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restInterval);
  }, [isResting, restSeconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNextSet = useCallback(() => {
    if (currentSet < currentExercise.sets) {
      setCurrentSet((s) => s + 1);
      setIsResting(true);
      setRestSeconds(60);
    } else {
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex((i) => i + 1);
        setCurrentSet(1);
        setIsResting(true);
        setRestSeconds(90);
      } else {
        setIsRunning(false);
        onComplete();
      }
    }
  }, [currentSet, currentExercise, currentExerciseIndex, totalExercises, onComplete]);

  const handleSkipExercise = useCallback(() => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((i) => i + 1);
      setCurrentSet(1);
      setSeconds(0);
    } else {
      setIsRunning(false);
      onComplete();
    }
  }, [currentExerciseIndex, totalExercises, onComplete]);

  const handleClose = () => {
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setSeconds(0);
    setIsRunning(false);
    setIsResting(false);
    onClose();
  };

  if (!currentExercise) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Timer className="w-6 h-6 text-primary" />
              {txt("Treino em Progresso", "Workout in Progress")}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            {txt("Temporizador de treino ativo", "Active workout timer")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              {txt("Exercício", "Exercise")} {currentExerciseIndex + 1}/{totalExercises}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {isResting ? (
            <div className="text-center space-y-4">
              <div className="text-lg font-medium text-muted-foreground">
                {txt("Descanso", "Rest")}
              </div>
              <div className="text-7xl font-mono font-bold text-primary" data-testid="text-rest-timer">
                {formatTime(restSeconds)}
              </div>
              <p className="text-sm text-muted-foreground">
                {txt("Próximo: ", "Next: ")}
                {currentSet <= currentExercise.sets 
                  ? `${currentExercise.name} - ${txt("Série", "Set")} ${currentSet}`
                  : exercises[currentExerciseIndex + 1]?.name || txt("Concluído!", "Complete!")
                }
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsResting(false);
                  setRestSeconds(0);
                }}
                data-testid="button-skip-rest"
              >
                {txt("Saltar Descanso", "Skip Rest")}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-heading font-bold" data-testid="text-exercise-name">
                  {currentExercise.name}
                </h2>
                <div className="text-primary font-medium">{currentExercise.focus}</div>
                <div className="text-sm text-muted-foreground">
                  {currentExercise.equipment_used}
                </div>
              </div>

              <div className="text-center">
                <div className="text-7xl font-mono font-bold" data-testid="text-timer">
                  {formatTime(seconds)}
                </div>
              </div>

              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary" data-testid="text-current-set">
                    {currentSet}/{currentExercise.sets}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {txt("Séries", "Sets")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold" data-testid="text-reps">
                    {currentExercise.reps_or_time}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {txt("Reps/Tempo", "Reps/Time")}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  variant={isRunning ? "outline" : "default"}
                  onClick={() => setIsRunning(!isRunning)}
                  className="w-16 h-16 rounded-full"
                  data-testid="button-play-pause"
                >
                  {isRunning ? (
                    <Pause className="w-8 h-8" />
                  ) : (
                    <Play className="w-8 h-8 ml-1" />
                  )}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipExercise}
                  data-testid="button-skip-exercise"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  {txt("Saltar", "Skip")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNextSet}
                  data-testid="button-next-set"
                >
                  {currentSet < currentExercise.sets ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {txt("Série Concluída", "Set Done")}
                    </>
                  ) : currentExerciseIndex < totalExercises - 1 ? (
                    <>
                      <ChevronRight className="w-4 h-4 mr-2" />
                      {txt("Próximo Exercício", "Next Exercise")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {txt("Concluir Treino", "Finish Workout")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipForward, ChevronRight, CheckCircle2, Timer, Volume2, VolumeX, Eye, Dumbbell, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Exercise {
  name: string;
  name_pt?: string;
  sets: number;
  reps_or_time: string;
  focus: string;
  equipment_used: string;
}

interface LibraryMatch {
  imageUrl?: string;
  pexelsImage?: { url: string; source?: string; photographer?: string };
  videoUrl?: string;
  instructionsPt?: string;
  instructions?: string;
}

interface WorkoutTimerProps {
  exercises: Exercise[];
  exerciseLibrary?: Record<string, LibraryMatch>;
  userDifficulty?: string;
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Phase = "preview" | "prep_countdown" | "exercise" | "countdown" | "resting";

export default function WorkoutTimer({ 
  exercises, 
  exerciseLibrary = {}, 
  userDifficulty = "medium",
  open, 
  onClose, 
  onComplete 
}: WorkoutTimerProps) {
  const { language } = useTranslation();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>("preview");
  const [restSeconds, setRestSeconds] = useState(0);
  const [countdownValue, setCountdownValue] = useState(0);
  const [prepCountdown, setPrepCountdown] = useState(3);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [halfwayAnnounced, setHalfwayAnnounced] = useState(false);
  
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentExercise = exercises?.[currentExerciseIndex];
  const totalExercises = exercises?.length || 0;
  const progressPercent = ((currentExerciseIndex + 1) / totalExercises) * 100;
  
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;
  
  const exerciseKey = currentExercise?.name || currentExercise?.name_pt || "";
  const libraryData = exerciseLibrary[exerciseKey] || {};
  const exerciseImage = libraryData.imageUrl || libraryData.pexelsImage?.url;

  const getRepSpeed = () => {
    switch (userDifficulty) {
      case "very_easy": return 4000;
      case "easy": return 3500;
      case "medium": return 3000;
      case "hard": return 2500;
      case "very_hard": return 2000;
      default: return 3000;
    }
  };

  const parseReps = (repsOrTime: string): number | null => {
    const match = repsOrTime.match(/(\d+)/);
    if (match && !repsOrTime.toLowerCase().includes("seg") && !repsOrTime.toLowerCase().includes("min") && !repsOrTime.toLowerCase().includes("sec")) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  const parseTime = (repsOrTime: string): number | null => {
    const lower = repsOrTime.toLowerCase();
    const match = repsOrTime.match(/(\d+)/);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    if (lower.includes("min")) {
      return value * 60;
    }
    if (lower.includes("seg") || lower.includes("sec") || lower.includes("second")) {
      return value;
    }
    return null;
  };

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "pt" ? "pt-PT" : "en-GB";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, language]);

  const getNextExerciseName = useCallback(() => {
    if (currentSet < currentExercise?.sets) {
      return `${currentExercise.name_pt || currentExercise.name} - ${txt("Série", "Set")} ${currentSet + 1}`;
    } else if (currentExerciseIndex < totalExercises - 1) {
      const next = exercises[currentExerciseIndex + 1];
      return next?.name_pt || next?.name || "";
    }
    return txt("Treino completo!", "Workout complete!");
  }, [currentSet, currentExercise, currentExerciseIndex, totalExercises, exercises, txt]);

  const advanceToNextSet = useCallback(() => {
    setIsRunning(false);
    setHalfwayAnnounced(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    if (currentSet < currentExercise.sets) {
      const nextName = getNextExerciseName();
      setCurrentSet((s) => s + 1);
      setSeconds(0);
      setPhase("resting");
      setRestSeconds(60);
      speak(txt(`Descanso. 60 segundos. Próximo: ${nextName}`, `Rest. 60 seconds. Next: ${nextName}`));
    } else {
      if (currentExerciseIndex < totalExercises - 1) {
        const nextExercise = exercises[currentExerciseIndex + 1];
        const nextName = nextExercise?.name_pt || nextExercise?.name || "";
        setCurrentExerciseIndex((i) => i + 1);
        setCurrentSet(1);
        setSeconds(0);
        setPhase("resting");
        setRestSeconds(90);
        setImageLoaded(false);
        speak(txt(`Próximo exercício: ${nextName}. Descanso de 90 segundos.`, `Next exercise: ${nextName}. 90 seconds rest.`));
      } else {
        speak(txt("Treino concluído! Excelente trabalho!", "Workout complete! Great job!"));
        onComplete();
      }
    }
  }, [currentSet, currentExercise, currentExerciseIndex, totalExercises, exercises, onComplete, speak, txt, getNextExerciseName]);

  const startRepCountdown = useCallback(() => {
    const reps = parseReps(currentExercise?.reps_or_time || "");
    if (!reps) return;
    
    setCountdownValue(reps);
    setPhase("countdown");
    
    const speed = getRepSpeed();
    
    speak(txt("Começar!", "Start!"));
    
    setTimeout(() => {
      let currentRep = reps;
      
      countdownIntervalRef.current = setInterval(() => {
        currentRep -= 1;
        setCountdownValue(currentRep);
        
        if (currentRep > 0) {
          speak(String(currentRep));
        } else {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          speak(txt("Concluído!", "Done!"));
          setTimeout(() => {
            advanceToNextSet();
          }, 1500);
        }
      }, speed);
    }, 1000);
  }, [currentExercise, speak, txt, userDifficulty, advanceToNextSet]);

  const startTimeBasedExercise = useCallback(() => {
    const targetTime = parseTime(currentExercise?.reps_or_time || "");
    if (!targetTime) return;
    
    setTargetSeconds(targetTime);
    setSeconds(0);
    setHalfwayAnnounced(false);
    setPhase("exercise");
    setIsRunning(true);
    
    speak(txt("Começar!", "Start!"));
  }, [currentExercise, speak, txt]);

  const startPrepCountdown = useCallback(() => {
    setPrepCountdown(4);
    setPhase("prep_countdown");
    
    speak(txt("Prepara-te!", "Get ready!"));
    
    let count = 4;
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      setPrepCountdown(count);
      
      if (count > 0) {
        speak(String(count));
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
        
        const reps = parseReps(currentExercise?.reps_or_time || "");
        const targetTime = parseTime(currentExercise?.reps_or_time || "");
        
        if (reps) {
          startRepCountdown();
        } else if (targetTime) {
          startTimeBasedExercise();
        }
      }
    }, 1000);
  }, [currentExercise, speak, txt, startRepCountdown, startTimeBasedExercise]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setCurrentExerciseIndex(0);
      setCurrentSet(1);
      setSeconds(0);
      setTargetSeconds(0);
      setIsRunning(false);
      setPhase("preview");
      setRestSeconds(0);
      setImageLoaded(false);
      setHalfwayAnnounced(false);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  }, [open]);

  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    if (isRunning && phase === "exercise" && targetSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const newSeconds = s + 1;
          const remaining = targetSeconds - newSeconds;
          const halfway = Math.floor(targetSeconds / 2);
          
          if (newSeconds === halfway && !halfwayAnnounced) {
            setHalfwayAnnounced(true);
            speak(txt("Metade do tempo!", "Halfway there!"));
          }
          
          if (remaining === 5) {
            speak("5");
          } else if (remaining === 4) {
            speak("4");
          } else if (remaining === 3) {
            speak("3");
          } else if (remaining === 2) {
            speak("2");
          } else if (remaining === 1) {
            speak("1");
          } else if (remaining <= 0) {
            speak(txt("Concluído!", "Done!"));
            setIsRunning(false);
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            setTimeout(() => {
              advanceToNextSet();
            }, 1500);
            return targetSeconds;
          }
          
          return newSeconds;
        });
      }, 1000);
    } else if (isRunning && phase === "exercise" && targetSeconds === 0) {
      timerIntervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRunning, phase, targetSeconds, halfwayAnnounced, speak, txt, advanceToNextSet]);

  useEffect(() => {
    let restInterval: NodeJS.Timeout;
    if (phase === "resting" && restSeconds > 0) {
      restInterval = setInterval(() => {
        setRestSeconds((s) => {
          if (s <= 1) {
            setPhase("preview");
            setImageLoaded(false);
            return 0;
          }
          if (s === 4) speak("3");
          if (s === 3) speak("2");
          if (s === 2) speak("1");
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(restInterval);
  }, [phase, restSeconds, speak]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartSet = () => {
    setSeconds(0);
    setHalfwayAnnounced(false);
    
    const reps = parseReps(currentExercise?.reps_or_time || "");
    const targetTime = parseTime(currentExercise?.reps_or_time || "");
    
    if (reps || targetTime) {
      startPrepCountdown();
    } else {
      setPhase("exercise");
      setIsRunning(true);
    }
  };

  const handleNextSet = useCallback(() => {
    advanceToNextSet();
  }, [advanceToNextSet]);

  const handleSkipExercise = useCallback(() => {
    setIsRunning(false);
    setHalfwayAnnounced(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex((i) => i + 1);
      setCurrentSet(1);
      setSeconds(0);
      setTargetSeconds(0);
      setPhase("preview");
      setImageLoaded(false);
    } else {
      onComplete();
    }
  }, [currentExerciseIndex, totalExercises, onComplete]);

  const handleClose = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setSeconds(0);
    setTargetSeconds(0);
    setIsRunning(false);
    setPhase("preview");
    onClose();
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
    }
    return null;
  };

  if (!currentExercise) return null;

  const reps = parseReps(currentExercise.reps_or_time);
  const targetTime = parseTime(currentExercise.reps_or_time);
  const isRepBased = reps !== null;
  const isTimeBased = targetTime !== null;
  const videoEmbedUrl = libraryData.videoUrl ? getYouTubeEmbedUrl(libraryData.videoUrl) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Timer className="w-6 h-6 text-primary" />
              {txt("Treino em Progresso", "Workout in Progress")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              data-testid="button-toggle-voice"
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
          <DialogDescription className="sr-only">
            {txt("Temporizador de treino ativo", "Active workout timer")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              {txt("Exercício", "Exercise")} {currentExerciseIndex + 1}/{totalExercises}
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {phase === "preview" && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium">
                  <Eye className="w-4 h-4" />
                  {txt("Preparação", "Preparation")}
                </div>
                <h2 className="text-2xl font-heading font-bold" data-testid="text-exercise-name">
                  {currentExercise.name_pt || currentExercise.name}
                </h2>
                <div className="text-sm text-muted-foreground">
                  {txt("Série", "Set")} {currentSet} {txt("de", "of")} {currentExercise.sets} • {currentExercise.reps_or_time}
                </div>
              </div>

              {exerciseImage && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                      <Dumbbell className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <img
                    src={exerciseImage}
                    alt={currentExercise.name}
                    className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              )}

              {videoEmbedUrl && (
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={videoEmbedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={currentExercise.name}
                  />
                </div>
              )}

              {(libraryData.instructionsPt || libraryData.instructions) && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {language === "pt" ? libraryData.instructionsPt : libraryData.instructions}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full text-lg py-6"
                  onClick={handleStartSet}
                  data-testid="button-start-set"
                >
                  <Play className="w-6 h-6 mr-2" />
                  {(isRepBased || isTimeBased) && voiceEnabled 
                    ? txt("Iniciar com Contagem por Voz", "Start with Voice Countdown")
                    : txt("Iniciar Série", "Start Set")
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipExercise}
                  data-testid="button-skip-exercise"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  {txt("Saltar Exercício", "Skip Exercise")}
                </Button>
              </div>
            </div>
          )}

          {phase === "prep_countdown" && (
            <div className="text-center space-y-6 py-8">
              <div className="text-lg font-medium text-orange-500">
                {txt("Prepara-te!", "Get Ready!")}
              </div>
              <div className="text-9xl font-mono font-bold text-orange-500 animate-pulse" data-testid="text-prep-countdown">
                {prepCountdown}
              </div>
              <div className="text-muted-foreground">
                {currentExercise.name_pt || currentExercise.name}
              </div>
            </div>
          )}

          {phase === "countdown" && (
            <div className="text-center space-y-6 py-8">
              <div className="text-lg font-medium text-primary">
                {txt("Contagem Regressiva", "Countdown")}
              </div>
              <div className="text-9xl font-mono font-bold text-primary animate-pulse" data-testid="text-countdown">
                {countdownValue}
              </div>
              <div className="text-muted-foreground">
                {currentExercise.name_pt || currentExercise.name}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                  }
                  advanceToNextSet();
                }}
                data-testid="button-skip-countdown"
              >
                {txt("Saltar", "Skip")}
              </Button>
            </div>
          )}

          {phase === "exercise" && (
            <>
              {(exerciseImage || videoEmbedUrl) && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden max-h-48">
                  {exerciseImage && !videoEmbedUrl && (
                    <img
                      src={exerciseImage}
                      alt={currentExercise.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {videoEmbedUrl && (
                    <iframe
                      src={videoEmbedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={currentExercise.name}
                    />
                  )}
                </div>
              )}

              <div className="text-center space-y-1">
                <h2 className="text-xl font-heading font-bold" data-testid="text-exercise-name">
                  {currentExercise.name_pt || currentExercise.name}
                </h2>
                <div className="text-primary font-medium text-sm">{currentExercise.focus}</div>
              </div>

              <div className="text-center">
                {isTimeBased && targetSeconds > 0 ? (
                  <div className="space-y-2">
                    <div className="text-6xl font-mono font-bold" data-testid="text-timer">
                      {formatTime(Math.max(0, targetSeconds - seconds))}
                    </div>
                    <Progress value={(seconds / targetSeconds) * 100} className="h-3" />
                    <div className="text-sm text-muted-foreground">
                      {txt("Tempo restante", "Time remaining")}
                    </div>
                  </div>
                ) : (
                  <div className="text-6xl font-mono font-bold" data-testid="text-timer">
                    {formatTime(seconds)}
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-current-set">
                    {currentSet}/{currentExercise.sets}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {txt("Séries", "Sets")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" data-testid="text-reps">
                    {currentExercise.reps_or_time}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase">
                    {txt("Reps/Tempo", "Reps/Time")}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  variant={isRunning ? "outline" : "default"}
                  onClick={() => setIsRunning(!isRunning)}
                  className="w-14 h-14 rounded-full"
                  data-testid="button-play-pause"
                >
                  {isRunning ? (
                    <Pause className="w-7 h-7" />
                  ) : (
                    <Play className="w-7 h-7 ml-1" />
                  )}
                </Button>
                {isTimeBased && targetSeconds > 0 && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setTargetSeconds((t) => t + 10)}
                    className="w-14 h-14 rounded-full"
                    data-testid="button-extend-time"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs">10s</span>
                  </Button>
                )}
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

          {phase === "resting" && (
            <div className="text-center space-y-4 py-4">
              <div className="text-lg font-medium text-muted-foreground">
                {txt("Descanso", "Rest")}
              </div>
              <div className="text-7xl font-mono font-bold text-primary" data-testid="text-rest-timer">
                {formatTime(restSeconds)}
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  {txt("Próximo:", "Next:")}
                </p>
                <p className="font-heading font-bold text-lg" data-testid="text-next-exercise">
                  {currentSet <= currentExercise.sets 
                    ? `${currentExercise.name_pt || currentExercise.name} - ${txt("Série", "Set")} ${currentSet}`
                    : exercises[currentExerciseIndex + 1]?.name_pt || exercises[currentExerciseIndex + 1]?.name || txt("Concluído!", "Complete!")
                  }
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setPhase("preview");
                  setRestSeconds(0);
                  setImageLoaded(false);
                }}
                data-testid="button-skip-rest"
              >
                {txt("Saltar Descanso", "Skip Rest")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, ExternalLink, Dumbbell } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_FITNESS_IMAGE = "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800";

interface ExerciseData {
  name?: string;
  name_pt?: string;
  focus?: string;
  sets: number;
  reps_or_time?: string;
  reps_or_time_pt?: string;
  equipment_used?: string;
  equipment_used_pt?: string;
}

interface PexelsImage {
  url: string;
  source: string;
  photographer?: string;
}

interface LibraryExercise {
  id: string;
  name: string;
  namePt: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  equipment: string;
  difficulty: string;
  imageUrl?: string;
  videoUrl?: string;
  instructions?: string;
  instructionsPt?: string;
  pexelsImage?: PexelsImage;
}

interface ExerciseCardProps {
  exercise: ExerciseData;
  libraryMatch?: LibraryExercise;
  index: number;
}

export default function ExerciseCard({ exercise, libraryMatch, index }: ExerciseCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { t, language } = useTranslation();

  const displayName = libraryMatch 
    ? (language === "pt" ? libraryMatch.namePt : libraryMatch.name) 
    : (language === "pt" && exercise.name_pt ? exercise.name_pt : (exercise.name || exercise.name_pt));
  const instructions = libraryMatch 
    ? (language === "pt" ? libraryMatch.instructionsPt : libraryMatch.instructions) 
    : null;
  const repsOrTime = language === "pt" 
    ? (exercise.reps_or_time_pt || exercise.reps_or_time || "")
    : (exercise.reps_or_time || exercise.reps_or_time_pt || "");
  const equipmentUsed = language === "pt"
    ? (exercise.equipment_used_pt || exercise.equipment_used || "")
    : (exercise.equipment_used || exercise.equipment_used_pt || "");
  
  const imageUrl = libraryMatch?.pexelsImage?.url || libraryMatch?.imageUrl || DEFAULT_FITNESS_IMAGE;

  return (
    <>
      <Card 
        className="hover:border-primary transition-colors cursor-pointer" 
        data-testid={`card-exercise-${index}`}
        onClick={() => setShowDetails(true)}
      >
        <div className="h-32 bg-muted relative overflow-hidden">
          <img 
            src={imageUrl} 
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {libraryMatch?.videoUrl && (
            <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full">
              <PlayCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{displayName}</CardTitle>
          {exercise.focus && <div className="text-sm text-primary font-medium">{exercise.focus}</div>}
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("dashboard", "sets")}</span>
            <span className="font-bold">{exercise.sets}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">{t("dashboard", "repsTime")}</span>
            <span className="font-bold">{repsOrTime}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("dashboard", "equipment")}</span>
            <span className="font-bold">{equipmentUsed}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{displayName}</DialogTitle>
          </DialogHeader>
          
          <div className="h-48 bg-muted rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-2xl font-bold text-primary">{exercise.sets}</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "sets")}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-lg font-bold">{repsOrTime}</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "repsTime")}</div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm font-bold">{equipmentUsed}</div>
                <div className="text-xs text-muted-foreground uppercase">{t("dashboard", "equipment")}</div>
              </div>
            </div>

            {libraryMatch?.primaryMuscles && (
              <div>
                <h4 className="font-semibold mb-2">
                  {language === "pt" ? "Músculos Principais" : "Primary Muscles"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {libraryMatch.primaryMuscles.map((muscle) => (
                    <span key={muscle} className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full capitalize">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {instructions && (
              <div>
                <h4 className="font-semibold mb-2">
                  {language === "pt" ? "Instruções" : "Instructions"}
                </h4>
                <p className="text-sm text-muted-foreground">{instructions}</p>
              </div>
            )}

            {libraryMatch?.videoUrl && (
              <Button 
                className="w-full" 
                onClick={() => window.open(libraryMatch.videoUrl, '_blank')}
                data-testid="button-watch-video"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {language === "pt" ? "Ver Vídeo Tutorial" : "Watch Tutorial Video"}
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

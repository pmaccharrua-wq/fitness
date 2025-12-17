import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, ExternalLink, Dumbbell, Sparkles, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { enrichExercise, type EnrichedExercise } from "@/lib/api";

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
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedExercise | null>(null);
  const { t, language } = useTranslation();
  
  const [enrichError, setEnrichError] = useState<string | null>(null);
  
  const handleEnrich = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEnriching(true);
    setEnrichError(null);
    try {
      const response = await enrichExercise(
        exercise.name,
        exercise.name_pt,
        undefined
      );
      if (response.success && response.exercise) {
        setEnrichedData(response.exercise);
        if (!response.exercise.instructions) {
          setEnrichError(language === "pt" 
            ? "Dados parciais gerados. Tente novamente para mais detalhes."
            : "Partial data generated. Try again for more details.");
        }
      } else {
        setEnrichError(response.error || (language === "pt" 
          ? "Erro ao gerar dados. Tente novamente."
          : "Error generating data. Please try again."));
      }
    } catch (err) {
      console.error("Error enriching exercise:", err);
      setEnrichError(language === "pt" 
        ? "Erro de conexão. Tente novamente."
        : "Connection error. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  };
  
  const hasLibraryData = libraryMatch || enrichedData;

  const effectiveData = enrichedData || libraryMatch;
  
  const displayName = effectiveData 
    ? (language === "pt" ? effectiveData.namePt : effectiveData.name) 
    : (language === "pt" && exercise.name_pt ? exercise.name_pt : (exercise.name || exercise.name_pt));
  const instructions = effectiveData 
    ? (language === "pt" ? effectiveData.instructionsPt : effectiveData.instructions) 
    : null;
  const repsOrTime = language === "pt" 
    ? (exercise.reps_or_time_pt || exercise.reps_or_time || "")
    : (exercise.reps_or_time || exercise.reps_or_time_pt || "");
  const equipmentUsed = language === "pt"
    ? (exercise.equipment_used_pt || exercise.equipment_used || "")
    : (exercise.equipment_used || exercise.equipment_used_pt || "");
  
  const imageUrl = effectiveData?.pexelsImage?.url || effectiveData?.imageUrl || DEFAULT_FITNESS_IMAGE;
  const videoUrl = effectiveData?.videoUrl;
  const primaryMuscles = effectiveData?.primaryMuscles;
  
  const needsEnrichment = !hasLibraryData;

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
          {videoUrl && (
            <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full">
              <PlayCircle className="w-4 h-4 text-white" />
            </div>
          )}
          {needsEnrichment && !isEnriching && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 gap-1 text-xs"
              onClick={handleEnrich}
              data-testid={`button-enrich-exercise-${index}`}
            >
              <Sparkles className="w-3 h-3" />
              {language === "pt" ? "Gerar Dados" : "Generate Data"}
            </Button>
          )}
          {isEnriching && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
          {enrichError && !isEnriching && (
            <div className="absolute bottom-2 left-2 right-2 bg-destructive/90 text-destructive-foreground text-xs p-1.5 rounded">
              {enrichError}
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

            {primaryMuscles && primaryMuscles.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">
                  {language === "pt" ? "Músculos Principais" : "Primary Muscles"}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {primaryMuscles.map((muscle) => (
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
            
            {needsEnrichment && !isEnriching && (
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleEnrich}
                data-testid="button-enrich-exercise-dialog"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {language === "pt" ? "Gerar Imagem, Vídeo e Descrição" : "Generate Image, Video & Description"}
              </Button>
            )}
            
            {isEnriching && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {language === "pt" ? "Gerando dados..." : "Generating data..."}
              </div>
            )}

            {videoUrl && (
              <Button 
                className="w-full" 
                onClick={() => window.open(videoUrl, '_blank')}
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

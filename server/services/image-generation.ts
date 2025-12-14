export interface ExerciseImage {
  url: string;
  source: string;
}

// Map exercise types and muscles to relevant search terms for stock images
function getSearchTerms(exerciseName: string, equipment: string, primaryMuscles: string[]): string {
  const muscleToActivity: Record<string, string> = {
    chest: "chest workout gym",
    back: "back workout gym",
    shoulders: "shoulder press gym",
    biceps: "biceps curl gym",
    triceps: "triceps workout gym",
    quadriceps: "leg workout squat",
    hamstrings: "leg workout gym",
    glutes: "glutes workout gym",
    calves: "calf raise gym",
    core: "core workout gym",
    abs: "abs workout gym",
    forearms: "forearm workout gym",
  };

  // Check for specific exercise keywords
  const exerciseLower = exerciseName.toLowerCase();
  if (exerciseLower.includes("squat")) return "squat exercise gym";
  if (exerciseLower.includes("deadlift")) return "deadlift exercise gym";
  if (exerciseLower.includes("press") && exerciseLower.includes("bench")) return "bench press gym";
  if (exerciseLower.includes("push-up") || exerciseLower.includes("pushup")) return "pushup exercise fitness";
  if (exerciseLower.includes("pull-up") || exerciseLower.includes("pullup")) return "pullup exercise gym";
  if (exerciseLower.includes("plank")) return "plank exercise fitness";
  if (exerciseLower.includes("lunge")) return "lunge exercise gym";
  if (exerciseLower.includes("row")) return "rowing exercise gym";
  if (exerciseLower.includes("curl")) return "dumbbell curl gym";
  if (exerciseLower.includes("crunch") || exerciseLower.includes("sit-up")) return "ab crunch exercise";

  // Use primary muscle as fallback
  const primaryMuscle = primaryMuscles[0]?.toLowerCase();
  if (primaryMuscle && muscleToActivity[primaryMuscle]) {
    return muscleToActivity[primaryMuscle];
  }

  // Generic fitness fallback
  return "fitness workout gym exercise";
}

export async function getExerciseImage(
  exerciseName: string,
  exerciseNamePt: string,
  equipment: string,
  primaryMuscles: string[]
): Promise<ExerciseImage> {
  const searchTerms = getSearchTerms(exerciseName, equipment, primaryMuscles);
  
  // Use Unsplash Source for direct image URLs (no API key required)
  // This provides random relevant images based on search terms
  const encodedSearch = encodeURIComponent(searchTerms);
  const imageUrl = `https://source.unsplash.com/800x600/?${encodedSearch}`;
  
  return {
    url: imageUrl,
    source: "unsplash",
  };
}

export async function testImageLookup(): Promise<{ success: boolean; error?: string; image?: ExerciseImage }> {
  try {
    const image = await getExerciseImage(
      "Push-Up",
      "Flexão",
      "bodyweight",
      ["chest", "triceps"]
    );
    return { success: true, image };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

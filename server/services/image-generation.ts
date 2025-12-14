export interface ExerciseImage {
  url: string;
  source: string;
}

function getSearchTerms(exerciseName: string, primaryMuscles: string[]): string {
  const exerciseLower = exerciseName.toLowerCase();
  
  if (exerciseLower.includes("squat") || exerciseLower.includes("agachamento")) return "squat exercise gym";
  if (exerciseLower.includes("deadlift") || exerciseLower.includes("levantamento")) return "deadlift exercise gym";
  if (exerciseLower.includes("push-up") || exerciseLower.includes("pushup") || exerciseLower.includes("flexão")) return "pushup exercise fitness";
  if (exerciseLower.includes("pull-up") || exerciseLower.includes("pullup")) return "pullup exercise gym";
  if (exerciseLower.includes("plank") || exerciseLower.includes("prancha")) return "plank exercise fitness";
  if (exerciseLower.includes("lunge") || exerciseLower.includes("afundo")) return "lunge exercise gym";
  if (exerciseLower.includes("row") || exerciseLower.includes("remada")) return "rowing exercise gym";
  if (exerciseLower.includes("curl") || exerciseLower.includes("rosca")) return "dumbbell curl gym";
  if (exerciseLower.includes("crunch") || exerciseLower.includes("abdominal")) return "ab crunch exercise";
  if (exerciseLower.includes("dip") || exerciseLower.includes("mergulho")) return "tricep dips exercise";
  if (exerciseLower.includes("calf") || exerciseLower.includes("gémeos") || exerciseLower.includes("gemeos")) return "calf raise exercise";
  if (exerciseLower.includes("jump") || exerciseLower.includes("salto")) return "jump squat exercise";
  if (exerciseLower.includes("mountain") || exerciseLower.includes("escalador")) return "mountain climber exercise";
  if (exerciseLower.includes("russian") || exerciseLower.includes("rotação")) return "russian twist exercise";
  if (exerciseLower.includes("leg raise") || exerciseLower.includes("elevação de pernas")) return "leg raise exercise";
  if (exerciseLower.includes("joelho") || exerciseLower.includes("knee")) return "high knees exercise";
  if (exerciseLower.includes("polichinelo") || exerciseLower.includes("jumping jack")) return "jumping jacks exercise";

  const muscleMap: Record<string, string> = {
    chest: "chest workout gym",
    back: "back workout gym",
    shoulders: "shoulder press gym",
    biceps: "biceps curl gym",
    triceps: "triceps workout gym",
    quadriceps: "leg workout squat",
    glutes: "glutes workout gym",
    core: "core workout gym",
    calves: "calf raise gym",
  };
  
  const primaryMuscle = primaryMuscles[0]?.toLowerCase();
  return muscleMap[primaryMuscle] || "fitness workout gym";
}

export async function getExerciseImage(
  exerciseName: string,
  exerciseNamePt: string,
  equipment: string,
  primaryMuscles: string[]
): Promise<ExerciseImage> {
  const searchTerms = getSearchTerms(exerciseName || exerciseNamePt, primaryMuscles);
  const encodedSearch = encodeURIComponent(searchTerms);
  
  return {
    url: `https://source.unsplash.com/800x600/?${encodedSearch}`,
    source: "unsplash",
  };
}

export async function testImageGeneration(): Promise<{ success: boolean; error?: string; image?: ExerciseImage }> {
  try {
    const image = await getExerciseImage("Push-Up", "Flexão", "bodyweight", ["chest", "triceps"]);
    return { success: true, image };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

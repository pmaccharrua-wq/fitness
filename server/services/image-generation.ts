export interface ExerciseImage {
  url: string;
  source: string;
  photographer?: string;
}

const imageCache: Record<string, ExerciseImage> = {};

function getSearchTerms(exerciseName: string, primaryMuscles: string[]): string {
  const exerciseLower = exerciseName.toLowerCase();
  
  if (exerciseLower.includes("squat") || exerciseLower.includes("agachamento")) return "squat exercise";
  if (exerciseLower.includes("deadlift") || exerciseLower.includes("levantamento")) return "deadlift";
  if (exerciseLower.includes("push-up") || exerciseLower.includes("pushup") || exerciseLower.includes("flexão")) return "push up exercise";
  if (exerciseLower.includes("pull-up") || exerciseLower.includes("pullup")) return "pull up exercise";
  if (exerciseLower.includes("plank") || exerciseLower.includes("prancha")) return "plank exercise";
  if (exerciseLower.includes("lunge") || exerciseLower.includes("afundo")) return "lunge exercise";
  if (exerciseLower.includes("row") || exerciseLower.includes("remada")) return "rowing exercise";
  if (exerciseLower.includes("curl") || exerciseLower.includes("rosca")) return "dumbbell curl";
  if (exerciseLower.includes("crunch") || exerciseLower.includes("abdominal")) return "ab workout";
  if (exerciseLower.includes("dip") || exerciseLower.includes("mergulho")) return "tricep dips";
  if (exerciseLower.includes("calf") || exerciseLower.includes("gémeos") || exerciseLower.includes("gemeos")) return "leg workout gym";
  if (exerciseLower.includes("jump") || exerciseLower.includes("salto")) return "jump exercise";
  if (exerciseLower.includes("mountain") || exerciseLower.includes("escalador")) return "mountain climber";
  if (exerciseLower.includes("russian") || exerciseLower.includes("rotação")) return "core exercise";
  if (exerciseLower.includes("leg raise") || exerciseLower.includes("elevação de pernas")) return "leg raise";
  if (exerciseLower.includes("joelho") || exerciseLower.includes("knee")) return "cardio exercise";
  if (exerciseLower.includes("polichinelo") || exerciseLower.includes("jumping jack")) return "jumping jacks";

  const muscleMap: Record<string, string> = {
    chest: "chest workout",
    back: "back workout",
    shoulders: "shoulder workout",
    biceps: "biceps workout",
    triceps: "triceps workout",
    quadriceps: "leg workout",
    glutes: "glutes workout",
    core: "core workout",
    calves: "leg workout gym",
  };
  
  const primaryMuscle = primaryMuscles[0]?.toLowerCase();
  return muscleMap[primaryMuscle] || "fitness workout";
}

export async function getExerciseImage(
  exerciseName: string,
  exerciseNamePt: string,
  equipment: string,
  primaryMuscles: string[]
): Promise<ExerciseImage> {
  const searchTerms = getSearchTerms(exerciseName || exerciseNamePt, primaryMuscles);
  
  if (imageCache[searchTerms]) {
    return imageCache[searchTerms];
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      const result: ExerciseImage = {
        url: photo.src.medium,
        source: "pexels",
        photographer: photo.photographer,
      };
      imageCache[searchTerms] = result;
      return result;
    }

    return {
      url: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800",
      source: "pexels-fallback",
    };
  } catch (error) {
    console.error("Error fetching from Pexels:", error);
    return {
      url: "https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&cs=tinysrgb&w=800",
      source: "pexels-fallback",
    };
  }
}

export async function getMealImage(mealDescription: string, mealTime: string): Promise<ExerciseImage> {
  const descLower = mealDescription.toLowerCase();
  let searchTerms = "healthy food";
  
  if (descLower.includes("frango") || descLower.includes("chicken")) searchTerms = "grilled chicken meal";
  else if (descLower.includes("peixe") || descLower.includes("salmão") || descLower.includes("fish") || descLower.includes("salmon")) searchTerms = "salmon fish meal";
  else if (descLower.includes("ovo") || descLower.includes("egg")) searchTerms = "eggs breakfast";
  else if (descLower.includes("salada") || descLower.includes("salad")) searchTerms = "healthy salad bowl";
  else if (descLower.includes("arroz") || descLower.includes("rice")) searchTerms = "rice bowl meal";
  else if (descLower.includes("aveia") || descLower.includes("oat")) searchTerms = "oatmeal breakfast";
  else if (descLower.includes("iogurte") || descLower.includes("yogurt")) searchTerms = "yogurt fruit bowl";
  else if (descLower.includes("batido") || descLower.includes("shake") || descLower.includes("whey")) searchTerms = "protein shake";
  else if (descLower.includes("carne") || descLower.includes("beef") || descLower.includes("bife")) searchTerms = "steak dinner";
  else if (descLower.includes("massa") || descLower.includes("pasta")) searchTerms = "pasta meal";
  else if (descLower.includes("sopa") || descLower.includes("soup")) searchTerms = "healthy soup bowl";
  else if (descLower.includes("sanduíche") || descLower.includes("sandwich") || descLower.includes("tosta")) searchTerms = "healthy sandwich";
  else if (mealTime.toLowerCase().includes("pequeno") || mealTime.toLowerCase().includes("breakfast")) searchTerms = "healthy breakfast";
  else if (mealTime.toLowerCase().includes("lanche") || mealTime.toLowerCase().includes("snack")) searchTerms = "healthy snack";
  else if (mealTime.toLowerCase().includes("jantar") || mealTime.toLowerCase().includes("dinner")) searchTerms = "healthy dinner plate";
  else if (mealTime.toLowerCase().includes("almoço") || mealTime.toLowerCase().includes("lunch")) searchTerms = "healthy lunch";

  const cacheKey = `meal_${searchTerms}`;
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerms)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      const result: ExerciseImage = {
        url: photo.src.medium,
        source: "pexels",
        photographer: photo.photographer,
      };
      imageCache[cacheKey] = result;
      return result;
    }

    return {
      url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
      source: "pexels-fallback",
    };
  } catch (error) {
    console.error("Error fetching meal image from Pexels:", error);
    return {
      url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
      source: "pexels-fallback",
    };
  }
}

export async function testImageGeneration(): Promise<{ success: boolean; error?: string; image?: ExerciseImage }> {
  try {
    const image = await getExerciseImage("Push-Up", "Flexão", "bodyweight", ["chest", "triceps"]);
    return { success: true, image };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

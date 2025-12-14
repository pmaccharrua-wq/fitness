export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
}

export async function generateExerciseImage(
  exerciseName: string,
  exerciseNamePt: string,
  equipment: string,
  primaryMuscles: string[]
): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const muscleString = primaryMuscles.join(" and ");
  
  const prompt = `Professional fitness instructional illustration showing a person performing "${exerciseName}" exercise. 
The exercise targets the ${muscleString} muscles and uses ${equipment === "bodyweight" ? "no equipment (bodyweight only)" : equipment}. 
Show proper form from a clear side or 3/4 angle view.
Clean white or light gray gym background.
Athletic person in workout clothes demonstrating the movement.
Educational diagram style, high quality, professional fitness app illustration.`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI DALL-E API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    return {
      url: data.data[0].url,
      revisedPrompt: data.data[0].revised_prompt,
    };
  } catch (error) {
    console.error("Error generating exercise image:", error);
    throw error;
  }
}

export async function testImageGeneration(): Promise<{ success: boolean; error?: string; image?: GeneratedImage }> {
  try {
    const image = await generateExerciseImage(
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

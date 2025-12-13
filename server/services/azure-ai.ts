import { UserProfile } from "@shared/schema";

interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
}

const config: AzureOpenAIConfig = {
  apiKey: process.env.AZURE_OPENAI_API_KEY || "",
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "",
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "",
};

const AVAILABLE_EQUIPMENT = [
  "2kg dumbbells",
  "4kg dumbbell",
  "9kg dumbbell",
  "6kg kettlebell",
  "Titanium Strength SUPREME Leg Press / Hack Squat",
  "Adidas Home Gym Multi-ginásio",
  "Treadmill with adjustable elevation and speed",
  "Bicycle",
  "Step machine",
  "Adidas bench",
  "Gym ball",
  "Bodyweight (no equipment needed)",
];

export interface GeneratedPlan {
  fitness_plan_30_days: Array<{
    day: number;
    workout_name: string;
    estimated_calories_burnt: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps_or_time: string;
      focus: string;
      equipment_used: string;
      image_link?: string;
      video_link?: string;
    }>;
  }>;
  nutrition_guidelines: {
    daily_calorie_target: number;
    macros: {
      protein_percentage: number;
      carbs_percentage: number;
      fat_percentage: number;
    };
    sample_recipes: Array<{
      meal: string;
      description: string;
      ingredients: string[];
      calories: number;
      macros: {
        protein: string;
        carbs: string;
        fat: string;
      };
    }>;
  };
}

export async function generateFitnessPlan(userProfile: UserProfile): Promise<GeneratedPlan> {
  // Calculate BMR using Mifflin-St Jeor Equation
  const bmr =
    userProfile.sex === "Male"
      ? 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5
      : 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;

  // Calculate TDEE based on activity level
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
  };
  const tdee = Math.round(bmr * (activityMultipliers[userProfile.activityLevel] || 1.2));

  // Adjust calories based on goal
  let targetCalories = tdee;
  if (userProfile.goal === "loss") {
    targetCalories = Math.round(tdee * 0.85); // 15% deficit
  } else if (userProfile.goal === "muscle") {
    targetCalories = Math.round(tdee * 1.1); // 10% surplus
  }

  const systemPrompt = `You are an expert AI Fitness and Nutrition Planner. Your goal is to create a highly personalized 30-day fitness plan and nutrition guidelines based on the user's profile, calculated metabolic needs, and available equipment.

CRITICAL REQUIREMENTS:
1. Output MUST be valid JSON only - no explanations, no markdown, no code blocks
2. Generate exactly 30 days of workouts
3. Each day should have 3-5 exercises
4. Nutrition should include 3 sample recipes (breakfast, lunch, dinner)
5. Consider the user's goal, activity level, and available equipment
6. Respect any impediments mentioned
7. Calories burnt should be realistic based on exercise intensity`;

  const userPrompt = `Generate a 30-day personalized fitness and nutrition plan for:

USER PROFILE:
- Sex: ${userProfile.sex}
- Age: ${userProfile.age} years
- Weight: ${userProfile.weight} kg
- Height: ${userProfile.height} cm
- Primary Goal: ${userProfile.goal === "loss" ? "Weight Loss" : userProfile.goal === "muscle" ? "Muscle Gain" : "Endurance"}
- Activity Level: ${userProfile.activityLevel}
- Available Equipment: ${userProfile.equipment?.join(", ") || "None - bodyweight only"}
- Impediments/Notes: ${userProfile.impediments || "None"}

CALCULATED METRICS:
- Target Daily Calories: ${targetCalories} kcal
- Recommended Macros: ${
    userProfile.goal === "muscle"
      ? "Protein 30%, Carbs 45%, Fat 25%"
      : userProfile.goal === "loss"
      ? "Protein 35%, Carbs 35%, Fat 30%"
      : "Protein 25%, Carbs 50%, Fat 25%"
  }

AVAILABLE EQUIPMENT OPTIONS:
${AVAILABLE_EQUIPMENT.join(", ")}

OUTPUT STRUCTURE (JSON ONLY):
{
  "fitness_plan_30_days": [
    {
      "day": 1,
      "workout_name": "Full Body Strength",
      "estimated_calories_burnt": 350,
      "exercises": [
        {
          "name": "Goblet Squats",
          "sets": 3,
          "reps_or_time": "12 reps",
          "focus": "Legs & Core",
          "equipment_used": "9kg dumbbell"
        }
      ]
    }
  ],
  "nutrition_guidelines": {
    "daily_calorie_target": ${targetCalories},
    "macros": {
      "protein_percentage": 30,
      "carbs_percentage": 45,
      "fat_percentage": 25
    },
    "sample_recipes": [
      {
        "meal": "Breakfast",
        "description": "High-protein oatmeal bowl",
        "ingredients": ["Oats", "Protein powder", "Berries", "Almonds"],
        "calories": 450,
        "macros": { "protein": "30g", "carbs": "50g", "fat": "12g" }
      }
    ]
  }
}`;

  try {
    const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Azure OpenAI response");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error calling Azure OpenAI:", error);
    throw error;
  }
}

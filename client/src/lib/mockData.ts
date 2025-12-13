export interface Exercise {
  name: string;
  sets: number;
  reps_or_time: string;
  focus: string;
  equipment_used: string;
  image_link?: string;
}

export interface Meal {
  meal: string;
  description: string;
  ingredients: string[];
  calories: number;
  macros: {
    protein: string;
    carbs: string;
    fat: string;
  };
  image_link?: string;
}

export interface DayPlan {
  day: number;
  workout_name: string;
  estimated_calories_burnt: number;
  exercises: Exercise[];
  meals: Meal[];
}

export const mockPlan: DayPlan[] = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  workout_name: i % 2 === 0 ? "Full Body Power" : "Active Recovery & Cardio",
  estimated_calories_burnt: i % 2 === 0 ? 450 : 250,
  exercises: [
    {
      name: "Dumbbell Goblet Squats",
      sets: 3,
      reps_or_time: "12 reps",
      focus: "Legs & Core",
      equipment_used: "9kg dumbell",
    },
    {
      name: "Push-ups",
      sets: 3,
      reps_or_time: "15 reps",
      focus: "Chest & Triceps",
      equipment_used: "Bodyweight",
    },
    {
      name: "Plank Hold",
      sets: 3,
      reps_or_time: "45 seconds",
      focus: "Core Stability",
      equipment_used: "Mat",
    }
  ],
  meals: [
    {
      meal: "Lunch",
      description: "Grilled Salmon with Quinoa & Asparagus",
      ingredients: ["Salmon Fillet", "Quinoa", "Asparagus", "Lemon", "Olive Oil"],
      calories: 550,
      macros: { protein: "45g", carbs: "35g", fat: "22g" }
    },
    {
      meal: "Dinner",
      description: "Chicken & Avocado Salad",
      ingredients: ["Chicken Breast", "Mixed Greens", "Avocado", "Cherry Tomatoes"],
      calories: 420,
      macros: { protein: "40g", carbs: "15g", fat: "20g" }
    }
  ]
}));

export interface OnboardingData {
  sex: string;
  age: number;
  weight: number;
  height: number;
  goal: string;
  activityLevel: string;
  equipment?: string[];
  impediments?: string;
}

export interface OnboardingResponse {
  success: boolean;
  userId: number;
  planId: number;
  plan: any;
  error?: string;
}

export interface PlanResponse {
  success: boolean;
  plan: any;
  currentDay: number;
  planId: number;
  progress: any[];
  error?: string;
}

export interface ProgressData {
  userId: number;
  planId: number;
  day: number;
  difficulty: "easy" | "just right" | "hard";
}

export async function submitOnboarding(data: OnboardingData): Promise<OnboardingResponse> {
  const response = await fetch("/api/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sex: data.sex,
      age: parseInt(data.age.toString()),
      weight: parseInt(data.weight.toString()),
      height: parseInt(data.height.toString()),
      goal: data.goal,
      activityLevel: data.activityLevel,
      equipment: data.equipment,
      impediments: data.impediments,
    }),
  });

  return response.json();
}

export async function getUserPlan(userId: number): Promise<PlanResponse> {
  const response = await fetch(`/api/plan/${userId}`);
  return response.json();
}

export async function recordProgress(data: ProgressData): Promise<any> {
  const response = await fetch("/api/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

export async function getUserProfile(userId: number): Promise<any> {
  const response = await fetch(`/api/profile/${userId}`);
  return response.json();
}

// Local storage helpers
export function saveUserId(userId: number) {
  localStorage.setItem("userId", userId.toString());
}

export function getUserId(): number | null {
  const userId = localStorage.getItem("userId");
  return userId ? parseInt(userId) : null;
}

export function clearUserId() {
  localStorage.removeItem("userId");
}

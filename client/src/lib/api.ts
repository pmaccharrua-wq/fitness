export interface OnboardingData {
  firstName: string;
  phoneNumber: string;
  pin: string;
  language: string;
  sex: string;
  age: number;
  weight: number;
  height: number;
  goal: string;
  activityLevel: string;
  equipment?: string[];
  impediments?: string;
  somatotype?: string;
  currentBodyComp?: string;
  targetBodyComp?: string;
  timePerDay?: number;
  difficulty?: string;
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
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      pin: data.pin,
      language: data.language,
      sex: data.sex,
      age: parseInt(data.age.toString()),
      weight: parseInt(data.weight.toString()),
      height: parseInt(data.height.toString()),
      goal: data.goal,
      activityLevel: data.activityLevel,
      equipment: data.equipment,
      impediments: data.impediments,
      somatotype: data.somatotype,
      currentBodyComp: data.currentBodyComp,
      targetBodyComp: data.targetBodyComp,
      timePerDay: data.timePerDay,
      difficulty: data.difficulty,
    }),
  });

  return response.json();
}

export async function getUserPlan(userId: number): Promise<PlanResponse> {
  const response = await fetch(`/api/plan/${userId}`);
  return response.json();
}

export async function getUserPlans(userId: number): Promise<any> {
  const response = await fetch(`/api/plans/${userId}`);
  return response.json();
}

export async function activatePlan(planId: number, userId: number): Promise<any> {
  const response = await fetch(`/api/plan/${planId}/activate`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

export async function deletePlan(planId: number): Promise<any> {
  const response = await fetch(`/api/plan/${planId}`, {
    method: "DELETE",
  });
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

export async function getNotificationSettings(userId: number): Promise<any> {
  const response = await fetch(`/api/notifications/settings/${userId}`);
  return response.json();
}

export async function updateNotificationSettings(userId: number, settings: any): Promise<any> {
  const response = await fetch(`/api/notifications/settings/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return response.json();
}

export async function pollNotifications(userId: number, language: string = "en"): Promise<any> {
  const response = await fetch(`/api/notifications/poll/${userId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
  return response.json();
}

export async function markNotificationRead(id: number): Promise<any> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
  });
  return response.json();
}

export async function matchExercises(exerciseNames: string[]): Promise<any> {
  const response = await fetch("/api/exercises/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseNames }),
  });
  return response.json();
}

export async function getAllExercises(): Promise<any> {
  const response = await fetch("/api/exercises");
  return response.json();
}

export interface ProfileUpdateData {
  weight?: number;
  height?: number;
  goal?: string;
  activityLevel?: string;
  impediments?: string;
  timePerDay?: number;
  difficulty?: string;
  regeneratePlan?: boolean;
}

export async function updateUserProfile(userId: number, data: ProfileUpdateData): Promise<any> {
  const response = await fetch(`/api/profile/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

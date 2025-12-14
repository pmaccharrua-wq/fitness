import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getUserId, getUserProfile } from "./api";

type Language = "pt" | "en";

const translations = {
  home: {
    poweredBy: { pt: "Desenvolvido com Azure OpenAI", en: "Powered by Azure OpenAI" },
    trainSmarter: { pt: "Treina Mais Inteligente,", en: "Train Smarter," },
    notHarder: { pt: "Não Mais Difícil.", en: "Not Harder." },
    description: { 
      pt: "O seu treinador de IA personalizado. Gera planos de fitness e nutrição de 30 dias adaptados ao seu tipo corporal, objetivos e equipamento.", 
      en: "Your personalized AI coach. Generates 30-day fitness and nutrition plans tailored exactly to your body type, goals, and equipment." 
    },
    startJourney: { pt: "Começar a Jornada", en: "Start Your Journey" },
    learnMore: { pt: "Saber Mais", en: "Learn More" },
    login: { pt: "Entrar", en: "Login" },
    dailyGoal: { pt: "Meta Diária", en: "Daily Goal" },
    completed: { pt: "Concluído", en: "Completed" },
  },
  dashboard: {
    todaysFocus: { pt: "Foco de Hoje", en: "Today's Focus" },
    dayOf: { pt: "Dia {current} de {total}", en: "Day {current} of {total}" },
    startWorkout: { pt: "Iniciar Treino", en: "Start Workout" },
    kcalTarget: { pt: "Kcal Alvo", en: "Kcal Target" },
    duration: { pt: "Duração", en: "Duration" },
    daysComplete: { pt: "Dias Completos", en: "Days Complete" },
    todaysWorkout: { pt: "Treino de Hoje", en: "Today's Workout" },
    nutritionPlan: { pt: "Plano Nutricional", en: "Nutrition Plan" },
    fullSchedule: { pt: "Calendário Completo 30 Dias", en: "Full 30-Day Schedule" },
    sets: { pt: "Séries", en: "Sets" },
    repsTime: { pt: "Reps/Tempo", en: "Reps/Time" },
    equipment: { pt: "Equipamento", en: "Equipment" },
    dailyTargets: { pt: "Metas Diárias", en: "Daily Targets" },
    calories: { pt: "Calorias", en: "Calories" },
    protein: { pt: "Proteína", en: "Protein" },
    carbs: { pt: "Hidratos", en: "Carbs" },
    fat: { pt: "Gordura", en: "Fat" },
    ingredients: { pt: "Ingredientes", en: "Ingredients" },
    loading: { pt: "A carregar o seu plano personalizado...", en: "Loading your personalized plan..." },
    noPlan: { pt: "Nenhum plano encontrado", en: "No plan found" },
    createPlan: { pt: "Criar o Seu Plano", en: "Create Your Plan" },
    loadFailed: { pt: "Falha ao carregar o plano", en: "Failed to load your plan" },
    errorLoading: { pt: "Ocorreu um erro ao carregar o plano", en: "An error occurred loading your plan" },
  },
  layout: {
    home: { pt: "Início", en: "Home" },
    dashboard: { pt: "Painel", en: "Dashboard" },
    profile: { pt: "Perfil", en: "Profile" },
    logout: { pt: "Sair", en: "Logout" },
  },
  common: {
    back: { pt: "Voltar", en: "Back" },
    next: { pt: "Seguinte", en: "Next" },
    loading: { pt: "A carregar...", en: "Loading..." },
    error: { pt: "Erro", en: "Error" },
    success: { pt: "Sucesso", en: "Success" },
  },
};

type TranslationKey = keyof typeof translations;
type NestedKey<T> = T extends object ? keyof T : never;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: <K extends TranslationKey>(section: K, key: NestedKey<typeof translations[K]>, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getStoredLanguage(): Language {
  const stored = localStorage.getItem("language");
  if (stored === "pt" || stored === "en") {
    return stored;
  }
  return "pt";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  const setLanguage = (lang: Language) => {
    localStorage.setItem("language", lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    const userId = getUserId();
    if (userId) {
      getUserProfile(userId).then((response) => {
        if (response.success && response.profile?.language) {
          const profileLang = response.profile.language as Language;
          if (profileLang !== language) {
            setLanguage(profileLang);
          }
        }
      }).catch(() => {});
    }
  }, []);

  const t = <K extends TranslationKey>(
    section: K, 
    key: NestedKey<typeof translations[K]>, 
    params?: Record<string, string | number>
  ): string => {
    const sectionData = translations[section] as any;
    const translation = sectionData?.[key]?.[language] || sectionData?.[key]?.en || String(key);
    
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        translation
      );
    }
    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export function useTranslation() {
  return useI18n();
}

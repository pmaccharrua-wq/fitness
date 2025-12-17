import { UserProfile } from "@shared/schema";
import { exerciseLibrary, exerciseIdsByCategory } from "../exerciseData";

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
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview",
};

const AVAILABLE_EQUIPMENT = [
  "Halteres de 2kg",
  "Haltere de 4kg",
  "Haltere de 9kg",
  "Kettlebell de 6kg",
  "Titanium Strength SUPREME Leg Press / Hack Squat",
  "Adidas Home Gym Multi-ginásio",
  "Passadeira com elevação e velocidade ajustáveis",
  "Bicicleta",
  "Máquina de step",
  "Banco Adidas",
  "Bola de ginástica",
  "Peso corporal (sem equipamento)",
];

export { AVAILABLE_EQUIPMENT };

interface WarmupCooldownExercise {
  name: string;
  name_pt: string;
  duration_seconds: number;
  description_pt: string;
}

export interface GeneratedPlan {
  plan_summary_pt: string;
  fitness_plan_15_days: Array<{
    day: number;
    is_rest_day: boolean;
    workout_name_pt: string;
    duration_minutes: number;
    estimated_calories_burnt: number;
    focus_pt: string;
    warmup_pt: string;
    warmup_exercises: WarmupCooldownExercise[];
    cooldown_pt: string;
    cooldown_exercises: WarmupCooldownExercise[];
    exercises: Array<{
      name: string;
      name_pt: string;
      sequence_order: number;
      sets: number;
      reps_or_time: string;
      equipment_used: string;
    }>;
  }>;
  nutrition_plan_7_days: Array<{
    day: number;
    total_daily_calories: number;
    total_daily_macros: string;
    meals: Array<{
      meal_time_pt: string;
      description_pt: string;
      main_ingredients_pt: string;
      recipe_pt: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      ingredients?: Array<{
        name_pt: string;
        quantity: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      }>;
    }>;
  }>;
  hydration_guidelines_pt: {
    water_target_ml: number;
    notification_schedule_pt: string;
  };
}

export async function generateFitnessPlan(
  userProfile: UserProfile, 
  options?: { 
    timePerDay?: number; 
    difficulty?: string; 
    lastFeedback?: string;
  }
): Promise<GeneratedPlan> {
  // Default options
  const timePerDay = options?.timePerDay || 45;
  const difficulty = options?.difficulty || "Médio";
  const lastFeedback = options?.lastFeedback || "N/A";

  // Calculate BMR using Mifflin-St Jeor Equation
  const bmr =
    userProfile.sex === "Male"
      ? 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age + 5
      : 10 * userProfile.weight + 6.25 * userProfile.height - 5 * userProfile.age - 161;

  // Calculate TDEE based on activity level (ACSM activity factors)
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
  };
  const tdee = Math.round(bmr * (activityMultipliers[userProfile.activityLevel] || 1.2));

  // Adjust calories based on goal (±300-500 kcal as per ISSN guidelines)
  let targetCalories = tdee;
  if (userProfile.goal === "loss") {
    targetCalories = Math.round(tdee - 400); // 400 kcal deficit for sustainable loss
  } else if (userProfile.goal === "muscle") {
    targetCalories = Math.round(tdee + 300); // 300 kcal surplus for lean gains
  }

  // Calculate macro targets based on goal (ISSN/DGA guidelines)
  let macroTargets = { protein: 25, carbs: 50, fat: 25 };
  if (userProfile.goal === "muscle") {
    macroTargets = { protein: 40, carbs: 35, fat: 25 }; // Higher protein for hypertrophy
  } else if (userProfile.goal === "loss") {
    macroTargets = { protein: 35, carbs: 35, fat: 30 }; // Higher protein for satiety
  }

  // Calculate water target (~35ml/kg body weight per EFSA guidelines)
  const waterTarget = Math.round(userProfile.weight * 35);

  // Map goal to Portuguese
  const goalPt: Record<string, string> = {
    loss: "Perda de Peso",
    muscle: "Ganho de Massa Muscular e Hipertrofia",
    gain: "Ganho de Peso e Definição Corporal",
    endurance: "Resistência e Condicionamento Cardiovascular",
  };
  const userGoalPt = goalPt[userProfile.goal] || "Melhoria Geral de Fitness";

  // Map activity level to Portuguese
  const activityLevelPt: Record<string, string> = {
    sedentary: "Sedentário (pouco ou nenhum exercício)",
    light: "Levemente Ativo (exercício leve 1-3 dias/semana)",
    moderate: "Moderadamente Ativo (exercício moderado 3-5 dias/semana)",
    very: "Muito Ativo (exercício intenso 6-7 dias/semana)",
  };

  // Map somatotype to Portuguese
  const somatotypePt: Record<string, string> = {
    ectomorph: "Ectomorfo (metabolismo rápido, dificuldade em ganhar peso)",
    mesomorph: "Mesomorfo (facilidade em ganhar músculo, corpo atlético)",
    endomorph: "Endomorfo (metabolismo lento, tendência a acumular gordura)",
  };
  const userSomatotypePt = userProfile.somatotype 
    ? somatotypePt[userProfile.somatotype] || userProfile.somatotype 
    : "Não especificado";

  // Current and target body composition
  const currentBodyCompPt = userProfile.currentBodyComp || "Não especificado";
  const targetBodyCompPt = userProfile.targetBodyComp || "Não especificado";

  // Time per day from profile or options
  const workoutTimePerDay = userProfile.timePerDay || timePerDay;
  
  // Difficulty from profile or options
  const difficultyMap: Record<string, string> = {
    very_easy: "Muito Fácil",
    easy: "Fácil", 
    medium: "Médio",
    hard: "Difícil",
    very_hard: "Muito Difícil",
  };
  const workoutDifficulty = difficultyMap[userProfile.difficulty || ""] || difficulty;

  // Get user's equipment in Portuguese or default
  const userEquipment = userProfile.equipment?.length 
    ? userProfile.equipment.join(", ")
    : "Peso corporal (sem equipamento)";

  // Map user equipment to exercise equipment types
  const equipmentMapping: Record<string, string[]> = {
    "Halteres de 2kg": ["dumbbell", "bodyweight"],
    "Haltere de 4kg": ["dumbbell", "bodyweight"],
    "Haltere de 9kg": ["dumbbell", "bodyweight"],
    "Kettlebell de 6kg": ["kettlebell", "bodyweight"],
    "Titanium Strength SUPREME Leg Press / Hack Squat": ["machine", "bodyweight"],
    "Adidas Home Gym Multi-ginásio": ["cable machine", "bodyweight"],
    "Passadeira com elevação e velocidade ajustáveis": ["treadmill", "bodyweight"],
    "Bicicleta": ["stationary bike", "bodyweight"],
    "Máquina de step": ["step machine", "bodyweight"],
    "Banco Adidas": ["bench", "dumbbell", "bodyweight"],
    "Bola de ginástica": ["gym ball", "bodyweight"],
    "Peso corporal (sem equipamento)": ["bodyweight"],
  };

  // Get equipment types user has access to
  const userEquipmentTypes = new Set<string>(["bodyweight"]);
  (userProfile.equipment || []).forEach(eq => {
    const types = equipmentMapping[eq] || [];
    types.forEach(t => userEquipmentTypes.add(t));
  });

  // Filter exercises based on user's equipment
  const availableExercises = exerciseLibrary.filter(ex => 
    userEquipmentTypes.has(ex.equipment)
  );

  // Generate concise exercise reference - only exercises user can do
  const categoryNamePt: Record<string, string> = {
    chest: "PEITO",
    back: "COSTAS",
    legs: "PERNAS/GLÚTEOS",
    shoulders: "OMBROS",
    arms: "BRAÇOS",
    core: "CORE/ABDOMINAIS",
    cardio: "CARDIO"
  };

  const exerciseLibraryReference = Object.entries(exerciseIdsByCategory).map(([category, ids]) => {
    const exercises = ids
      .map(id => availableExercises.find(e => e.id === id))
      .filter(Boolean)
      .map(ex => `  - "${ex!.namePt}"`)
      .join("\n");
    if (!exercises) return null;
    return `**${categoryNamePt[category] || category.toUpperCase()}:**\n${exercises}`;
  }).filter(Boolean).join("\n\n");

  const systemPrompt = `És um Coach de Saúde e Fitness e Nutricionista Registado certificado com expertise em IA. A tua função principal é analisar perfis detalhados de utilizadores e métricas cientificamente calculadas para gerar planos de fitness de 30 dias **altamente personalizados, seguros e eficazes** e diretrizes nutricionais acompanhantes.

**MODELOS CIENTÍFICOS A UTILIZAR:**
- **Gasto Energético:** Equação de Mifflin-St Jeor (BMR/TDEE) já calculada
- **Nutrição:** Diretrizes ISSN (Sociedade Internacional de Nutrição Desportiva) e DGA (Dietary Guidelines for Americans)
- **Exercício:** Diretrizes ACSM (American College of Sports Medicine) e modelo OPT do NASM
- **Hidratação:** ~35ml/kg de peso corporal, aumentando 125-150% em dias de treino intenso
- **Somatotipos:** Adapta o plano baseado no tipo de corpo (Ectomorfo, Mesomorfo, Endomorfo)

**REGRAS E CONSTRANGIMENTOS CRÍTICOS:**
1. **Segurança Primeiro:** Os planos DEVEM respeitar todos os 'Impedimentos Físicos' e 'Condições de Saúde' fornecidos. NÃO recomende exercícios que conflitem com lesões declaradas (ex: se tiver dor no joelho, evita agachamentos pesados; se tiver problemas nas costas, evita exercícios de alto impacto).
2. **Formato de Output Estrito:** DEVES retornar o output como um único objeto JSON válido que adere estritamente ao Schema JSON fornecido. NÃO incluas comentários, explicações ou texto introdutório fora do bloco JSON.
3. **Aderir ao Tempo:** A duração total do plano de treino por dia deve alinhar-se estritamente com o parâmetro 'Tempo Diário Dedicado', incluindo aquecimento (5 min), arrefecimento (5 min) e períodos de descanso.
4. **Gestão de Recursos:** Podes APENAS recomendar exercícios e equipamentos explicitamente listados na lista 'EQUIPAMENTO DISPONÍVEL'.
5. **Idioma:** TODAS as descrições, nomes de exercícios, receitas e instruções DEVEM ser em **Português (pt-PT)**.
6. **Nutrição Científica:** As receitas e distribuição calórica devem respeitar a Equação de Mifflin-St Jeor e as diretrizes ISSN/DGA para macros.
7. **REGRA DE VARIEDADE:** Você DEVE utilizar a vasta gama de equipamentos disponíveis. Evite a repetição excessiva de exercícios na mesma semana. Priorize a inclusão de exercícios de Core/Estabilidade (Bola de Ginástica) e Isolamento (Home Gym/Halteres) para apoiar os objetivos.

**ADAPTAÇÃO BASEADA NA COMPOSIÇÃO CORPORAL:**
- **Ectomorfo + Ganho de Massa:** Segue diretrizes de Bulking Limpo com treinos de força de alto volume, maiores períodos de descanso, e superávit calórico moderado.
- **Endomorfo + Perda de Peso:** Prioriza déficit calórico com cardio HIIT intercalado, treino de força para manter massa muscular.
- **Mesomorfo:** Pode seguir treinos híbridos de força e cardio com boa resposta.
- **Descrição "Magro com Gordura" (Skinny Fat):** Prioriza Recomposição Corporal - manter calorias próximas da manutenção enquanto aumenta proteína e treino de resistência.
- **Objetivo "Definição Muscular":** Fase de Cutting com déficit moderado, alto volume de treino, cardio estratégico.
- **Objetivo "Ganho de Peso":** Superávit calórico controlado, foco em treino de hipertrofia com cargas progressivas.`;

  const userPrompt = `[INÍCIO DADOS DO CLIENTE]

**1. PERFIL INICIAL E OBJETIVOS:**
- Sexo: ${userProfile.sex === "Male" ? "Masculino" : "Feminino"}
- Idade: ${userProfile.age} anos
- Peso: ${userProfile.weight} kg
- Altura: ${userProfile.height} cm
- Nível de Atividade Atual: ${activityLevelPt[userProfile.activityLevel] || "Moderadamente Ativo"}
- Objetivo Desejado: ${userGoalPt}
- Impedimentos Físicos / Condições de Saúde: ${userProfile.impediments || "Nenhum reportado"}
- Dificuldade Desejada do Plano: ${workoutDifficulty} (Opções: Muito Fácil, Fácil, Médio, Difícil, Muito Difícil)

**PARÂMETROS DE COMPOSIÇÃO CORPORAL:**
- **Somatotipo (Base Genética):** ${userSomatotypePt}
- **Descrição Corporal Atual:** ${currentBodyCompPt}
- **Objetivo Corporal Final:** ${targetBodyCompPt}

**2. MÉTRICAS CIENTÍFICAS CALCULADAS (Linha Base - Mifflin-St Jeor):**
- Taxa Metabólica Basal (BMR): ${Math.round(bmr)} kcal
- TDEE Base (com fator de atividade): ${tdee} kcal
- **Meta Calórica Diária (Ajustada para ${userGoalPt}):** ${targetCalories} kcal
- Alvos de Macronutrientes (ISSN/DGA): Proteína: ${macroTargets.protein}%, Carboidratos: ${macroTargets.carbs}%, Gordura: ${macroTargets.fat}%
- Alvo de Hidratação Diária (35ml/kg): ${waterTarget} ml

**3. CONSTRANGIMENTOS DE TREINO (ACSM/OPT):**
- Tempo Diário Dedicado ABSOLUTO: ${workoutTimePerDay} minutos (inclui 5 min aquecimento + 5 min arrefecimento)
- Equipamento Disponível: ${userEquipment}
- Último Feedback de Sessão: ${lastFeedback}

**4. BIBLIOTECA DE EXERCÍCIOS DISPONÍVEIS:**
Usa APENAS exercícios desta biblioteca. Usa o nome em português (namePt) no campo "name_pt" do output.

${exerciseLibraryReference}

[FIM DADOS DO CLIENTE]

**TAREFA:**

**A. PLANO DE TREINO (15 Dias Completos):**
1. Desenvolve 15 dias completos usando o modelo de Periodização Ondulatória (para variar estímulos) ou o Modelo OPT do NASM (para iniciantes).
2. **OBRIGATÓRIO:** Usa APENAS exercícios da BIBLIOTECA DE EXERCÍCIOS acima. Usa o nome em português exatamente como listado.
3. Cada sessão DEVE incluir exercícios individuais de Aquecimento (total ~5 min) no array "warmup_exercises" e Alongamento/Arrefecimento (total ~5 min) no array "cooldown_exercises". Cada exercício deve ter nome, duração em segundos, e descrição.
4. Inclui pelo menos 4-5 dias de descanso ativo ou completo nos 15 dias para recuperação adequada.
5. Para cada exercício, estima as calorias queimadas para a sessão completa baseado na intensidade e peso do utilizador (${userProfile.weight}kg).
6. Ajusta a intensidade baseado na dificuldade desejada: ${workoutDifficulty}.
7. Se houver último feedback (${lastFeedback}), ajusta a intensidade conforme necessário.
8. **PRIORIZA** equipamentos que o utilizador possui: ${userEquipment}.
9. **EXIGÊNCIA DE DIVERSIDADE:** O plano de 15 dias DEVE utilizar a Máquina Multifuncional (Home Gym) em pelo menos 4 sessões e a Bola de Ginástica para Core ou Estabilidade em pelo menos 5 sessões.
10. **EQUIPMENT_USED OBRIGATÓRIO:** Para cada exercício, o campo "equipment_used" DEVE especificar o equipamento real da lista disponível:
    - Exercícios com máquinas/cabos: usa "Adidas Home Gym Multi-ginásio"
    - Exercícios de pernas com máquina: usa "Titanium Strength SUPREME Leg Press / Hack Squat" ou "Adidas Home Gym Multi-ginásio"
    - Exercícios com halteres: usa "Halteres de 2kg", "Haltere de 4kg" ou "Haltere de 9kg"
    - Exercícios com kettlebell: usa "Kettlebell de 6kg"
    - Exercícios sem equipamento: usa "Peso corporal"
    - NUNCA deixes "equipment_used" vazio ou com "Sem equipamento" se o exercício requer equipamento.

**B. PLANO DE NUTRIÇÃO (7 Dias Completos com Receitas):**
1. Cria 7 dias de plano de refeições com 6 refeições/dia:
   - Pequeno Almoço, Lanche Manhã, Almoço, Lanche Tarde, Jantar, Ceia
2. O total calórico diário DEVE estar dentro de ±50 kcal da meta (${targetCalories} kcal).
3. Respeita estritamente os alvos de macros (P:${macroTargets.protein}%, C:${macroTargets.carbs}%, G:${macroTargets.fat}%).
4. Baseia-te em **alimentos integrais** e inclui opções típicas portuguesas (peixe, carne, ovos, verduras, carboidratos).
5. **RECEITAS OBRIGATÓRIAS:** Para Almoço e Jantar, INCLUI receita detalhada no campo "recipe_pt" com: ingredientes com quantidades, passo-a-passo de preparação, tempo de cozedura. Para lanches e pequeno-almoço, inclui instruções simples de preparação.
6. **SUPLEMENTAÇÃO DE WHEY PROTEIN:** Para objetivos de ganho de massa muscular ou ganho de peso, INCLUI Whey Protein Isolado de alta qualidade (ex: Prozis 100% Real Whey Isolate) em 1-2 refeições por dia (pós-treino e/ou lanche). Dose: 25-30g por porção.
7. **INGREDIENTES DETALHADOS OBRIGATÓRIO:** Para Almoço e Jantar, INCLUI o campo "ingredients" com array detalhado de cada ingrediente contendo: nome (name_pt), quantidade exata (quantity), calorias, proteína, carboidratos e gordura de cada ingrediente individual. Exemplo: {"name_pt": "Peito de Frango", "quantity": "200g", "calories": 220, "protein_g": 46, "carbs_g": 0, "fat_g": 2.6}

**C. DIRETRIZES DE HIDRATAÇÃO:**
1. Meta de água: ${waterTarget} ml por dia
2. Inclui um horário de notificação sugerido (e.g., "A cada 90 minutos entre as 8h e as 20h")

**OUTPUT JSON REQUERIDO (Segue este schema EXATAMENTE):**
{
  "plan_summary_pt": "Resumo breve da estratégia geral do plano",
  "fitness_plan_15_days": [
    {
      "day": 1,
      "is_rest_day": false,
      "workout_name_pt": "Nome do treino em português",
      "duration_minutes": ${workoutTimePerDay},
      "estimated_calories_burnt": 300,
      "focus_pt": "Cardio/Força/Full Body/Descanso Ativo",
      "warmup_pt": "5 minutos de aquecimento dinâmico",
      "warmup_exercises": [
        {"name": "High Knees", "name_pt": "Joelhos Altos", "duration_seconds": 60, "description_pt": "Correr no lugar elevando os joelhos ao peito"},
        {"name": "Arm Circles", "name_pt": "Rotações de Braços", "duration_seconds": 45, "description_pt": "Rotações circulares com os braços estendidos"},
        {"name": "Bodyweight Squat", "name_pt": "Agachamento Livre", "duration_seconds": 60, "description_pt": "Agachamentos sem peso, movimento controlado"},
        {"name": "Jumping Jacks", "name_pt": "Polichinelo", "duration_seconds": 45, "description_pt": "Polichinelos para aumentar ritmo cardíaco"},
        {"name": "Hip Circles", "name_pt": "Rotações de Anca", "duration_seconds": 45, "description_pt": "Rotações circulares das ancas"}
      ],
      "cooldown_pt": "5 minutos de alongamento estático",
      "cooldown_exercises": [
        {"name": "Quad Stretch", "name_pt": "Alongamento de Quadríceps", "duration_seconds": 45, "description_pt": "Puxar pé para trás, alongando coxa"},
        {"name": "Hamstring Stretch", "name_pt": "Alongamento de Isquiotibiais", "duration_seconds": 45, "description_pt": "Inclinar tronco para tocar nos pés"},
        {"name": "Chest Stretch", "name_pt": "Alongamento de Peito", "duration_seconds": 45, "description_pt": "Braços para trás, abrir o peito"},
        {"name": "Back Stretch", "name_pt": "Alongamento de Costas", "duration_seconds": 45, "description_pt": "Abraçar os joelhos ao peito"},
        {"name": "Deep Breathing", "name_pt": "Respiração Profunda", "duration_seconds": 60, "description_pt": "Inspirar e expirar profundamente"}
      ],
      "exercises": [
        {
          "name": "Nome em inglês do exercício",
          "name_pt": "Nome do exercício em português",
          "sequence_order": 1,
          "sets": 3,
          "reps_or_time": "12 repetições",
          "equipment_used": "Halteres de 4kg"
        }
      ]
    }
  ],
  "nutrition_plan_7_days": [
    {
      "day": 1,
      "total_daily_calories": ${targetCalories},
      "total_daily_macros": "Proteína: Xg, Carboidratos: Xg, Gordura: Xg",
      "meals": [
        {
          "meal_time_pt": "Almoço",
          "description_pt": "Frango grelhado com arroz integral e legumes",
          "main_ingredients_pt": "200g peito de frango, 100g arroz integral, brócolos, cenoura",
          "recipe_pt": "1. Temperar o frango com sal, pimenta e ervas. 2. Grelhar o frango 6-7 min de cada lado. 3. Cozer o arroz conforme instruções. 4. Cozer os legumes a vapor 5 min. 5. Servir tudo junto.",
          "calories": 450,
          "protein_g": 40,
          "carbs_g": 45,
          "fat_g": 10,
          "ingredients": [
            {"name_pt": "Peito de Frango", "quantity": "200g", "calories": 220, "protein_g": 46, "carbs_g": 0, "fat_g": 2.6},
            {"name_pt": "Arroz Integral", "quantity": "100g", "calories": 130, "protein_g": 2.7, "carbs_g": 27, "fat_g": 1},
            {"name_pt": "Brócolos", "quantity": "80g", "calories": 27, "protein_g": 2.3, "carbs_g": 4.3, "fat_g": 0.3},
            {"name_pt": "Cenoura", "quantity": "50g", "calories": 20, "protein_g": 0.5, "carbs_g": 4.5, "fat_g": 0.1}
          ]
        }
      ]
    }
  ],
  "hydration_guidelines_pt": {
    "water_target_ml": ${waterTarget},
    "notification_schedule_pt": "A cada 90 minutos entre as 8h e as 20h"
  }
}

IMPORTANTE: O total calórico de cada dia de nutrição DEVE estar dentro de ±50 kcal de ${targetCalories} kcal.`;

  const jsonSchema = {
    name: "fitness_plan_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        plan_summary_pt: { type: "string" },
        fitness_plan_15_days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "integer" },
              is_rest_day: { type: "boolean" },
              workout_name_pt: { type: "string" },
              duration_minutes: { type: "integer" },
              estimated_calories_burnt: { type: "integer" },
              focus_pt: { type: "string" },
              warmup_pt: { type: "string" },
              warmup_exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    name_pt: { type: "string" },
                    duration_seconds: { type: "integer" },
                    description_pt: { type: "string" }
                  },
                  required: ["name", "name_pt", "duration_seconds", "description_pt"],
                  additionalProperties: false
                }
              },
              cooldown_pt: { type: "string" },
              cooldown_exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    name_pt: { type: "string" },
                    duration_seconds: { type: "integer" },
                    description_pt: { type: "string" }
                  },
                  required: ["name", "name_pt", "duration_seconds", "description_pt"],
                  additionalProperties: false
                }
              },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    name_pt: { type: "string" },
                    sequence_order: { type: "integer" },
                    sets: { type: "integer" },
                    reps_or_time: { type: "string" },
                    equipment_used: { type: "string" }
                  },
                  required: ["name", "name_pt", "sequence_order", "sets", "reps_or_time", "equipment_used"],
                  additionalProperties: false
                }
              }
            },
            required: ["day", "is_rest_day", "workout_name_pt", "duration_minutes", "estimated_calories_burnt", "focus_pt", "warmup_pt", "warmup_exercises", "cooldown_pt", "cooldown_exercises", "exercises"],
            additionalProperties: false
          }
        },
        nutrition_plan_7_days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "integer" },
              total_daily_calories: { type: "integer" },
              total_daily_macros: { type: "string" },
              meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    meal_time_pt: { type: "string" },
                    description_pt: { type: "string" },
                    main_ingredients_pt: { type: "string" },
                    recipe_pt: { type: "string" },
                    calories: { type: "integer" },
                    protein_g: { type: "number" },
                    carbs_g: { type: "number" },
                    fat_g: { type: "number" },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name_pt: { type: "string" },
                          quantity: { type: "string" },
                          calories: { type: "integer" },
                          protein_g: { type: "number" },
                          carbs_g: { type: "number" },
                          fat_g: { type: "number" }
                        },
                        required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "recipe_pt", "calories", "protein_g", "carbs_g", "fat_g", "ingredients"],
                  additionalProperties: false
                }
              }
            },
            required: ["day", "total_daily_calories", "total_daily_macros", "meals"],
            additionalProperties: false
          }
        },
        hydration_guidelines_pt: {
          type: "object",
          properties: {
            water_target_ml: { type: "integer" },
            notification_schedule_pt: { type: "string" }
          },
          required: ["water_target_ml", "notification_schedule_pt"],
          additionalProperties: false
        }
      },
      required: ["plan_summary_pt", "fitness_plan_15_days", "nutrition_plan_7_days", "hydration_guidelines_pt"],
      additionalProperties: false
    }
  };

  try {
    const apiVersion = config.apiVersion || "2024-08-01-preview";
    const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${apiVersion}`;
    
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
        response_format: { 
          type: "json_schema",
          json_schema: jsonSchema
        },
        temperature: 1,
        max_completion_tokens: 32000,
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

// Interface for meal data
export interface MealData {
  meal_time_pt: string;
  description_pt: string;
  main_ingredients_pt: string;
  recipe_pt: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients?: Array<{
    name_pt: string;
    quantity: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>;
}

// Interface for meal targets
export interface MealTargets {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  mealTime: string;
}

// Generate meal swap alternatives
export async function generateMealSwapAlternatives(
  targets: MealTargets,
  originalMeal: MealData,
  language: string = "pt"
): Promise<{ alternatives: MealData[] }> {
  const isPt = language === "pt";
  
  const systemPrompt = isPt
    ? `És um Nutricionista Registado especializado em planificação de refeições. A tua tarefa é gerar 3 alternativas de refeição que correspondam aos mesmos alvos nutricionais da refeição original.

REGRAS CRÍTICAS:
1. Cada alternativa DEVE ter calorias dentro de ±50 kcal do alvo
2. Os macros devem ser similares à refeição original (±5g para proteína/carbs/gordura)
3. Usa ingredientes portugueses comuns e acessíveis
4. Para Almoço/Jantar, inclui receita detalhada
5. Mantém a mesma refeição do dia (${targets.mealTime})
6. As alternativas devem ser diferentes entre si e da original
7. TODAS as descrições e receitas devem estar em Português (pt-PT)`
    : `You are a Registered Nutritionist specialized in meal planning. Your task is to generate 3 meal alternatives that match the same nutritional targets as the original meal.

CRITICAL RULES:
1. Each alternative MUST have calories within ±50 kcal of the target
2. Macros should be similar to the original meal (±5g for protein/carbs/fat)
3. Use common, accessible ingredients
4. For Lunch/Dinner, include detailed recipe
5. Keep the same meal time (${targets.mealTime})
6. Alternatives should be different from each other and the original
7. ALL descriptions and recipes should be in English`;

  const userPrompt = isPt
    ? `REFEIÇÃO ORIGINAL:
- Hora: ${originalMeal.meal_time_pt}
- Descrição: ${originalMeal.description_pt}
- Calorias: ${originalMeal.calories} kcal
- Proteína: ${originalMeal.protein_g}g
- Carboidratos: ${originalMeal.carbs_g}g
- Gordura: ${originalMeal.fat_g}g

ALVOS NUTRICIONAIS:
- Calorias alvo: ${targets.targetCalories} kcal (±50)
- Proteína alvo: ${targets.targetProtein}g
- Carboidratos alvo: ${targets.targetCarbs}g
- Gordura alvo: ${targets.targetFat}g

Gera 3 alternativas diferentes em formato JSON.`
    : `ORIGINAL MEAL:
- Time: ${originalMeal.meal_time_pt}
- Description: ${originalMeal.description_pt}
- Calories: ${originalMeal.calories} kcal
- Protein: ${originalMeal.protein_g}g
- Carbs: ${originalMeal.carbs_g}g
- Fat: ${originalMeal.fat_g}g

NUTRITIONAL TARGETS:
- Target calories: ${targets.targetCalories} kcal (±50)
- Target protein: ${targets.targetProtein}g
- Target carbs: ${targets.targetCarbs}g
- Target fat: ${targets.targetFat}g

Generate 3 different alternatives in JSON format.`;

  const jsonSchema = {
    name: "meal_alternatives_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        alternatives: {
          type: "array",
          items: {
            type: "object",
            properties: {
              meal_time_pt: { type: "string" },
              description_pt: { type: "string" },
              main_ingredients_pt: { type: "string" },
              recipe_pt: { type: "string" },
              calories: { type: "integer" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name_pt: { type: "string" },
                    quantity: { type: "string" },
                    calories: { type: "integer" },
                    protein_g: { type: "number" },
                    carbs_g: { type: "number" },
                    fat_g: { type: "number" }
                  },
                  required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
                  additionalProperties: false
                }
              }
            },
            required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "recipe_pt", "calories", "protein_g", "carbs_g", "fat_g", "ingredients"],
            additionalProperties: false
          }
        }
      },
      required: ["alternatives"],
      additionalProperties: false
    }
  };

  try {
    const apiVersion = config.apiVersion || "2024-08-01-preview";
    const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${apiVersion}`;
    
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
        response_format: { 
          type: "json_schema",
          json_schema: jsonSchema
        },
        temperature: 1,
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Debug: Log the full response structure
    console.log("Meal swap API response:", JSON.stringify({
      finish_reason: data.choices?.[0]?.finish_reason,
      refusal: data.choices?.[0]?.message?.refusal,
      content_length: data.choices?.[0]?.message?.content?.length,
      usage: data.usage
    }));
    
    const choice = data.choices?.[0];
    
    // Check for content filter or refusal
    if (choice?.finish_reason === "content_filter") {
      throw new Error("Azure OpenAI content filter triggered - try rephrasing the meal request");
    }
    
    if (choice?.finish_reason === "length") {
      throw new Error("Response was truncated - meal alternatives too complex");
    }
    
    if (choice?.message?.refusal) {
      throw new Error(`Azure OpenAI refused: ${choice.message.refusal}`);
    }
    
    const content = choice?.message?.content;

    if (!content) {
      console.error("Full Azure response with no content:", JSON.stringify(data, null, 2));
      throw new Error("No content in Azure OpenAI response - check server logs for details");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating meal alternatives:", error);
    throw error;
  }
}

// Token limits for progressive retry - starts high, increases on failure
const TOKEN_LEVELS = [8000, 12000, 16000, 24000, 32000];

// Generate meal from user ingredients with progressive token retry
export async function generateMealFromIngredients(
  targets: MealTargets,
  ingredients: string[],
  language: string = "pt"
): Promise<{ meal: MealData }> {
  const isPt = language === "pt";
  
  const systemPrompt = isPt
    ? `Cria uma refeição SIMPLES e realista do dia-a-dia.

REGRAS IMPORTANTES:
1. Usa 2-4 ingredientes da lista com QUANTIDADES REALISTAS (ex: 80-100g carne, 30-40g fiambre, 150g arroz cozido)
2. Prioriza porções normais - ninguém come 120g de fiambre numa sandes!
3. Calorias aproximadas: ${targets.targetCalories} kcal (±150 está OK - porções realistas são mais importantes)
4. Preparação em 2-3 passos curtos
5. Refeição: ${targets.mealTime}
6. Português (pt-PT)`
    : `Create a SIMPLE, realistic everyday meal.

RULES:
1. Use 2-4 ingredients with REALISTIC portions (e.g. 80-100g meat, 30-40g deli meat, 150g cooked rice)
2. Prioritize normal portions - nobody eats 120g of ham in a sandwich!
3. Approximate calories: ${targets.targetCalories} kcal (±150 is OK - realistic portions matter more)
4. Preparation in 2-3 short steps
5. Meal time: ${targets.mealTime}
6. English`;

  const userPrompt = isPt
    ? `Ingredientes: ${ingredients.join(', ')}
Meta: ~${targets.targetCalories} kcal, ~${targets.targetProtein}g proteína

Cria 1 refeição simples.`
    : `Ingredients: ${ingredients.join(', ')}
Target: ~${targets.targetCalories} kcal, ~${targets.targetProtein}g protein

Create 1 simple meal.`;

  const jsonSchema = {
    name: "meal_from_ingredients_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        meal: {
          type: "object",
          properties: {
            meal_time_pt: { type: "string" },
            description_pt: { type: "string" },
            main_ingredients_pt: { type: "string" },
            recipe_pt: { type: "string" },
            calories: { type: "integer" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name_pt: { type: "string" },
                  quantity: { type: "string" },
                  calories: { type: "integer" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" }
                },
                required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
                additionalProperties: false
              }
            }
          },
          required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "recipe_pt", "calories", "protein_g", "carbs_g", "fat_g", "ingredients"],
          additionalProperties: false
        }
      },
      required: ["meal"],
      additionalProperties: false
    }
  };

  const apiVersion = config.apiVersion || "2024-08-01-preview";
  const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${apiVersion}`;
  
  let lastError: Error | null = null;
  
  // Progressive retry with increasing tokens
  for (let attempt = 0; attempt < TOKEN_LEVELS.length; attempt++) {
    const maxTokens = TOKEN_LEVELS[attempt];
    console.log(`=== MEAL GENERATION ATTEMPT ${attempt + 1}/${TOKEN_LEVELS.length} with ${maxTokens} tokens ===`);
    
    try {
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
          response_format: { 
            type: "json_schema",
            json_schema: jsonSchema
          },
          temperature: 1,
          max_completion_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If it's a token limit error, try next level
        if (errorText.includes("max_tokens") || errorText.includes("context_length")) {
          console.log(`Token limit error at ${maxTokens}, trying higher...`);
          lastError = new Error(`Token limit at ${maxTokens}: ${errorText}`);
          continue;
        }
        throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      console.log("Response status:", {
        finish_reason: data.choices?.[0]?.finish_reason,
        content_length: data.choices?.[0]?.message?.content?.length,
        usage: data.usage
      });
      
      const choice = data.choices?.[0];
      
      // Check for content filter
      if (choice?.finish_reason === "content_filter") {
        throw new Error("Azure OpenAI content filter triggered - try different ingredients");
      }
      
      // If truncated, try with more tokens
      if (choice?.finish_reason === "length") {
        console.log(`Response truncated at ${maxTokens} tokens, trying higher...`);
        lastError = new Error(`Response truncated at ${maxTokens} tokens`);
        continue;
      }
      
      if (choice?.message?.refusal) {
        throw new Error(`Azure OpenAI refused: ${choice.message.refusal}`);
      }
      
      const content = choice?.message?.content;

      // If no content, try with more tokens
      if (!content) {
        console.log(`No content at ${maxTokens} tokens, trying higher...`);
        lastError = new Error(`No content at ${maxTokens} tokens`);
        continue;
      }

      // Success!
      console.log(`=== SUCCESS at ${maxTokens} tokens ===`);
      return JSON.parse(content);
      
    } catch (error) {
      lastError = error as Error;
      // Only retry on specific errors, not all
      if ((error as Error).message?.includes("truncated") || 
          (error as Error).message?.includes("token") ||
          (error as Error).message?.includes("No content")) {
        console.log(`Retrying due to: ${(error as Error).message}`);
        continue;
      }
      // For other errors, throw immediately
      throw error;
    }
  }
  
  // All attempts failed
  console.error("All token levels exhausted, last error:", lastError);
  throw lastError || new Error("Failed to generate meal after all retry attempts");
}

// Generate recipe for an existing meal that doesn't have one
export async function generateRecipeForMeal(
  mealDescription: string,
  mainIngredients: string,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number,
  language: string = "pt"
): Promise<{ recipe_pt: string; ingredients: Array<{ name_pt: string; quantity: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }> }> {
  const isPt = language === "pt";
  
  const systemPrompt = isPt
    ? `És um chef nutricional. Cria uma receita detalhada para a refeição descrita.

REGRAS:
1. Usa os ingredientes indicados com quantidades exatas em gramas
2. Cria passos de preparação numerados (1., 2., 3., etc.)
3. Os macros dos ingredientes devem somar aproximadamente: ${targetCalories} kcal, ${targetProtein}g proteína, ${targetCarbs}g carboidratos, ${targetFat}g gordura
4. Português (pt-PT)`
    : `You are a nutritional chef. Create a detailed recipe for the described meal.

RULES:
1. Use the listed ingredients with exact quantities in grams
2. Create numbered preparation steps (1., 2., 3., etc.)
3. Ingredient macros should sum to approximately: ${targetCalories} kcal, ${targetProtein}g protein, ${targetCarbs}g carbs, ${targetFat}g fat
4. English`;

  const userPrompt = isPt
    ? `Refeição: ${mealDescription}
Ingredientes principais: ${mainIngredients}
Meta nutricional: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, G:${targetFat}g

Cria a receita completa com lista de ingredientes detalhada.`
    : `Meal: ${mealDescription}
Main ingredients: ${mainIngredients}
Nutritional target: ${targetCalories} kcal, P:${targetProtein}g, C:${targetCarbs}g, F:${targetFat}g

Create the complete recipe with detailed ingredient list.`;

  const jsonSchema = {
    name: "recipe_response",
    strict: true,
    schema: {
      type: "object",
      properties: {
        recipe_pt: { type: "string" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name_pt: { type: "string" },
              quantity: { type: "string" },
              calories: { type: "integer" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" }
            },
            required: ["name_pt", "quantity", "calories", "protein_g", "carbs_g", "fat_g"],
            additionalProperties: false
          }
        }
      },
      required: ["recipe_pt", "ingredients"],
      additionalProperties: false
    }
  };

  const apiVersion = config.apiVersion || "2024-08-01-preview";
  const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${apiVersion}`;
  
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
      response_format: { 
        type: "json_schema",
        json_schema: jsonSchema
      },
      temperature: 1,
      max_completion_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("[generateRecipeForMeal] Response data:", JSON.stringify(data, null, 2).substring(0, 500));
  
  const choice = data.choices?.[0];
  
  if (choice?.finish_reason === "content_filter") {
    console.error("[generateRecipeForMeal] Content filter triggered");
    throw new Error("Content filter triggered");
  }
  
  if (choice?.finish_reason === "length") {
    console.error("[generateRecipeForMeal] Response truncated due to length limit");
  }
  
  if (choice?.message?.refusal) {
    console.error("[generateRecipeForMeal] Request refused:", choice.message.refusal);
    throw new Error(`Request refused: ${choice.message.refusal}`);
  }
  
  const content = choice?.message?.content;
  if (!content) {
    console.error("[generateRecipeForMeal] No content in response. Full data:", JSON.stringify(data));
    throw new Error("No content in response - the AI may have failed to generate a recipe");
  }

  return JSON.parse(content);
}

// Validate weight goal - fast local calculation (no AI needed)
export interface WeightGoalValidation {
  status: "possible" | "challenging" | "not_possible";
  weeklyChange: number;
}

export async function validateWeightGoal(params: {
  currentWeight: number;
  targetWeight: number;
  weeks: number;
  sex: string;
  age: number;
  height: number;
  goal: string; // "loss" or "gain"
  activityLevel: string;
  language?: string;
}): Promise<WeightGoalValidation> {
  const { currentWeight, targetWeight, weeks, goal } = params;
  
  const weightDiff = Math.abs(targetWeight - currentWeight);
  const weeklyChange = weightDiff / weeks;
  
  // Scientific guidelines:
  // - Healthy weight loss: 0.5-1 kg/week
  // - Weight/muscle gain: 0.25-0.5 kg/week
  
  let status: "possible" | "challenging" | "not_possible";
  
  if (goal === "loss") {
    if (weeklyChange <= 0.75) {
      status = "possible";
    } else if (weeklyChange <= 1.2) {
      status = "challenging";
    } else {
      status = "not_possible";
    }
  } else {
    // gain
    if (weeklyChange <= 0.4) {
      status = "possible";
    } else if (weeklyChange <= 0.6) {
      status = "challenging";
    } else {
      status = "not_possible";
    }
  }
  
  return { status, weeklyChange };
}

export interface CoachingTipsInput {
  daysCompleted: number;
  totalDays: number;
  currentStreak: number;
  difficultyFeedback: { easy: number; justRight: number; hard: number };
  lastWorkoutDate: Date | null;
  goal: string;
  firstName: string;
  language: string;
}

export interface CoachingTipsResult {
  motivationalMessage: string;
  coachingTip: string;
  streakMessage: string | null;
  progressPercentage: number;
}

export async function generateCoachingTips(input: CoachingTipsInput): Promise<CoachingTipsResult> {
  const isPt = input.language === "pt";
  const progressPercentage = Math.min(100, Math.round((input.daysCompleted / input.totalDays) * 100));
  
  // Calculate days since last workout
  let daysSinceLastWorkout = 0;
  if (input.lastWorkoutDate) {
    daysSinceLastWorkout = Math.floor((Date.now() - new Date(input.lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Determine user state
  let userState = "starting";
  if (input.daysCompleted === 0) {
    userState = "starting";
  } else if (daysSinceLastWorkout > 3) {
    userState = "returning";
  } else if (progressPercentage >= 80) {
    userState = "finishing";
  } else if (progressPercentage >= 40) {
    userState = "midway";
  } else {
    userState = "building";
  }
  
  // Calculate difficulty trend
  const totalFeedback = input.difficultyFeedback.easy + input.difficultyFeedback.justRight + input.difficultyFeedback.hard;
  let difficultyTrend = "balanced";
  if (totalFeedback > 0) {
    if (input.difficultyFeedback.hard > totalFeedback * 0.5) {
      difficultyTrend = "too_hard";
    } else if (input.difficultyFeedback.easy > totalFeedback * 0.5) {
      difficultyTrend = "too_easy";
    }
  }

  const goalPt: Record<string, string> = {
    loss: "perda de peso",
    muscle: "ganho muscular",
    gain: "ganho de peso",
    endurance: "resistência"
  };
  const goalEn: Record<string, string> = {
    loss: "weight loss",
    muscle: "muscle gain",
    gain: "weight gain",
    endurance: "endurance"
  };

  const systemPrompt = isPt 
    ? `És um coach de fitness motivacional e empático. A tua função é dar mensagens curtas, personalizadas e encorajadoras baseadas no progresso do utilizador. Responde SEMPRE em português europeu (pt-PT).`
    : `You are a motivational and empathetic fitness coach. Your role is to give short, personalized, and encouraging messages based on user progress. Always respond in English.`;

  const userPrompt = isPt
    ? `Gera mensagens de coaching personalizadas para ${input.firstName}.

DADOS DO PROGRESSO:
- Dias completados: ${input.daysCompleted} de ${input.totalDays} (${progressPercentage}%)
- Sequência atual (streak): ${input.currentStreak} dias consecutivos
- Dias desde último treino: ${daysSinceLastWorkout}
- Estado do utilizador: ${userState}
- Objetivo: ${goalPt[input.goal] || input.goal}
- Tendência de dificuldade: ${difficultyTrend === "too_hard" ? "treinos muito difíceis" : difficultyTrend === "too_easy" ? "treinos muito fáceis" : "equilibrado"}
- Feedback de dificuldade: ${input.difficultyFeedback.easy} fáceis, ${input.difficultyFeedback.justRight} adequados, ${input.difficultyFeedback.hard} difíceis

REGRAS:
1. Mensagem motivacional: 1-2 frases curtas e energéticas, personalizadas para o estado atual
2. Dica de coaching: 1 dica prática relacionada com o objetivo ou progresso
3. Mensagem de streak: Só se tiver 3+ dias consecutivos, celebra a consistência (ou null)
4. Adapta o tom: encorajador para quem começa, celebratório para progressos, compreensivo para quem volta

OUTPUT JSON (sem explicações):
{
  "motivationalMessage": "...",
  "coachingTip": "...",
  "streakMessage": "..." ou null
}`
    : `Generate personalized coaching messages for ${input.firstName}.

PROGRESS DATA:
- Days completed: ${input.daysCompleted} of ${input.totalDays} (${progressPercentage}%)
- Current streak: ${input.currentStreak} consecutive days
- Days since last workout: ${daysSinceLastWorkout}
- User state: ${userState}
- Goal: ${goalEn[input.goal] || input.goal}
- Difficulty trend: ${difficultyTrend === "too_hard" ? "workouts too hard" : difficultyTrend === "too_easy" ? "workouts too easy" : "balanced"}
- Difficulty feedback: ${input.difficultyFeedback.easy} easy, ${input.difficultyFeedback.justRight} just right, ${input.difficultyFeedback.hard} hard

RULES:
1. Motivational message: 1-2 short, energetic sentences, personalized to current state
2. Coaching tip: 1 practical tip related to goal or progress
3. Streak message: Only if 3+ consecutive days, celebrate consistency (or null)
4. Adapt tone: encouraging for starters, celebratory for progress, understanding for returners

OUTPUT JSON (no explanations):
{
  "motivationalMessage": "...",
  "coachingTip": "...",
  "streakMessage": "..." or null
}`;

  try {
    const apiVersion = "2025-01-01-preview";
    const url = `${config.endpoint}openai/deployments/${config.deployment}/chat/completions?api-version=${apiVersion}`;
    
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
        temperature: 1,
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[coaching] Azure error response:", errorText);
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[coaching] Unexpected Azure response structure:", JSON.stringify(data, null, 2));
      throw new Error("No content in Azure OpenAI response");
    }

    const result = JSON.parse(content);
    return {
      motivationalMessage: result.motivationalMessage,
      coachingTip: result.coachingTip,
      streakMessage: result.streakMessage,
      progressPercentage
    };
  } catch (error) {
    console.error("Error generating coaching tips:", error);
    // Fallback messages
    return generateFallbackCoachingTips(input, progressPercentage, isPt);
  }
}

function generateFallbackCoachingTips(input: CoachingTipsInput, progressPercentage: number, isPt: boolean): CoachingTipsResult {
  let motivationalMessage = "";
  let coachingTip = "";
  let streakMessage: string | null = null;

  if (input.daysCompleted === 0) {
    motivationalMessage = isPt 
      ? `${input.firstName}, hoje é o dia perfeito para começar a tua transformação!`
      : `${input.firstName}, today is the perfect day to start your transformation!`;
    coachingTip = isPt
      ? "Começa devagar e foca na consistência, não na intensidade."
      : "Start slow and focus on consistency, not intensity.";
  } else if (progressPercentage >= 80) {
    motivationalMessage = isPt
      ? `Estás quase lá, ${input.firstName}! ${progressPercentage}% do plano completado!`
      : `Almost there, ${input.firstName}! ${progressPercentage}% of the plan completed!`;
    coachingTip = isPt
      ? "Mantém o foco na reta final. Os últimos dias fazem toda a diferença!"
      : "Stay focused in the final stretch. The last days make all the difference!";
  } else if (progressPercentage >= 40) {
    motivationalMessage = isPt
      ? `Excelente progresso, ${input.firstName}! Estás a meio caminho!`
      : `Excellent progress, ${input.firstName}! You're halfway there!`;
    coachingTip = isPt
      ? "O teu corpo está a adaptar-se. Continua a desafiar-te!"
      : "Your body is adapting. Keep challenging yourself!";
  } else {
    motivationalMessage = isPt
      ? `Boa, ${input.firstName}! Cada treino conta. Continua assim!`
      : `Great job, ${input.firstName}! Every workout counts. Keep it up!`;
    coachingTip = isPt
      ? "A consistência é a chave. Pequenos progressos levam a grandes resultados."
      : "Consistency is key. Small progress leads to big results.";
  }

  if (input.currentStreak >= 7) {
    streakMessage = isPt
      ? `Impressionante! ${input.currentStreak} dias consecutivos de treino!`
      : `Impressive! ${input.currentStreak} consecutive days of training!`;
  } else if (input.currentStreak >= 3) {
    streakMessage = isPt
      ? `${input.currentStreak} dias seguidos! Estás a criar um hábito!`
      : `${input.currentStreak} days in a row! You're building a habit!`;
  }

  return {
    motivationalMessage,
    coachingTip,
    streakMessage,
    progressPercentage
  };
}

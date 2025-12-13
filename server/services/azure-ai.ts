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

export interface GeneratedPlan {
  plan_summary_pt: string;
  fitness_plan_7_days: Array<{
    day: number;
    is_rest_day: boolean;
    workout_name_pt: string;
    duration_minutes: number;
    estimated_calories_burnt: number;
    focus_pt: string;
    exercises: Array<{
      name_pt: string;
      sequence_order: number;
      sets: number;
      reps_or_time_pt: string;
      equipment_used_pt: string;
      image_link: string;
      video_link: string;
    }>;
  }>;
  nutrition_plan_3_days: Array<{
    day: number;
    total_daily_calories: number;
    total_daily_macros: string;
    meals: Array<{
      meal_time_pt: string;
      description_pt: string;
      main_ingredients_pt: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
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
  const goalPt = userProfile.goal === "loss" 
    ? "Perda de Peso" 
    : userProfile.goal === "muscle" 
    ? "Ganho de Massa Muscular e Hipertrofia" 
    : "Resistência e Condicionamento Cardiovascular";

  // Map activity level to Portuguese
  const activityLevelPt: Record<string, string> = {
    sedentary: "Sedentário (pouco ou nenhum exercício)",
    light: "Levemente Ativo (exercício leve 1-3 dias/semana)",
    moderate: "Moderadamente Ativo (exercício moderado 3-5 dias/semana)",
    very: "Muito Ativo (exercício intenso 6-7 dias/semana)",
  };

  // Get user's equipment in Portuguese or default
  const userEquipment = userProfile.equipment?.length 
    ? userProfile.equipment.join(", ")
    : "Peso corporal (sem equipamento)";

  const systemPrompt = `És um Coach de Saúde e Fitness e Nutricionista Registado certificado com expertise em IA. A tua função principal é analisar perfis detalhados de utilizadores e métricas cientificamente calculadas para gerar planos de fitness de 30 dias **altamente personalizados, seguros e eficazes** e diretrizes nutricionais acompanhantes.

**MODELOS CIENTÍFICOS A UTILIZAR:**
- **Gasto Energético:** Equação de Mifflin-St Jeor (BMR/TDEE) já calculada
- **Nutrição:** Diretrizes ISSN (Sociedade Internacional de Nutrição Desportiva) e DGA (Dietary Guidelines for Americans)
- **Exercício:** Diretrizes ACSM (American College of Sports Medicine) e modelo OPT do NASM
- **Hidratação:** ~35ml/kg de peso corporal, aumentando 125-150% em dias de treino intenso

**REGRAS E CONSTRANGIMENTOS CRÍTICOS:**
1. **Segurança Primeiro:** Os planos DEVEM respeitar todos os 'Impedimentos Físicos' e 'Condições de Saúde' fornecidos. NÃO recomende exercícios que conflitem com lesões declaradas.
2. **Formato de Output Estrito:** DEVES retornar o output como um único objeto JSON válido que adere estritamente ao Schema JSON fornecido. NÃO incluas comentários, explicações ou texto introdutório fora do bloco JSON.
3. **Aderir ao Tempo:** A duração total do plano de treino por dia deve alinhar-se estritamente com o parâmetro 'Tempo Diário Dedicado', incluindo aquecimento (5 min), arrefecimento (5 min) e períodos de descanso.
4. **Gestão de Recursos:** Podes APENAS recomendar exercícios e equipamentos explicitamente listados na lista 'EQUIPAMENTO DISPONÍVEL'.
5. **Idioma:** TODAS as descrições, nomes de exercícios, receitas e instruções DEVEM ser em **Português (pt-PT)**.
6. **Nutrição Científica:** As receitas e distribuição calórica devem respeitar a Equação de Mifflin-St Jeor e as diretrizes ISSN/DGA para macros.`;

  const userPrompt = `[INÍCIO DADOS DO CLIENTE]

**1. PERFIL INICIAL E OBJETIVOS:**
- Sexo: ${userProfile.sex === "Male" ? "Masculino" : "Feminino"}
- Idade: ${userProfile.age} anos
- Peso: ${userProfile.weight} kg
- Altura: ${userProfile.height} cm
- Nível de Atividade Atual: ${activityLevelPt[userProfile.activityLevel] || "Moderadamente Ativo"}
- Objetivo Desejado: ${goalPt}
- Impedimentos Físicos / Condições de Saúde: ${userProfile.impediments || "Nenhum reportado"}
- Dificuldade Desejada do Plano: ${difficulty} (Opções: Muito Fácil, Fácil, Médio, Difícil, Muito Difícil)

**2. MÉTRICAS CIENTÍFICAS CALCULADAS (Linha Base - Mifflin-St Jeor):**
- Taxa Metabólica Basal (BMR): ${Math.round(bmr)} kcal
- TDEE Base (com fator de atividade): ${tdee} kcal
- **Meta Calórica Diária (Ajustada para ${goalPt}):** ${targetCalories} kcal
- Alvos de Macronutrientes (ISSN/DGA): Proteína: ${macroTargets.protein}%, Carboidratos: ${macroTargets.carbs}%, Gordura: ${macroTargets.fat}%
- Alvo de Hidratação Diária (35ml/kg): ${waterTarget} ml

**3. CONSTRANGIMENTOS DE TREINO (ACSM/OPT):**
- Tempo Diário Dedicado ABSOLUTO: ${timePerDay} minutos (inclui 5 min aquecimento + 5 min arrefecimento)
- Equipamento Disponível: ${userEquipment}
- Último Feedback de Sessão: ${lastFeedback}

[FIM DADOS DO CLIENTE]

**TAREFA:**

**A. PLANO DE TREINO (Primeiros 7 Dias do Plano de 30 Dias):**
1. Desenvolve os primeiros 7 dias usando o modelo de Periodização Ondulatória (para variar estímulos) ou o Modelo OPT do NASM (para iniciantes).
2. Cada sessão DEVE incluir Aquecimento (5 min) e Alongamento (5 min) dentro do tempo total de ${timePerDay} minutos.
3. Inclui pelo menos 1-2 dias de descanso ativo ou completo nos 7 dias para recuperação adequada.
4. Para cada exercício, estima as calorias queimadas para a sessão completa baseado na intensidade e peso do utilizador (${userProfile.weight}kg).
5. Fornece placeholders para 'video_link' e 'image_link' (e.g., "placeholder/video/agachamento.mp4").
6. Ajusta a intensidade baseado na dificuldade desejada: ${difficulty}.
7. Se houver último feedback (${lastFeedback}), ajusta a intensidade conforme necessário.

**B. PLANO DE NUTRIÇÃO (3 Dias Completos):**
1. Cria 3 dias de plano de refeições com 6 refeições/dia:
   - Pequeno Almoço, Lanche Manhã, Almoço, Lanche Tarde, Jantar, Ceia
2. O total calórico diário DEVE estar dentro de ±50 kcal da meta (${targetCalories} kcal).
3. Respeita estritamente os alvos de macros (P:${macroTargets.protein}%, C:${macroTargets.carbs}%, G:${macroTargets.fat}%).
4. Baseia-te em **alimentos integrais** e inclui opções típicas portuguesas (peixe, carne, ovos, verduras, carboidratos).

**C. DIRETRIZES DE HIDRATAÇÃO:**
1. Meta de água: ${waterTarget} ml por dia
2. Inclui um horário de notificação sugerido (e.g., "A cada 90 minutos entre as 8h e as 20h")

**OUTPUT JSON REQUERIDO (Segue este schema EXATAMENTE):**
{
  "plan_summary_pt": "Resumo breve da estratégia geral do plano (ex: 'Foco em ${goalPt} com ${timePerDay} minutos diários, combinando cardio e força')",
  "fitness_plan_7_days": [
    {
      "day": 1,
      "is_rest_day": false,
      "workout_name_pt": "Nome do treino em português (ex: 'Treino de Força - Corpo Inteiro')",
      "duration_minutes": ${timePerDay},
      "estimated_calories_burnt": 300,
      "focus_pt": "Cardio/Força/Full Body/Descanso Ativo",
      "exercises": [
        {
          "name_pt": "Nome do exercício em português",
          "sequence_order": 1,
          "sets": 3,
          "reps_or_time_pt": "12 repetições ou 30 segundos",
          "equipment_used_pt": "Equipamento da lista DISPONÍVEL",
          "image_link": "placeholder/image/exercicio.jpg",
          "video_link": "placeholder/video/exercicio.mp4"
        }
      ]
    }
  ],
  "nutrition_plan_3_days": [
    {
      "day": 1,
      "total_daily_calories": ${targetCalories},
      "total_daily_macros": "Proteína: Xg, Carboidratos: Xg, Gordura: Xg",
      "meals": [
        {
          "meal_time_pt": "Pequeno Almoço",
          "description_pt": "Descrição completa da refeição",
          "main_ingredients_pt": "Lista de ingredientes principais (peixe, ovos, verduras, etc.)",
          "calories": 400,
          "protein_g": 30,
          "carbs_g": 40,
          "fat_g": 15
        }
      ]
    }
  ],
  "hydration_guidelines_pt": {
    "water_target_ml": ${waterTarget},
    "notification_schedule_pt": "A cada 90 minutos entre as 8h e as 20h, aumentando em dias de treino"
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
        fitness_plan_7_days: {
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
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name_pt: { type: "string" },
                    sequence_order: { type: "integer" },
                    sets: { type: "integer" },
                    reps_or_time_pt: { type: "string" },
                    equipment_used_pt: { type: "string" },
                    image_link: { type: "string" },
                    video_link: { type: "string" }
                  },
                  required: ["name_pt", "sequence_order", "sets", "reps_or_time_pt", "equipment_used_pt", "image_link", "video_link"],
                  additionalProperties: false
                }
              }
            },
            required: ["day", "is_rest_day", "workout_name_pt", "duration_minutes", "estimated_calories_burnt", "focus_pt", "exercises"],
            additionalProperties: false
          }
        },
        nutrition_plan_3_days: {
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
                    calories: { type: "integer" },
                    protein_g: { type: "number" },
                    carbs_g: { type: "number" },
                    fat_g: { type: "number" }
                  },
                  required: ["meal_time_pt", "description_pt", "main_ingredients_pt", "calories", "protein_g", "carbs_g", "fat_g"],
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
      required: ["plan_summary_pt", "fitness_plan_7_days", "nutrition_plan_3_days", "hydration_guidelines_pt"],
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

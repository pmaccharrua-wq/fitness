import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronRight, ChevronLeft, Loader2, Globe, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { submitOnboardingWithChunks, saveUserId, checkUserExists } from "@/lib/api";
import { toast } from "sonner";

interface GoalValidation {
  status: "possible" | "challenging" | "not_possible";
}

const formSchema = z.object({
  language: z.enum(["pt", "en"]),
  firstName: z.string().min(1, "Nome é obrigatório"),
  phoneNumber: z.string().min(9, "Número de telefone inválido"),
  gdprConsent: z.boolean().refine(val => val === true, "Deve aceitar o processamento de dados"),
  sex: z.enum(["Male", "Female"]),
  age: z.string().min(1, "Idade é obrigatória").refine(val => parseInt(val) >= 18, "Deve ter 18 anos ou mais"),
  weight: z.string().min(1, "Peso é obrigatório"),
  height: z.string().min(1, "Altura é obrigatória"),
  targetWeight: z.string().optional(),
  weightGoalWeeks: z.string().optional(),
  somatotype: z.string().optional(),
  currentBodyComp: z.string().optional(),
  targetBodyComp: z.string().optional(),
  goal: z.string(),
  activityLevel: z.string(),
  timePerDay: z.string(),
  difficulty: z.string(),
  impediments: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  pin: z.string().length(4, "PIN deve ter 4 dígitos"),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: "Idioma", titleEn: "Language", description: "Escolha o idioma", descriptionEn: "Choose your language" },
  { id: 2, title: "Dados Pessoais", titleEn: "Personal Info", description: "Nome e telefone", descriptionEn: "Name and phone" },
  { id: 3, title: "Corpo", titleEn: "Body", description: "Medidas e sexo", descriptionEn: "Measurements and sex" },
  { id: 4, title: "Composição", titleEn: "Composition", description: "Tipo corporal", descriptionEn: "Body type" },
  { id: 5, title: "Objetivos", titleEn: "Goals", description: "Metas e preferências", descriptionEn: "Goals and preferences" },
  { id: 6, title: "Finalizar", titleEn: "Finish", description: "Criar PIN", descriptionEn: "Create PIN" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generationTotal, setGenerationTotal] = useState(6);
  const [goalValidation, setGoalValidation] = useState<GoalValidation | null>(null);
  const [isValidatingGoal, setIsValidatingGoal] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "pt",
      firstName: "",
      phoneNumber: "",
      gdprConsent: false,
      sex: "Male",
      age: "",
      weight: "",
      height: "",
      targetWeight: "",
      weightGoalWeeks: "12",
      somatotype: "",
      currentBodyComp: "",
      targetBodyComp: "",
      goal: "loss",
      activityLevel: "sedentary",
      timePerDay: "45",
      difficulty: "medium",
      impediments: "",
      equipment: [],
      pin: "0000",
    }
  });

  const lang = form.watch("language");
  const t = (pt: string, en: string) => lang === "pt" ? pt : en;

  const validateGoal = async () => {
    const formData = form.getValues();
    const currentWeight = parseInt(formData.weight);
    const targetWeight = parseInt(formData.targetWeight || formData.weight);
    const weeks = parseInt(formData.weightGoalWeeks || "12");
    
    if (!currentWeight || !targetWeight || currentWeight === targetWeight) {
      setGoalValidation(null);
      return;
    }
    
    setIsValidatingGoal(true);
    try {
      const response = await fetch("/api/validate-weight-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentWeight,
          targetWeight,
          weeks,
          sex: formData.sex,
          age: parseInt(formData.age),
          height: parseInt(formData.height),
          goal: targetWeight < currentWeight ? "loss" : "gain",
          activityLevel: formData.activityLevel,
          language: formData.language,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGoalValidation({ status: data.status });
      }
    } catch (error) {
      console.error("Error validating goal:", error);
    } finally {
      setIsValidatingGoal(false);
    }
  };

  const nextStep = async () => {
    // Check for existing user when leaving step 2 (personal info: name + phone)
    if (currentStep === 2) {
      const formData = form.getValues();
      const phoneNumber = formData.phoneNumber?.startsWith("+351") ? formData.phoneNumber : `+351${formData.phoneNumber || ""}`;
      const firstName = formData.firstName?.trim();
      
      if (firstName && phoneNumber.length > 4) {
        try {
          const checkResult = await checkUserExists(phoneNumber, firstName);
          if (checkResult.exists) {
            toast.error(
              t(
                "Já existe uma conta com este nome e número de telefone. Por favor, faça login.",
                "An account already exists with this name and phone number. Please log in."
              ),
              { duration: 5000 }
            );
            setTimeout(() => setLocation("/login"), 2000);
            return;
          }
        } catch (error) {
          console.error("Error checking user:", error);
        }
      }
    }
    
    if (currentStep < steps.length) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    } else {
      setIsLoading(true);
      setGenerationStep(0);
      try {
        const formData = form.getValues();
        const response = await submitOnboardingWithChunks(
          {
            firstName: formData.firstName,
            phoneNumber: formData.phoneNumber.startsWith("+351") ? formData.phoneNumber : `+351${formData.phoneNumber}`,
            pin: formData.pin,
            language: formData.language,
            sex: formData.sex,
            age: parseInt(formData.age),
            weight: parseInt(formData.weight),
            height: parseInt(formData.height),
            goal: formData.goal,
            activityLevel: formData.activityLevel,
            impediments: formData.impediments || undefined,
            somatotype: formData.somatotype || undefined,
            currentBodyComp: formData.currentBodyComp || undefined,
            targetBodyComp: formData.targetBodyComp || undefined,
            timePerDay: parseInt(formData.timePerDay),
            difficulty: formData.difficulty,
          },
          (step, total) => {
            setGenerationStep(step);
            setGenerationTotal(total);
          }
        );

        if (response.success) {
          saveUserId(response.userId);
          toast.success(t("O seu plano personalizado foi gerado!", "Your personalized plan has been generated!"));
          setLocation("/dashboard");
        } else if (response.error === "duplicate") {
          toast.error(
            t(
              "Já existe uma conta com este nome e número de telefone. Por favor, faça login.",
              "An account already exists with this name and phone number. Please log in."
            ),
            { duration: 5000 }
          );
          setTimeout(() => setLocation("/login"), 2000);
        } else {
          toast.error(response.error || t("Falha ao gerar o plano", "Failed to generate plan"));
        }
      } catch (error) {
        console.error("Onboarding error:", error);
        toast.error(t("Ocorreu um erro. Tente novamente.", "An error occurred. Please try again."));
      } finally {
        setIsLoading(false);
        setGenerationStep(0);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(s => s - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  const stepInfo = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 safe-area-inset">
      <div className="w-full max-w-lg space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-primary" data-testid="text-title">
            {t("Configurar Plano", "Setup Your Plan")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-step-info">
            {t("Passo", "Step")} {currentStep} {t("de", "of")} {steps.length}: {lang === "pt" ? stepInfo.title : stepInfo.titleEn}
          </p>
        </div>

        <Progress value={(currentStep / steps.length) * 100} className="h-2" data-testid="progress-steps" />

        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {t("Escolha o seu idioma", "Choose your language")}
                    </Label>
                    <RadioGroup 
                      defaultValue="pt" 
                      onValueChange={(v) => {
                        form.setValue("language", v as "pt" | "en");
                        localStorage.setItem("language", v);
                      }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer transition-all ${
                        form.watch("language") === "pt" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-input hover:bg-muted/50"
                      }`}>
                        <RadioGroupItem value="pt" id="pt" data-testid="radio-lang-pt" />
                        <Label htmlFor="pt" className="cursor-pointer flex-1 font-medium">🇵🇹 Português</Label>
                      </div>
                      <div className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer transition-all ${
                        form.watch("language") === "en" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-input hover:bg-muted/50"
                      }`}>
                        <RadioGroupItem value="en" id="en" data-testid="radio-lang-en" />
                        <Label htmlFor="en" className="cursor-pointer flex-1 font-medium">🇬🇧 English</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Nome", "First Name")}</Label>
                      <Input 
                        placeholder={t("O seu nome", "Your name")} 
                        className="h-12 text-base" 
                        data-testid="input-firstName"
                        {...form.register("firstName")} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("Número de Telefone", "Phone Number")}</Label>
                      <div className="flex gap-2">
                        <div className="flex items-center px-3 bg-muted rounded-md border border-input text-sm">
                          +351
                        </div>
                        <Input 
                          type="tel" 
                          placeholder="912345678" 
                          className="h-12 text-base flex-1" 
                          inputMode="tel"
                          data-testid="input-phoneNumber"
                          {...form.register("phoneNumber")} 
                        />
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 pt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <Checkbox 
                        id="gdpr-consent" 
                        checked={form.watch("gdprConsent")} 
                        onCheckedChange={(checked) => form.setValue("gdprConsent", checked as boolean)}
                        data-testid="checkbox-gdpr-consent"
                      />
                      <label htmlFor="gdpr-consent" className="text-sm cursor-pointer leading-tight">
                        {t(
                          "Autorizo o processamento dos meus dados pessoais e de saúde para gerar planos de fitness personalizados, conforme o RGPD.",
                          "I authorize the processing of my personal and health data to generate personalized fitness plans, in accordance with GDPR."
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Sexo Biológico", "Biological Sex")}</Label>
                      <RadioGroup defaultValue="Male" onValueChange={(v) => form.setValue("sex", v as any)}>
                        <div className="flex gap-4">
                          {[
                            { value: "Male", labelPt: "Masculino", labelEn: "Male" },
                            { value: "Female", labelPt: "Feminino", labelEn: "Female" }
                          ].map((s) => (
                            <div key={s.value} className="flex items-center space-x-2 border border-input p-3 rounded-lg w-full hover:bg-muted/50 transition cursor-pointer">
                              <RadioGroupItem value={s.value} id={s.value} data-testid={`radio-sex-${s.value.toLowerCase()}`} />
                              <Label htmlFor={s.value} className="cursor-pointer flex-1">{t(s.labelPt, s.labelEn)}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">{t("Idade", "Age")}</Label>
                        <Input type="number" placeholder="30" className="h-12 text-base" inputMode="numeric" data-testid="input-age" {...form.register("age")} />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">{t("Peso (kg)", "Weight (kg)")}</Label>
                        <Input type="number" placeholder="70" className="h-12 text-base" inputMode="numeric" data-testid="input-weight" {...form.register("weight")} />
                      </div>
                      <div className="space-y-1 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">{t("Altura (cm)", "Height (cm)")}</Label>
                        <Input type="number" placeholder="175" className="h-12 text-base" inputMode="numeric" data-testid="input-height" {...form.register("height")} />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Tipo de Corpo (Somatotipo)", "Body Type (Somatotype)")}</Label>
                      <Select onValueChange={(v) => form.setValue("somatotype", v)}>
                        <SelectTrigger data-testid="select-somatotype">
                          <SelectValue placeholder={t("Selecione o seu tipo", "Select your type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ectomorph">{t("Ectomorfo (Magro, metabolismo rápido)", "Ectomorph (Lean, fast metabolism)")}</SelectItem>
                          <SelectItem value="mesomorph">{t("Mesomorfo (Atlético, ganha músculo fácil)", "Mesomorph (Athletic, gains muscle easily)")}</SelectItem>
                          <SelectItem value="endomorph">{t("Endomorfo (Estrutura maior, metabolismo lento)", "Endomorph (Larger build, slower metabolism)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Composição Corporal Atual", "Current Body Composition")}</Label>
                      <Select onValueChange={(v) => form.setValue("currentBodyComp", v)}>
                        <SelectTrigger data-testid="select-currentBodyComp">
                          <SelectValue placeholder={t("Selecione", "Select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="very_lean">{t("Muito magro (<10% gordura)", "Very lean (<10% body fat)")}</SelectItem>
                          <SelectItem value="lean">{t("Magro (10-15% gordura)", "Lean (10-15% body fat)")}</SelectItem>
                          <SelectItem value="average">{t("Médio (15-25% gordura)", "Average (15-25% body fat)")}</SelectItem>
                          <SelectItem value="overweight">{t("Excesso de peso (25-35% gordura)", "Overweight (25-35% body fat)")}</SelectItem>
                          <SelectItem value="obese">{t("Obeso (>35% gordura)", "Obese (>35% body fat)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Composição Corporal Desejada", "Target Body Composition")}</Label>
                      <Select onValueChange={(v) => form.setValue("targetBodyComp", v)}>
                        <SelectTrigger data-testid="select-targetBodyComp">
                          <SelectValue placeholder={t("Selecione", "Select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="very_lean">{t("Muito magro (<10% gordura)", "Very lean (<10% body fat)")}</SelectItem>
                          <SelectItem value="lean">{t("Magro (10-15% gordura)", "Lean (10-15% body fat)")}</SelectItem>
                          <SelectItem value="athletic">{t("Atlético (15-20% gordura)", "Athletic (15-20% body fat)")}</SelectItem>
                          <SelectItem value="toned">{t("Tonificado (20-25% gordura)", "Toned (20-25% body fat)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Objetivo Principal", "Primary Goal")}</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { id: "loss", labelPt: "Perda de Peso", labelEn: "Weight Loss", descPt: "Queimar gordura e emagrecer", descEn: "Burn fat and lean out" },
                          { id: "muscle", labelPt: "Ganho Muscular", labelEn: "Muscle Gain", descPt: "Aumentar massa e força", descEn: "Build size and strength" },
                          { id: "endurance", labelPt: "Resistência", labelEn: "Endurance", descPt: "Melhorar cardio e stamina", descEn: "Improve cardio and stamina" }
                        ].map((goal) => (
                          <div 
                            key={goal.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              form.watch("goal") === goal.id 
                                ? "border-primary bg-primary/10 ring-1 ring-primary" 
                                : "border-input hover:bg-muted/50"
                            }`}
                            onClick={() => form.setValue("goal", goal.id)}
                            data-testid={`card-goal-${goal.id}`}
                          >
                            <div className="font-bold text-sm">{t(goal.labelPt, goal.labelEn)}</div>
                            <div className="text-xs text-muted-foreground">{t(goal.descPt, goal.descEn)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {(form.watch("goal") === "loss" || form.watch("goal") === "muscle") && (
                      <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                        <Label className="font-bold">{t("Objetivo de Peso", "Weight Goal")}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t("Defina o seu peso objetivo e prazo para a IA avaliar se é realista", "Set your target weight and timeframe for AI to evaluate if it's realistic")}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{t("Peso Objetivo (kg)", "Target Weight (kg)")}</Label>
                            <Input 
                              type="number" 
                              placeholder={form.watch("weight") || "70"} 
                              className="h-10" 
                              inputMode="numeric"
                              data-testid="input-targetWeight"
                              {...form.register("targetWeight", {
                                onBlur: () => validateGoal()
                              })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t("Prazo (semanas)", "Timeframe (weeks)")}</Label>
                            <Select 
                              defaultValue="12" 
                              onValueChange={async (v) => {
                                form.setValue("weightGoalWeeks", v, { shouldDirty: true });
                                await form.trigger(["weight", "targetWeight", "weightGoalWeeks"]);
                                validateGoal();
                              }}
                            >
                              <SelectTrigger data-testid="select-weightGoalWeeks" className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="4">4 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="8">8 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="12">12 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="16">16 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="24">24 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="36">36 {t("semanas", "weeks")}</SelectItem>
                                <SelectItem value="52">52 {t("semanas", "weeks")} (1 {t("ano", "year")})</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {isValidatingGoal && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t("A analisar objetivo...", "Analyzing goal...")}
                          </div>
                        )}

                        {goalValidation && !isValidatingGoal && (
                          <div className={`p-3 rounded-lg border ${
                            goalValidation.status === "not_possible" 
                              ? "bg-red-500/10 border-red-500/30" 
                              : goalValidation.status === "challenging"
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : "bg-green-500/10 border-green-500/30"
                          }`}>
                            <div className="flex items-center gap-2">
                              {goalValidation.status === "possible" ? (
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                              ) : goalValidation.status === "not_possible" ? (
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                              ) : (
                                <Info className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                              )}
                              <p className="text-sm font-medium">
                                {goalValidation.status === "possible" 
                                  ? t("Possível", "Possible")
                                  : goalValidation.status === "challenging"
                                  ? t("Desafiador", "Challenging")
                                  : t("Não possível", "Not possible")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t("Tempo por dia", "Time per day")}</Label>
                        <Select defaultValue="45" onValueChange={(v) => form.setValue("timePerDay", v)}>
                          <SelectTrigger data-testid="select-timePerDay">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                            <SelectItem value="90">90 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t("Dificuldade", "Difficulty")}</Label>
                        <Select defaultValue="medium" onValueChange={(v) => form.setValue("difficulty", v)}>
                          <SelectTrigger data-testid="select-difficulty">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="very_easy">{t("Muito Fácil", "Very Easy")}</SelectItem>
                            <SelectItem value="easy">{t("Fácil", "Easy")}</SelectItem>
                            <SelectItem value="medium">{t("Médio", "Medium")}</SelectItem>
                            <SelectItem value="hard">{t("Difícil", "Hard")}</SelectItem>
                            <SelectItem value="very_hard">{t("Muito Difícil", "Very Hard")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Nível de Atividade", "Activity Level")}</Label>
                      <Select defaultValue="sedentary" onValueChange={(v) => form.setValue("activityLevel", v)}>
                        <SelectTrigger data-testid="select-activityLevel">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">{t("Sedentário (Trabalho de escritório)", "Sedentary (Office job)")}</SelectItem>
                          <SelectItem value="light">{t("Levemente Ativo (1-2 dias/semana)", "Lightly Active (1-2 days/week)")}</SelectItem>
                          <SelectItem value="moderate">{t("Moderadamente Ativo (3-5 dias/semana)", "Moderately Active (3-5 days/week)")}</SelectItem>
                          <SelectItem value="very">{t("Muito Ativo (6-7 dias/semana)", "Very Active (6-7 days/week)")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("Limitações/Impedimentos (Opcional)", "Limitations/Impediments (Optional)")}</Label>
                      <Input 
                        placeholder={t("Ex: Dor no joelho, lesão nas costas", "Ex: Knee pain, back injury")} 
                        className="h-12 text-base"
                        data-testid="input-impediments"
                        {...form.register("impediments")} 
                      />
                    </div>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("Definir PIN de 4 dígitos", "Set 4-digit PIN")}</Label>
                      <p className="text-xs text-muted-foreground">{t("Este PIN será usado para aceder à sua conta", "This PIN will be used to access your account")}</p>
                      <Input 
                        type="password" 
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="0000" 
                        className="h-12 text-base text-center tracking-widest" 
                        data-testid="input-pin"
                        {...form.register("pin")} 
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 1 || isLoading}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> {t("Voltar", "Back")}
          </Button>
          <Button 
            onClick={nextStep} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            disabled={isLoading}
            data-testid="button-next"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {generationStep > 0 
                  ? t(`A gerar... (${generationStep}/${generationTotal})`, `Generating... (${generationStep}/${generationTotal})`)
                  : t("A iniciar...", "Starting...")}
              </>
            ) : (
              <>
                {currentStep === steps.length ? t("Gerar Plano", "Generate Plan") : t("Seguinte", "Next")} <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

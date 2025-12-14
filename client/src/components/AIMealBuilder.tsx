import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Plus, X, ChefHat, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { MealData } from "./MealCard";

interface AIMealBuilderProps {
  userId: number;
  planId: number;
  dayIndex: number;
  defaultMealTime?: string;
  defaultTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  onMealGenerated?: (meal: MealData, mealSlot: number) => void;
}

const MEAL_TIMES_PT = ["Pequeno-almoço", "Lanche da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia"];
const MEAL_TIMES_EN = ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Supper"];

export default function AIMealBuilder({
  userId,
  planId,
  dayIndex,
  defaultMealTime = "Almoço",
  defaultTargets = { calories: 500, protein: 30, carbs: 50, fat: 15 },
  onMealGenerated
}: AIMealBuilderProps) {
  const { language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [selectedMealTime, setSelectedMealTime] = useState(defaultMealTime);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeal, setGeneratedMeal] = useState<MealData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mealTimes = language === "pt" ? MEAL_TIMES_PT : MEAL_TIMES_EN;

  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim())) {
      setIngredients([...ingredients, currentIngredient.trim()]);
      setCurrentIngredient("");
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addIngredient();
    }
  };

  const generateMeal = async () => {
    if (ingredients.length === 0) {
      setError(language === "pt" ? "Adicione pelo menos um ingrediente" : "Add at least one ingredient");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedMeal(null);

    try {
      const response = await fetch("/api/nutrition/meal-from-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          targetCalories: defaultTargets.calories,
          targetProtein: defaultTargets.protein,
          targetCarbs: defaultTargets.carbs,
          targetFat: defaultTargets.fat,
          mealTime: selectedMealTime,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.meal) {
        setGeneratedMeal(data.meal);
      } else {
        setError(data.error || (language === "pt" ? "Erro ao gerar refeição" : "Error generating meal"));
      }
    } catch (err) {
      setError(language === "pt" ? "Erro de conexão" : "Connection error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!generatedMeal || !onMealGenerated) return;

    const mealSlot = mealTimes.indexOf(selectedMealTime);
    
    try {
      await fetch("/api/nutrition/custom-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          dayIndex,
          mealSlot: mealSlot >= 0 ? mealSlot : 0,
          source: "ingredient_ai",
          originalMeal: null,
          customMeal: generatedMeal,
        }),
      });

      onMealGenerated(generatedMeal, mealSlot >= 0 ? mealSlot : 0);
      setIsOpen(false);
      setIngredients([]);
      setGeneratedMeal(null);
    } catch (err) {
      console.error("Error saving AI meal:", err);
    }
  };

  const resetDialog = () => {
    setIngredients([]);
    setCurrentIngredient("");
    setGeneratedMeal(null);
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-ai-meal-builder">
          <Sparkles className="w-4 h-4" />
          {language === "pt" ? "Criar Refeição com IA" : "Create Meal with AI"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {language === "pt" ? "Criar Refeição com IA" : "Create Meal with AI"}
          </DialogTitle>
          <DialogDescription>
            {language === "pt" 
              ? "Adicione os ingredientes que tem disponíveis e a IA criará uma refeição personalizada" 
              : "Add the ingredients you have available and AI will create a personalized meal"}
          </DialogDescription>
        </DialogHeader>

        {!generatedMeal ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "pt" ? "Hora da Refeição" : "Meal Time"}
              </label>
              <Select value={selectedMealTime} onValueChange={setSelectedMealTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTimes.map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                {language === "pt" ? "Ingredientes Disponíveis" : "Available Ingredients"}
              </label>
              <div className="flex gap-2">
                <Input
                  value={currentIngredient}
                  onChange={(e) => setCurrentIngredient(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === "pt" ? "Ex: Frango, arroz, brócolos..." : "E.g.: Chicken, rice, broccoli..."}
                  data-testid="input-ingredient"
                />
                <Button onClick={addIngredient} size="icon" variant="outline" data-testid="button-add-ingredient">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, idx) => (
                  <span 
                    key={idx} 
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    {ing}
                    <button onClick={() => removeIngredient(ing)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium">{language === "pt" ? "Alvos Nutricionais:" : "Nutritional Targets:"}</p>
              <div className="flex gap-4">
                <span>{defaultTargets.calories} kcal</span>
                <span>P: {defaultTargets.protein}g</span>
                <span>C: {defaultTargets.carbs}g</span>
                <span>G: {defaultTargets.fat}g</span>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <Button 
              onClick={generateMeal} 
              className="w-full gap-2" 
              disabled={isGenerating || ingredients.length === 0}
              data-testid="button-generate-meal"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === "pt" ? "A gerar..." : "Generating..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {language === "pt" ? "Gerar Refeição" : "Generate Meal"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">{generatedMeal.meal_time_pt}</span>
                  <h4 className="font-bold">{generatedMeal.description_pt}</h4>
                </div>
                <span className="text-primary font-bold">{generatedMeal.calories} kcal</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-muted p-2 rounded">
                  <div className="text-xs text-muted-foreground">PRO</div>
                  <div className="font-bold">{generatedMeal.protein_g}g</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-xs text-muted-foreground">CARB</div>
                  <div className="font-bold">{generatedMeal.carbs_g}g</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-xs text-muted-foreground">FAT</div>
                  <div className="font-bold">{generatedMeal.fat_g}g</div>
                </div>
              </div>

              <div>
                <h5 className="text-xs uppercase text-muted-foreground font-bold mb-1">
                  {language === "pt" ? "Ingredientes" : "Ingredients"}
                </h5>
                <p className="text-sm">{generatedMeal.main_ingredients_pt}</p>
              </div>

              {generatedMeal.recipe_pt && (
                <div>
                  <h5 className="text-xs uppercase text-muted-foreground font-bold mb-1 flex items-center gap-1">
                    <ChefHat className="w-3 h-3" />
                    {language === "pt" ? "Receita" : "Recipe"}
                  </h5>
                  <p className="text-xs leading-relaxed">{generatedMeal.recipe_pt}</p>
                </div>
              )}
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setGeneratedMeal(null)} className="flex-1">
                {language === "pt" ? "Gerar Outra" : "Generate Another"}
              </Button>
              <Button onClick={handleSaveMeal} className="flex-1 gap-2" data-testid="button-save-ai-meal">
                <Check className="w-4 h-4" />
                {language === "pt" ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

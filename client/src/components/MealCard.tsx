import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChefHat, ChevronDown, ChevronUp, RefreshCw, Loader2, Check, Undo2, Plus, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_MEAL_IMAGE = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

interface IngredientData {
  name_pt: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealData {
  meal_time_pt: string;
  description_pt: string;
  main_ingredients_pt: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  recipe_pt?: string;
  ingredients?: IngredientData[];
}

interface MealCardProps {
  meal: MealData;
  index: number;
  dayIndex?: number;
  userId?: number;
  planId?: number;
  isCustomMeal?: boolean;
  customMealId?: number;
  onMealSwapped?: (dayIndex: number, mealSlot: number, newMeal: MealData, originalMeal: MealData) => void;
  onRevertMeal?: (customMealId: number) => void;
}

export default function MealCard({ 
  meal, 
  index, 
  dayIndex = 0,
  userId,
  planId,
  isCustomMeal = false,
  customMealId,
  onMealSwapped,
  onRevertMeal
}: MealCardProps) {
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_MEAL_IMAGE);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeal, setGeneratedMeal] = useState<MealData | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<{ recipe_pt: string; ingredients: IngredientData[] } | null>(null);
  const { t, language } = useTranslation();
  
  const isMainMeal = meal.meal_time_pt?.toLowerCase().includes("almoço") || 
                     meal.meal_time_pt?.toLowerCase().includes("jantar") ||
                     meal.meal_time_pt?.toLowerCase().includes("lunch") ||
                     meal.meal_time_pt?.toLowerCase().includes("dinner");
  const hasRecipe = (meal.recipe_pt && meal.recipe_pt.length > 10) || generatedRecipe !== null;
  const displayRecipe = generatedRecipe?.recipe_pt || meal.recipe_pt;
  const displayIngredients = generatedRecipe?.ingredients || meal.ingredients;

  useEffect(() => {
    async function fetchMealImage() {
      try {
        const response = await fetch("/api/images/meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: meal.description_pt,
            mealTime: meal.meal_time_pt,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.image?.url) {
            setImageUrl(data.image.url);
          }
        }
      } catch (error) {
        console.error("Error fetching meal image:", error);
      }
    }

    fetchMealImage();
  }, [meal.description_pt, meal.meal_time_pt]);

  const handleSwapClick = () => {
    setIsSwapDialogOpen(true);
    setSwapError(null);
    setGeneratedMeal(null);
    setIngredients([]);
    setNewIngredient("");
  };

  const addIngredient = () => {
    const trimmed = newIngredient.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setNewIngredient("");
    }
  };

  const removeIngredient = (ing: string) => {
    setIngredients(ingredients.filter(i => i !== ing));
  };

  const handleGenerateMeal = async () => {
    if (ingredients.length === 0) {
      setSwapError(language === "pt" ? "Adicione pelo menos um ingrediente" : "Add at least one ingredient");
      return;
    }

    setIsGenerating(true);
    setSwapError(null);
    setGeneratedMeal(null);

    try {
      const response = await fetch("/api/nutrition/meal-from-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients,
          targetCalories: meal.calories,
          targetProtein: meal.protein_g,
          targetCarbs: meal.carbs_g,
          targetFat: meal.fat_g,
          mealTime: meal.meal_time_pt,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.meal) {
        setGeneratedMeal(data.meal);
      } else {
        setSwapError(data.error || (language === "pt" ? "Erro ao criar refeição" : "Error creating meal"));
      }
    } catch (error) {
      setSwapError(language === "pt" ? "Erro de conexão" : "Connection error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAlternative = async (selectedMeal: MealData) => {
    if (onMealSwapped && userId && planId) {
      try {
        const response = await fetch("/api/nutrition/custom-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            planId,
            dayIndex,
            mealSlot: index,
            source: "swap",
            originalMeal: meal,
            customMeal: selectedMeal,
          }),
        });
        
        const data = await response.json();
        if (data.success) {
          onMealSwapped(dayIndex, index, selectedMeal, meal);
          setIsSwapDialogOpen(false);
        } else {
          setSwapError(data.error || (language === "pt" ? "Erro ao guardar" : "Error saving"));
        }
      } catch (error) {
        console.error("Error saving custom meal:", error);
        setSwapError(language === "pt" ? "Erro de conexão" : "Connection error");
      }
    } else {
      setIsSwapDialogOpen(false);
    }
  };

  const handleRevertMeal = () => {
    if (onRevertMeal && customMealId) {
      onRevertMeal(customMealId);
    }
  };

  const handleGenerateRecipe = async () => {
    setIsGeneratingRecipe(true);
    try {
      const response = await fetch("/api/nutrition/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealDescription: meal.description_pt,
          mainIngredients: meal.main_ingredients_pt,
          targetCalories: meal.calories,
          targetProtein: meal.protein_g,
          targetCarbs: meal.carbs_g,
          targetFat: meal.fat_g,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.recipe) {
        setGeneratedRecipe({
          recipe_pt: data.recipe.recipe_pt,
          ingredients: data.recipe.ingredients || [],
        });
        setIsRecipeOpen(true);
      }
    } catch (error) {
      console.error("Error generating recipe:", error);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  return (
    <>
      <Card className={`overflow-hidden ${isCustomMeal ? 'ring-2 ring-primary/50' : ''}`} data-testid={`card-recipe-${index}`}>
        <div className="h-32 bg-muted relative">
          <img 
            src={imageUrl} 
            alt={meal.description_pt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_MEAL_IMAGE;
              setImageLoaded(true);
            }}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-lg font-heading font-bold text-white capitalize">{meal.meal_time_pt}</h3>
              {isCustomMeal && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {language === "pt" ? "Personalizada" : "Custom"}
                </span>
              )}
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm">{meal.description_pt}</h4>
            <span className="text-primary font-bold text-sm">{meal.calories} kcal</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted p-2 rounded">
              <div className="text-xs text-muted-foreground">PRO</div>
              <div className="font-bold text-sm">{meal.protein_g}g</div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="text-xs text-muted-foreground">CARB</div>
              <div className="font-bold text-sm">{meal.carbs_g}g</div>
            </div>
            <div className="bg-muted p-2 rounded">
              <div className="text-xs text-muted-foreground">FAT</div>
              <div className="font-bold text-sm">{meal.fat_g}g</div>
            </div>
          </div>

          <div>
            <h5 className="font-bold mb-1 text-xs uppercase text-muted-foreground">{t("dashboard", "ingredients")}</h5>
            <p className="text-xs">{meal.main_ingredients_pt}</p>
          </div>

          <div className="flex gap-2 mt-2">
            {onMealSwapped && (
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 gap-2"
                onClick={handleSwapClick}
                data-testid={`button-swap-meal-${index}`}
              >
                <RefreshCw className="w-4 h-4" />
                {language === "pt" ? "Trocar" : "Swap"}
              </Button>
            )}
            {isCustomMeal && onRevertMeal && customMealId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={handleRevertMeal}
                data-testid={`button-revert-meal-${index}`}
              >
                <Undo2 className="w-4 h-4" />
                {language === "pt" ? "Reverter" : "Revert"}
              </Button>
            )}
          </div>

          {isMainMeal && !hasRecipe && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2 gap-2"
              onClick={handleGenerateRecipe}
              disabled={isGeneratingRecipe}
              data-testid={`button-generate-recipe-${index}`}
            >
              {isGeneratingRecipe ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === "pt" ? "A gerar receita..." : "Generating recipe..."}
                </>
              ) : (
                <>
                  <ChefHat className="w-4 h-4" />
                  {language === "pt" ? "Gerar Receita" : "Generate Recipe"}
                </>
              )}
            </Button>
          )}
          {isMainMeal && hasRecipe && (
            <Collapsible open={isRecipeOpen} onOpenChange={setIsRecipeOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 gap-2"
                  data-testid={`button-recipe-${index}`}
                >
                  <ChefHat className="w-4 h-4" />
                  {language === "pt" ? "Ver Receita" : "View Recipe"}
                  {isRecipeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {displayIngredients && displayIngredients.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h5 className="font-bold text-sm">
                      {language === "pt" ? "Informação Nutricional por Ingrediente" : "Nutritional Info per Ingredient"}
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-1 font-medium">{language === "pt" ? "Ingrediente" : "Ingredient"}</th>
                            <th className="text-right py-1 font-medium">kcal</th>
                            <th className="text-right py-1 font-medium">P</th>
                            <th className="text-right py-1 font-medium">C</th>
                            <th className="text-right py-1 font-medium">G</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayIngredients.map((ing, ingIdx) => (
                            <tr key={ingIdx} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5">
                                <span className="font-medium">{ing.name_pt}</span>
                                <span className="text-muted-foreground ml-1">({ing.quantity})</span>
                              </td>
                              <td className="text-right py-1.5 text-primary font-medium">{ing.calories}</td>
                              <td className="text-right py-1.5">{ing.protein_g}g</td>
                              <td className="text-right py-1.5">{ing.carbs_g}g</td>
                              <td className="text-right py-1.5">{ing.fat_g}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <h5 className="font-bold text-sm flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    {language === "pt" ? "Modo de Preparação" : "Preparation"}
                  </h5>
                  <div className="text-xs space-y-2">
                    {(displayRecipe || "").split(/(?=\d+\.)/).filter(Boolean).map((step, stepIdx) => (
                      <p key={stepIdx} className="leading-relaxed">{step.trim()}</p>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      <Dialog open={isSwapDialogOpen} onOpenChange={setIsSwapDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === "pt" ? "Criar Refeição com os Meus Ingredientes" : "Create Meal with My Ingredients"}
            </DialogTitle>
            <DialogDescription>
              {language === "pt" 
                ? `Diga-me o que tem disponível e crio uma refeição com ~${meal.calories} kcal` 
                : `Tell me what you have available and I'll create a meal with ~${meal.calories} kcal`}
            </DialogDescription>
          </DialogHeader>

          {!generatedMeal ? (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg text-xs">
                <div className="font-medium mb-1">{language === "pt" ? "Alvos nutricionais:" : "Nutritional targets:"}</div>
                <div className="flex gap-4">
                  <span>{meal.calories} kcal</span>
                  <span>P: {meal.protein_g}g</span>
                  <span>C: {meal.carbs_g}g</span>
                  <span>G: {meal.fat_g}g</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addIngredient()}
                  placeholder={language === "pt" ? "Ex: frango, arroz, brócolos..." : "E.g: chicken, rice, broccoli..."}
                  data-testid="input-ingredient"
                />
                <Button onClick={addIngredient} size="icon" variant="outline" data-testid="button-add-ingredient">
                  <Plus className="w-4 h-4" />
                </Button>
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

              {swapError && (
                <p className="text-sm text-destructive text-center">{swapError}</p>
              )}

              <Button 
                onClick={handleGenerateMeal} 
                disabled={ingredients.length === 0 || isGenerating}
                className="w-full gap-2"
                data-testid="button-generate-meal"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === "pt" ? "A criar refeição..." : "Creating meal..."}
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4" />
                    {language === "pt" ? "Criar Refeição" : "Create Meal"}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold">{generatedMeal.description_pt}</h4>
                  <span className="text-primary font-bold">{generatedMeal.calories} kcal</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{generatedMeal.main_ingredients_pt}</p>
                
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-muted p-2 rounded">
                    <div className="text-xs text-muted-foreground">PRO</div>
                    <div className="font-bold text-sm">{generatedMeal.protein_g}g</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="text-xs text-muted-foreground">CARB</div>
                    <div className="font-bold text-sm">{generatedMeal.carbs_g}g</div>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <div className="text-xs text-muted-foreground">FAT</div>
                    <div className="font-bold text-sm">{generatedMeal.fat_g}g</div>
                  </div>
                </div>

                {generatedMeal.ingredients && generatedMeal.ingredients.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <h5 className="font-medium text-sm mb-2">
                      {language === "pt" ? "Ingredientes com quantidades:" : "Ingredients with quantities:"}
                    </h5>
                    <div className="space-y-1 text-xs">
                      {generatedMeal.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{ing.name_pt} ({ing.quantity})</span>
                          <span className="text-muted-foreground">{ing.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {generatedMeal.recipe_pt && (
                  <div className="border-t pt-3 mt-3">
                    <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <ChefHat className="w-4 h-4" />
                      {language === "pt" ? "Preparação:" : "Preparation:"}
                    </h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{generatedMeal.recipe_pt}</p>
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setGeneratedMeal(null)}
                >
                  {language === "pt" ? "Tentar outros ingredientes" : "Try other ingredients"}
                </Button>
                <Button 
                  className="flex-1 gap-2"
                  onClick={() => handleSelectAlternative(generatedMeal)}
                  data-testid="button-use-meal"
                >
                  <Check className="w-4 h-4" />
                  {language === "pt" ? "Usar esta refeição" : "Use this meal"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

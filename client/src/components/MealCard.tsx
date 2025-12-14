import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";

const DEFAULT_MEAL_IMAGE = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800";

interface MealData {
  meal_time_pt: string;
  description_pt: string;
  main_ingredients_pt: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  recipe_pt?: string;
}

interface MealCardProps {
  meal: MealData;
  index: number;
}

export default function MealCard({ meal, index }: MealCardProps) {
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_MEAL_IMAGE);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { t } = useTranslation();

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

  return (
    <Card className="overflow-hidden" data-testid={`card-recipe-${index}`}>
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
          <h3 className="text-lg font-heading font-bold text-white capitalize">{meal.meal_time_pt}</h3>
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
      </CardContent>
    </Card>
  );
}

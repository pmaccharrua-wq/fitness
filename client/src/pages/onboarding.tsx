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
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { submitOnboarding, saveUserId } from "@/lib/api";
import { toast } from "sonner";

const formSchema = z.object({
  sex: z.enum(["Male", "Female", "Other"]),
  age: z.string().min(1, "Age is required"),
  weight: z.string().min(1, "Weight is required"),
  height: z.string().min(1, "Height is required"),
  goal: z.string(),
  activityLevel: z.string(),
  equipment: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, title: "Basic Info", description: "Let's get to know you" },
  { id: 2, title: "Your Goals", description: "What do you want to achieve?" },
  { id: 3, title: "Experience", description: "History & Activity Level" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sex: "Male",
      age: "",
      weight: "",
      height: "",
      goal: "loss",
      activityLevel: "sedentary",
    }
  });

  const nextStep = async () => {
    if (currentStep < steps.length) {
      setDirection(1);
      setCurrentStep(s => s + 1);
    } else {
      // Final step - submit to API
      setIsLoading(true);
      try {
        const formData = form.getValues();
        const response = await submitOnboarding({
          sex: formData.sex,
          age: parseInt(formData.age),
          weight: parseInt(formData.weight),
          height: parseInt(formData.height),
          goal: formData.goal,
          activityLevel: formData.activityLevel,
          equipment: formData.equipment,
        });

        if (response.success) {
          saveUserId(response.userId);
          toast.success("Your personalized plan has been generated!");
          setLocation("/dashboard");
        } else {
          toast.error(response.error || "Failed to generate plan");
        }
      } catch (error) {
        console.error("Onboarding error:", error);
        toast.error("An error occurred. Please try again.");
      } finally {
        setIsLoading(false);
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-bold text-primary">Setup Your Plan</h1>
          <p className="text-muted-foreground">Step {currentStep} of {steps.length}: {steps[currentStep-1].title}</p>
        </div>

        <Progress value={(currentStep / steps.length) * 100} className="h-2" />

        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
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
                    <div className="space-y-2">
                      <Label>Biological Sex</Label>
                      <RadioGroup defaultValue="Male" onValueChange={(v) => form.setValue("sex", v as any)}>
                        <div className="flex gap-4">
                          {["Male", "Female"].map((s) => (
                            <div key={s} className="flex items-center space-x-2 border border-input p-3 rounded-lg w-full hover:bg-muted/50 transition cursor-pointer">
                              <RadioGroupItem value={s} id={s} />
                              <Label htmlFor={s} className="cursor-pointer flex-1">{s}</Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input type="number" placeholder="30" {...form.register("age")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Weight (kg)</Label>
                        <Input type="number" placeholder="70" {...form.register("weight")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (cm)</Label>
                        <Input type="number" placeholder="175" {...form.register("height")} />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <Label>What is your primary goal?</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: "loss", label: "Weight Loss", desc: "Burn fat & lean out" },
                        { id: "muscle", label: "Muscle Gain", desc: "Build size & strength" },
                        { id: "endurance", label: "Endurance", desc: "Improve cardio & stamina" }
                      ].map((goal) => (
                        <div 
                          key={goal.id}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            form.watch("goal") === goal.id 
                              ? "border-primary bg-primary/10 ring-1 ring-primary" 
                              : "border-input hover:bg-muted/50"
                          }`}
                          onClick={() => form.setValue("goal", goal.id)}
                        >
                          <div className="font-bold">{goal.label}</div>
                          <div className="text-sm text-muted-foreground">{goal.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <Label>Current Activity Level</Label>
                    <Select onValueChange={(v) => form.setValue("activityLevel", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary (Office job)</SelectItem>
                        <SelectItem value="light">Lightly Active (1-2 days/week)</SelectItem>
                        <SelectItem value="moderate">Moderately Active (3-5 days/week)</SelectItem>
                        <SelectItem value="very">Very Active (6-7 days/week)</SelectItem>
                      </SelectContent>
                    </Select>

                     <Label>Available Equipment (Optional)</Label>
                     <div className="grid grid-cols-2 gap-2">
                        {["Dumbbells", "Yoga Mat", "Pull-up Bar", "Bench", "Kettlebell", "None"].map(item => (
                            <div key={item} className="flex items-center space-x-2">
                                <Check className="w-4 h-4 text-primary" />
                                <span className="text-sm">{item}</span>
                            </div>
                        ))}
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
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button 
            onClick={nextStep} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                {currentStep === steps.length ? "Generate Plan" : "Next"} <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

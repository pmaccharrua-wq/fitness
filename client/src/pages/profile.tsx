import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, Target, Dumbbell, Activity, Scale, Ruler, Calendar, LogOut } from "lucide-react";
import { getUserProfile, getUserId, clearUserId } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useTranslation();
  const txt = (pt: string, en: string) => language === "pt" ? pt : en;

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLocation("/onboarding");
      return;
    }
    loadProfile(userId);
  }, []);

  async function loadProfile(userId: number) {
    try {
      const response = await getUserProfile(userId);
      if (response.success) {
        setProfile(response.profile);
      } else {
        toast.error(txt("Erro ao carregar perfil", "Error loading profile"));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error(txt("Erro ao carregar perfil", "Error loading profile"));
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    clearUserId();
    setLocation("/");
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground" data-testid="text-loading">{txt("A carregar...", "Loading...")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center space-y-4 py-12">
          <h2 className="text-2xl font-bold" data-testid="text-no-profile">{txt("Perfil não encontrado", "Profile not found")}</h2>
          <Button onClick={() => setLocation("/onboarding")} data-testid="button-create-profile">{txt("Criar Perfil", "Create Profile")}</Button>
        </div>
      </Layout>
    );
  }

  const goalLabels: Record<string, { pt: string; en: string }> = {
    "lose-weight": { pt: "Perder Peso", en: "Lose Weight" },
    "build-muscle": { pt: "Ganhar Músculo", en: "Build Muscle" },
    "improve-fitness": { pt: "Melhorar Condição Física", en: "Improve Fitness" },
    "maintain": { pt: "Manter Peso", en: "Maintain Weight" },
  };

  const activityLabels: Record<string, { pt: string; en: string }> = {
    "sedentary": { pt: "Sedentário", en: "Sedentary" },
    "light": { pt: "Leve", en: "Light" },
    "moderate": { pt: "Moderado", en: "Moderate" },
    "active": { pt: "Ativo", en: "Active" },
    "very-active": { pt: "Muito Ativo", en: "Very Active" },
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-heading font-bold uppercase" data-testid="text-profile-title">
              {txt("Meu Perfil", "My Profile")}
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-profile-subtitle">
              {txt("Suas informações pessoais e preferências", "Your personal information and preferences")}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {txt("Sair", "Sign Out")}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {txt("Informações Pessoais", "Personal Information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{txt("Nome", "Name")}</span>
                <span className="font-medium" data-testid="text-profile-name">{profile.firstName}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{txt("Telefone", "Phone")}</span>
                <span className="font-medium" data-testid="text-profile-phone">{profile.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{txt("Sexo", "Sex")}</span>
                <span className="font-medium" data-testid="text-profile-sex">
                  {profile.sex === "male" ? txt("Masculino", "Male") : txt("Feminino", "Female")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{txt("Idade", "Age")}</span>
                <span className="font-medium" data-testid="text-profile-age">{profile.age} {txt("anos", "years")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                {txt("Medidas Corporais", "Body Measurements")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  {txt("Peso", "Weight")}
                </span>
                <span className="font-medium" data-testid="text-profile-weight">{profile.weight} kg</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  {txt("Altura", "Height")}
                </span>
                <span className="font-medium" data-testid="text-profile-height">{profile.height} cm</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{txt("IMC", "BMI")}</span>
                <span className="font-medium" data-testid="text-profile-bmi">
                  {(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {txt("Objetivos", "Goals")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground">{txt("Objetivo Principal", "Main Goal")}</span>
                <span className="font-medium text-primary" data-testid="text-profile-goal">
                  {goalLabels[profile.goal]?.[language] || profile.goal}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{txt("Nível de Atividade", "Activity Level")}</span>
                <span className="font-medium" data-testid="text-profile-activity">
                  {activityLabels[profile.activityLevel]?.[language] || profile.activityLevel}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                {txt("Equipamento Disponível", "Available Equipment")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2" data-testid="text-profile-equipment">
                {profile.equipment && profile.equipment.length > 0 ? (
                  profile.equipment.map((item: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground">{txt("Sem equipamento", "No equipment")}</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {profile.impediments && (
          <Card className="bg-card/50 border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500">
                <Activity className="w-5 h-5" />
                {txt("Limitações Físicas", "Physical Limitations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground" data-testid="text-profile-impediments">{profile.impediments}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-heading text-lg font-bold">{txt("Quer atualizar seu perfil?", "Want to update your profile?")}</h3>
                <p className="text-muted-foreground text-sm">
                  {txt("Crie um novo plano com informações atualizadas", "Create a new plan with updated information")}
                </p>
              </div>
              <Button onClick={() => setLocation("/onboarding")} data-testid="button-new-plan">
                <Calendar className="w-4 h-4 mr-2" />
                {txt("Novo Plano", "New Plan")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

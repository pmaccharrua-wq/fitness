import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Target, Activity, Scale, Ruler, LogOut, Edit2, Save, X, RefreshCw } from "lucide-react";
import { getUserProfile, getUserId, clearUserId, updateUserProfile } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});
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
        setEditData({
          weight: response.profile.weight,
          height: response.profile.height,
          goal: response.profile.goal,
          activityLevel: response.profile.activityLevel,
          impediments: response.profile.impediments || "",
        });
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

  async function handleSave(regeneratePlan: boolean = false) {
    const userId = getUserId();
    if (!userId) return;

    setIsSaving(true);
    try {
      const response = await updateUserProfile(userId, {
        weight: parseInt(editData.weight),
        height: parseInt(editData.height),
        goal: editData.goal,
        activityLevel: editData.activityLevel,
        impediments: editData.impediments || undefined,
        regeneratePlan,
      });

      if (response.success) {
        setProfile(response.profile);
        setIsEditing(false);
        if (regeneratePlan && response.newPlan) {
          toast.success(txt("Perfil atualizado e novo plano gerado!", "Profile updated and new plan generated!"));
          setLocation("/dashboard");
        } else {
          toast.success(txt("Perfil atualizado com sucesso!", "Profile updated successfully!"));
        }
      } else {
        toast.error(response.error || txt("Erro ao atualizar perfil", "Error updating profile"));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(txt("Erro ao atualizar perfil", "Error updating profile"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleLogout() {
    clearUserId();
    setLocation("/");
  }

  function cancelEdit() {
    setEditData({
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      activityLevel: profile.activityLevel,
      impediments: profile.impediments || "",
    });
    setIsEditing(false);
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
    "loss": { pt: "Perder Peso", en: "Lose Weight" },
    "muscle": { pt: "Ganhar Músculo", en: "Build Muscle" },
    "endurance": { pt: "Resistência", en: "Endurance" },
    "maintain": { pt: "Manter Peso", en: "Maintain Weight" },
  };

  const activityLabels: Record<string, { pt: string; en: string }> = {
    "sedentary": { pt: "Sedentário", en: "Sedentary" },
    "light": { pt: "Leve", en: "Light" },
    "moderate": { pt: "Moderado", en: "Moderate" },
    "very": { pt: "Muito Ativo", en: "Very Active" },
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
          <div className="flex gap-2">
            {!isEditing ? (
              <Button 
                variant="outline"
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-profile"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                {txt("Editar", "Edit")}
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={isSaving}
                  data-testid="button-cancel-edit"
                >
                  <X className="w-4 h-4 mr-2" />
                  {txt("Cancelar", "Cancel")}
                </Button>
                <Button 
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  data-testid="button-save-profile"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {txt("Guardar", "Save")}
                </Button>
              </>
            )}
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
                  {profile.sex === "Male" ? txt("Masculino", "Male") : txt("Feminino", "Female")}
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
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={editData.weight}
                      onChange={(e) => setEditData({...editData, weight: e.target.value})}
                      className="w-20 h-8"
                      data-testid="input-edit-weight"
                    />
                    <span>kg</span>
                  </div>
                ) : (
                  <span className="font-medium" data-testid="text-profile-weight">{profile.weight} kg</span>
                )}
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  {txt("Altura", "Height")}
                </span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={editData.height}
                      onChange={(e) => setEditData({...editData, height: e.target.value})}
                      className="w-20 h-8"
                      data-testid="input-edit-height"
                    />
                    <span>cm</span>
                  </div>
                ) : (
                  <span className="font-medium" data-testid="text-profile-height">{profile.height} cm</span>
                )}
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
                {isEditing ? (
                  <Select value={editData.goal} onValueChange={(v) => setEditData({...editData, goal: v})}>
                    <SelectTrigger className="w-40" data-testid="select-edit-goal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loss">{txt("Perder Peso", "Lose Weight")}</SelectItem>
                      <SelectItem value="muscle">{txt("Ganhar Músculo", "Build Muscle")}</SelectItem>
                      <SelectItem value="endurance">{txt("Resistência", "Endurance")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium text-primary" data-testid="text-profile-goal">
                    {goalLabels[profile.goal]?.[language] || profile.goal}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">{txt("Nível de Atividade", "Activity Level")}</span>
                {isEditing ? (
                  <Select value={editData.activityLevel} onValueChange={(v) => setEditData({...editData, activityLevel: v})}>
                    <SelectTrigger className="w-40" data-testid="select-edit-activity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">{txt("Sedentário", "Sedentary")}</SelectItem>
                      <SelectItem value="light">{txt("Leve", "Light")}</SelectItem>
                      <SelectItem value="moderate">{txt("Moderado", "Moderate")}</SelectItem>
                      <SelectItem value="very">{txt("Muito Ativo", "Very Active")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-medium" data-testid="text-profile-activity">
                    {activityLabels[profile.activityLevel]?.[language] || profile.activityLevel}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-500">
                <Activity className="w-5 h-5" />
                {txt("Limitações Físicas", "Physical Limitations")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  <Label>{txt("Descreva quaisquer limitações", "Describe any limitations")}</Label>
                  <Input 
                    value={editData.impediments}
                    onChange={(e) => setEditData({...editData, impediments: e.target.value})}
                    placeholder={txt("Ex: Dor no joelho, lesão nas costas", "Ex: Knee pain, back injury")}
                    data-testid="input-edit-impediments"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground" data-testid="text-profile-impediments">
                  {profile.impediments || txt("Nenhuma limitação reportada", "No limitations reported")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {isEditing && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-heading text-lg font-bold">{txt("Regenerar Plano de Treino", "Regenerate Workout Plan")}</h3>
                  <p className="text-muted-foreground text-sm">
                    {txt("Guardar alterações e criar um novo plano baseado no seu perfil atualizado", "Save changes and create a new plan based on your updated profile")}
                  </p>
                </div>
                <Button 
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-regenerate-plan"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {txt("Guardar e Regenerar Plano", "Save & Regenerate Plan")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

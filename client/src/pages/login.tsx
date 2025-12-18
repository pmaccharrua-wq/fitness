import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Lock, Loader2, ArrowLeft } from "lucide-react";
import { saveUserId } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language] = useState(() => localStorage.getItem("language") || "pt");

  const t = (pt: string, en: string) => language === "pt" ? pt : en;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!phoneNumber || !pin) {
      toast.error(t("Preencha todos os campos", "Please fill all fields"));
      return;
    }

    if (pin.length !== 4) {
      toast.error(t("O PIN deve ter 4 dígitos", "PIN must be 4 digits"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, pin }),
      });

      const data = await response.json();

      if (data.success) {
        saveUserId(data.userId);
        localStorage.setItem("language", data.language || "pt");
        toast.success(t("Login com sucesso!", "Login successful!"));
        
        // Check if user has any plans - if not, go to profile
        try {
          const plansResponse = await fetch(`/api/plans/${data.userId}`);
          const plansData = await plansResponse.json();
          if (plansData.success && plansData.plans && plansData.plans.length > 0) {
            setLocation("/dashboard");
          } else {
            setLocation("/profile");
          }
        } catch {
          setLocation("/profile");
        }
      } else {
        toast.error(data.error || t("Credenciais inválidas", "Invalid credentials"));
      }
    } catch (error) {
      toast.error(t("Erro ao fazer login", "Login error"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 safe-area-inset">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-heading font-bold text-primary" data-testid="text-login-title">
            AI<span className="text-foreground">FITNESS</span>
          </h1>
          <p className="text-muted-foreground" data-testid="text-login-subtitle">
            {t("Entre na sua conta", "Sign in to your account")}
          </p>
        </div>

        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardContent className="p-6 space-y-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t("Número de Telemóvel", "Phone Number")}
                </Label>
                <Input
                  type="tel"
                  placeholder="+351..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  data-testid="input-phone"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t("PIN (4 dígitos)", "PIN (4 digits)")}
                </Label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  data-testid="input-pin"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-submit-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("A entrar...", "Signing in...")}
                  </>
                ) : (
                  t("Entrar", "Sign In")
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {t("Não tem conta?", "Don't have an account?")}{" "}
              <Link href="/onboarding" className="text-primary hover:underline" data-testid="link-signup">
                {t("Criar conta", "Sign up")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1" data-testid="link-back">
            <ArrowLeft className="w-4 h-4" />
            {t("Voltar ao início", "Back to home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Shield, Heart } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const DISCLAIMER_KEY = "disclaimer_accepted";

export default function DisclaimerModal() {
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { language } = useTranslation();

  useEffect(() => {
    const hasAccepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!hasAccepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    if (accepted) {
      localStorage.setItem(DISCLAIMER_KEY, "true");
      setOpen(false);
    }
  };

  const t = (pt: string, en: string) => language === "pt" ? pt : en;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            {t("Aviso Importante", "Important Notice")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("Termos de uso e avisos legais", "Terms of use and legal notices")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <Heart className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1">{t("Aviso Médico", "Medical Disclaimer")}</p>
              <p className="text-muted-foreground">
                {t(
                  "Esta aplicação NÃO substitui o aconselhamento médico profissional. O conteúdo gerado por IA é apenas informativo e educacional. Consulte sempre um médico, nutricionista ou fisiologista antes de iniciar qualquer programa de exercício ou dieta.",
                  "This application does NOT replace professional medical advice. AI-generated content is informational and educational only. Always consult a doctor, nutritionist, or physiologist before starting any exercise or diet program."
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1">{t("Proteção de Dados (RGPD)", "Data Protection (GDPR)")}</p>
              <p className="text-muted-foreground">
                {t(
                  "Os seus dados pessoais e de saúde são tratados de forma segura e confidencial. Utilizamos os seus dados apenas para gerar planos personalizados. Pode solicitar a eliminação dos seus dados a qualquer momento.",
                  "Your personal and health data is processed securely and confidentially. We use your data only to generate personalized plans. You can request deletion of your data at any time."
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold mb-1">{t("Responsabilidade", "Liability")}</p>
              <p className="text-muted-foreground">
                {t(
                  "Ao utilizar esta aplicação, assume total responsabilidade pelos resultados. Se sentir dor, tonturas ou desconforto durante o exercício, pare imediatamente e consulte um médico.",
                  "By using this application, you assume full responsibility for the outcomes. If you experience pain, dizziness, or discomfort during exercise, stop immediately and consult a doctor."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 pt-2">
            <Checkbox 
              id="accept-terms" 
              checked={accepted} 
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              data-testid="checkbox-accept-disclaimer"
            />
            <label htmlFor="accept-terms" className="text-sm cursor-pointer leading-tight">
              {t(
                "Li e compreendo os avisos acima. Confirmo que tenho 18 anos ou mais e que consultarei um profissional de saúde antes de seguir qualquer recomendação.",
                "I have read and understand the notices above. I confirm that I am 18 years or older and will consult a healthcare professional before following any recommendations."
              )}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleAccept} 
            disabled={!accepted}
            className="w-full"
            data-testid="button-accept-disclaimer"
          >
            {t("Aceitar e Continuar", "Accept and Continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

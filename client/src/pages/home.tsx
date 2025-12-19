import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import heroImage from "@assets/generated_images/futuristic_gym_atmosphere_with_neon_lighting.png";
import abstractImage from "@assets/generated_images/abstract_digital_health_interface_concept.png";

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
      <nav className="absolute top-0 w-full p-4 sm:p-6 flex flex-col items-center z-50">
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-primary tracking-tighter">
            AI<span className="text-foreground">FITNESS</span>
        </h1>
        <Link href="/login" className="mt-4">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2 rounded-full font-semibold text-sm sm:text-base shadow-[0_0_15px_rgba(16,185,129,0.3)]" data-testid="button-login">
            {t("home", "login")}
          </Button>
        </Link>
      </nav>

      <section className="relative min-h-screen flex items-center py-20 sm:py-0">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Gym Background" 
            className="w-full h-full object-cover opacity-40 sm:opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-background via-background/95 sm:via-background/90 to-background/70 sm:to-transparent" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6 text-center sm:text-left"
          >
            <div className="inline-block px-3 py-1 border border-primary/50 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium tracking-wide uppercase">
              {t("home", "poweredBy")}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold leading-tight uppercase" data-testid="text-hero-title">
              {t("home", "trainSmarter")}<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                {t("home", "notHarder")}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto sm:mx-0 leading-relaxed" data-testid="text-hero-description">
              {t("home", "description")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <Link href="/onboarding">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-all touch-manipulation" data-testid="button-start-journey">
                  {t("home", "startJourney")}
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base sm:text-lg font-bold rounded-full border-muted-foreground/30 hover:bg-white/5 active:scale-95 transition-all touch-manipulation" data-testid="button-learn-more">
                  {t("home", "learnMore")}
                </Button>
              </Link>
            </div>
          </motion.div>
          
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="hidden md:block relative"
          >
            <div className="relative z-10 bg-card/10 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <img src={abstractImage} alt="Interface" className="rounded-lg shadow-inner opacity-90" />
              
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl border border-border shadow-lg flex items-center gap-3 animate-bounce duration-3000">
                 <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">✓</div>
                 <div>
                   <div className="text-xs text-muted-foreground uppercase">{t("home", "dailyGoal")}</div>
                   <div className="font-bold">{t("home", "completed")}</div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

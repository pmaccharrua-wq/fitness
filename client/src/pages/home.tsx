import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import heroImage from "@assets/generated_images/futuristic_gym_atmosphere_with_neon_lighting.png";
import abstractImage from "@assets/generated_images/abstract_digital_health_interface_concept.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Navigation */}
      <nav className="absolute top-0 w-full p-6 flex justify-between items-center z-50">
        <h1 className="text-2xl font-heading font-bold text-primary tracking-tighter">
            AI<span className="text-foreground">FITNESS</span>
        </h1>
        <Link href="/login">
          <Button variant="ghost" className="text-foreground hover:text-primary">Login</Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Gym Background" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-block px-3 py-1 border border-primary/50 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide uppercase">
              Powered by Azure OpenAI
            </div>
            <h1 className="text-5xl md:text-7xl font-heading font-bold leading-tight uppercase">
              Train Smarter,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                Not Harder.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Your personalized AI coach. Generates 30-day fitness and nutrition plans tailored exactly to your body type, goals, and equipment.
            </p>
            
            <div className="flex gap-4 pt-4">
              <Link href="/onboarding">
                <Button size="lg" className="h-14 px-8 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all">
                  Start Your Journey
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold rounded-full border-muted-foreground/30 hover:bg-white/5">
                Learn More
              </Button>
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
              
              {/* Floating Cards */}
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl border border-border shadow-lg flex items-center gap-3 animate-bounce duration-3000">
                 <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">✓</div>
                 <div>
                   <div className="text-xs text-muted-foreground uppercase">Daily Goal</div>
                   <div className="font-bold">Completed</div>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

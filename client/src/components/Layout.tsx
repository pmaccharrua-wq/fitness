import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, User, Activity, Calendar, LogOut, Home } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Calendar, label: "Plan", href: "/plan" },
    { icon: Activity, label: "Progress", href: "/progress" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 border-r border-border hidden md:flex flex-col bg-card/50 backdrop-blur-sm fixed h-full">
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold text-primary tracking-tighter">
            AI<span className="text-foreground">FITNESS</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer",
                location === item.href 
                  ? "bg-primary/10 text-primary border-l-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-destructive w-full transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative md:ml-64 pb-20 md:pb-0">
        {/* Mobile Header */}
        <div className="md:hidden h-14 border-b border-border flex items-center justify-center px-4 bg-card/80 backdrop-blur-md sticky top-0 z-50">
           <h1 className="text-lg font-heading font-bold text-primary">
            AI<span className="text-foreground">FITNESS</span>
          </h1>
        </div>

        <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 z-50 safe-area-pb">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all touch-manipulation",
              location === item.href 
                ? "text-primary bg-primary/10" 
                : "text-muted-foreground active:bg-white/10"
            )}>
              <item.icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
}

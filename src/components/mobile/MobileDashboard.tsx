import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, FileText, Bell, Navigation, User, Plane, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MobileLayout } from "./MobileLayout";
interface MenuOption {
  id: string;
  icon: React.ElementType;
  label: string;
  route: string;
}
const MENU_OPTIONS: MenuOption[] = [{
  id: "logbook",
  icon: BookOpen,
  label: "DIÁRIO DE BORDO",
  route: "/diario-bordo"
}, {
  id: "report",
  icon: FileText,
  label: "RELATÓRIO",
  route: "/financeiro/viagem"
}, {
  id: "ctm",
  icon: Bell,
  label: "REPORTE CTM",
  route: "/manutencao/ctm"
}, {
  id: "flight-plan",
  icon: Navigation,
  label: "PLANO VOO",
  route: "/plano-voo"
}, {
  id: "profile",
  icon: User,
  label: "PERFIL",
  route: "/perfil"
}];
export function MobileDashboard() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const {
        data
      } = await supabase.from("user_profiles").select("display_name, full_name, avatar_url").eq("id", user.id).single();
      setDisplayName(data?.display_name || data?.full_name || "");
      setAvatarUrl(data?.avatar_url || null);
    };
    fetchProfile();
  }, [user]);
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };
  return <MobileLayout>
      <div className="flex flex-col min-h-screen bg-background">
        {/* Hero Header with gradient */}
        <div className="relative pt-14 pb-28 px-8 bg-gradient-to-b from-[hsl(222,40%,18%)] via-[hsl(222,30%,12%)] to-background overflow-hidden">
          {/* Airplane watermark */}
          <div className="absolute top-8 right-[-10%] opacity-[0.06] pointer-events-none scale-150 rotate-[-15deg]">
            <Plane size={240} strokeWidth={0.5} className="text-primary" />
          </div>

          {/* Profile Section */}
          <motion.div className="flex items-center gap-4 relative z-20" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          ease: "easeOut"
        }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl bg-card">
                {avatarUrl ? <img alt="Piloto" src={avatarUrl} className="w-full h-full object-cover rounded-lg" /> : <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold text-lg">
                    {getInitials(displayName || "U")}
                  </div>}
              </div>
              
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.2em]">
                {getGreeting()},
              </p>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                {displayName || "Comandante"}
              </h1>
            </div>
          </motion.div>
        </div>

        {/* Menu Grid - Overlapping hero */}
        <div className="flex-1 px-6 -mt-20 relative z-30 pb-10">
          <div className="grid grid-cols-2 gap-y-10 gap-x-6 max-w-sm mx-auto">
            {MENU_OPTIONS.map((option, index) => <motion.button key={option.id} className="flex flex-col items-center gap-3 group" onClick={() => navigate(option.route)} initial={{
            opacity: 0,
            y: 30
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.4,
            delay: index * 0.08,
            ease: "easeOut"
          }} whileTap={{
            scale: 0.92
          }}>
                {/* Icon Circle */}
                <div className="relative">
                  <div className="w-[72px] h-[72px] rounded-full bg-card border-2 border-border/60 flex items-center justify-center shadow-lg group-hover:border-primary/50 group-hover:shadow-primary/10 group-hover:shadow-xl transition-all duration-300">
                    <option.icon className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                  </div>
                  {/* Subtle glow ring on hover */}
                  <div className="absolute inset-0 rounded-full bg-primary/5 scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                </div>
                {/* Label */}
                <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground group-hover:text-foreground transition-colors duration-200 text-center leading-tight">
                  {option.label}
                </span>
              </motion.button>)}
          </div>

          {/* AI Insight Card */}
          
        </div>
      </div>
    </MobileLayout>;
}
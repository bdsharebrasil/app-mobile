import { NavLink } from "react-router-dom";
import { Home, BookOpen, Navigation, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
const tabs = [{
  icon: Home,
  label: "Início",
  href: "/"
}, {
  icon: BookOpen,
  label: "Diário",
  href: "/diario-bordo"
}, {
  icon: Navigation,
  label: "Plano Voo",
  href: "/plano-voo"
}, {
  icon: Bell,
  label: "CTM",
  href: "/manutencao/ctm"
}, {
  icon: User,
  label: "Perfil",
  href: "/perfil"
}];
export const MobileTabBar = () => {
  return <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Frosted glass background */}
      <div className="bg-card/80 backdrop-blur-2xl border-t border-border/50 safe-area-bottom">
        
      </div>
    </nav>;
};
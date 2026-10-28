import { useNavigate } from "react-router-dom";
import { Home, Plane, Wrench, BarChart3, User } from "lucide-react";
import { ExpandableTabs, type Tab } from "@/components/ui/expandable-tabs";

const navItems: Tab[] = [
  { title: "Home", icon: Home, href: "/" },
  { title: "Voos", icon: Plane, href: "/diario-bordo" },
  { title: "Manutenções", icon: Wrench, href: "/manutencao/ctm" },
  { title: "Despesas de Viagem", icon: BarChart3, href: "/financeiro/despesas-viagem" },
  { title: "Perfil", icon: User, href: "/perfil" },
];

export const MobileTabBar = () => {
  const navigate = useNavigate();

  const handleNavigate = (index: number | null) => {
    if (index !== null) {
      navigate(navItems[index].href);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:max-w-lg z-50">
      <ExpandableTabs
        tabs={navItems}
        className="bg-[#0d1e38]/90 backdrop-blur-md border border-white/20 shadow-xl w-full"
        activeColor="text-[#0abf53]"
        onChange={handleNavigate}
      />
    </div>
  );
};

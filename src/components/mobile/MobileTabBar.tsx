import { useNavigate } from "react-router-dom";
import { Home, Plane, Navigation, Wrench, BarChart3, User } from "lucide-react";
import { ExpandableTabs, type Tab } from "@/components/ui/expandable-tabs";

const navItems: Tab[] = [
  { title: "Home", icon: Home, href: "/" },
  { title: "Voos", icon: Plane, href: "/diario-bordo" },
  { title: "Plano", icon: Navigation, href: "/plano-voo" },
  { title: "Manutenções", icon: Wrench, href: "/manutencao/ctm" },
  { title: "Relatórios", icon: BarChart3, href: "/financeiro/viagem" },
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
    <div
      className="fixed left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-50"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <ExpandableTabs
        tabs={navItems}
        className="bg-[#0d1e38]/90 backdrop-blur-md border border-white/20 shadow-xl w-full"
        activeColor="text-[#0abf53]"
        onChange={handleNavigate}
      />
    </div>
  );
};

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock3,
  Plane,
  DollarSign,
  Wrench,
  CreditCard,
  Bell,
  User,
  LogOut,
  Navigation,
  PlaneTakeoff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api-client";
import { flightListQueryKey, flightNeedsTimeCompletion } from "@/lib/flight-query-keys";
import { MobileLayout } from "./MobileLayout";

interface NavigationItem {
  id: string;
  title: string;
  icon: React.ElementType;
  route: string;
  color: "white" | "green" | "navy";
  coordinatorOnly?: boolean;
}

const NAV_ITEMS: NavigationItem[] = [
  {
    id: "flights",
    title: "Diário de Bordo",
    icon: Plane,
    route: "/diario-bordo",
    color: "white",
  },
  {
    id: "flight-plan",
    title: "Plano de Voo",
    icon: Navigation,
    route: "/plano-voo",
    color: "green",
  },
  {
    id: "my-flights",
    title: "Meus Voos",
    icon: PlaneTakeoff,
    route: "/meus-voos",
    color: "navy",
  },
  {
    id: "payroll",
    title: "Folha de Pagamento",
    icon: DollarSign,
    route: "/financeiro/folha",
    color: "green",
  },
  {
    id: "maintenance",
    title: "Manutenção",
    icon: Wrench,
    route: "/manutencao/ctm",
    color: "navy",
  },
  {
    id: "reports",
    title: "Despesas de Viagem",
    icon: CreditCard,
    route: "/financeiro/despesas-viagem",
    color: "white",
  },
  {
    id: "notifications",
    title: "Notificações",
    icon: Bell,
    route: "/notificacoes",
    color: "green",
  },
  {
    id: "profile",
    title: "Perfil",
    icon: User,
    route: "/perfil",
    color: "navy",
  },
];

const colorStyles = {
  white: {
    bg: "bg-white",
    text: "text-[#1a2844]",
    icon: "text-[#1a2844]",
    iconBg: "bg-[#1a2844]/10",
  },
  green: {
    bg: "bg-[#089a43]",
    text: "text-white",
    icon: "text-white",
    iconBg: "bg-white/20",
  },
  navy: {
    bg: "bg-[#1a2844]",
    text: "text-white",
    icon: "text-white",
    iconBg: "bg-white/10",
  },
};

export function MobileDashboard() {
  const { roles, signOut } = useAuth();
  const navigate = useNavigate();
  const flightsQuery = useQuery({
    queryKey: flightListQueryKey,
    queryFn: () => apiClient.get<{ voos: Array<{ status?: string | null }> }>("/api/colaborador/meus-voos"),
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const activeFlightCount = (flightsQuery.data?.voos ?? []).filter((flight) => flightNeedsTimeCompletion(flight.status)).length;
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredItems = NAV_ITEMS.filter(
    (o) =>
      !o.coordinatorOnly ||
      roles.includes("coordenador_de_voo") ||
      roles.includes("admin") ||
      roles.includes("gestor_master") ||
      roles.includes("piloto_chefe")
  );

  return (
    <MobileLayout>
      <div
        className="min-h-screen px-5 pt-8 pb-24 relative overflow-hidden"
        style={{
          backgroundColor: "#001122",
          backgroundImage: `url('https://cdn.builder.io/api/v1/image/assets%2F7a90d07cace9451eb9eff4bb0d5bcc31%2F2fedfc9aa51d4632b60e4a81a7349aab?format=webp&width=800')`,
          backgroundPosition: "center",
          backgroundSize: "400px",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#001122]/90 pointer-events-none" />

        <div className="max-w-2xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            className="mb-6 rounded-[28px] border border-white/10 bg-black/60 p-5 shadow-2xl"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#089a43]">
                <Plane className="h-5 w-5 text-white" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white leading-tight">Share Brasil</h1>
                <p className="text-sm text-gray-400">
                  Sistema de Compartilhamento de Aeronaves
                </p>
              </div>
            </div>
          </motion.div>

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 grid-rows-4 grid-flow-col gap-3 mb-6">
            {filteredItems.map((item, index) => {
              const style = colorStyles[item.color];
              const needsTimes = item.id === "my-flights" && activeFlightCount > 0;
              return (
                <motion.button
                  key={item.id}
                  className="group"
                  aria-label={needsTimes ? `Meus Voos. ${activeFlightCount} voos em operação. Complete os horários das jornadas ou pernas.` : item.title}
                  onClick={() => navigate(item.route)}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.08,
                    ease: "easeOut",
                  }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div
                    className={`${style.bg} relative w-full h-full min-h-[130px] rounded-[24px] flex flex-col justify-between items-start gap-3 p-4 text-left cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl ${needsTimes ? "ring-2 ring-amber-300 shadow-amber-300/20" : ""}`}
                  >
                    {needsTimes && <span className="absolute right-3 top-3 inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-[#1a2844]"><Clock3 className="h-2.5 w-2.5" />{activeFlightCount}</span>}
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${style.iconBg}`}>
                      <item.icon
                        className={`w-5 h-5 ${needsTimes ? "text-amber-200" : style.icon}`}
                        strokeWidth={1.5}
                      />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`${style.text} text-[13px] leading-tight font-semibold line-clamp-2`}
                      >
                        {item.title}
                      </span>
                      {needsTimes && <span className="text-[10px] font-bold leading-tight text-amber-200">Complete horários</span>}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Logout Button */}
          <motion.button
            onClick={handleLogout}
            className="w-full text-white font-semibold py-3.5 px-6 rounded-full border border-white/15 bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 hover:bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.97 }}
          >
            <LogOut className="w-5 h-5" />
            Sair
          </motion.button>
        </div>
      </div>
    </MobileLayout>
  );
}

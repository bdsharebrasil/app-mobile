import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Wrench,
  X,
  AlertTriangle,
  Plane,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

type Severity = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_analysis" | "in_maintenance" | "resolved";

interface MaintenanceReport {
  id: string;
  aircraft_id: string;
  reported_by: string;
  report_date: string;
  description: string;
  severity: Severity;
  status: Status;
  corrective_action?: string;
  aircraft?: {
    id: string;
    registration: string;
    model: string;
    image_url?: string;
  };
  reporter?: {
    full_name: string;
  };
}

interface Aircraft {
  id: string;
  registration: string;
  model: string;
  image_url?: string;
  in_maintenance: boolean;
}

/* ------------------------------------------------------------------ */
/* Tokens (cores de sistema iOS)                                       */
/* ------------------------------------------------------------------ */

const SEVERITY: Record<Severity, { label: string; color: string; tint: string }> = {
  low: { label: "Baixa", color: "#007AFF", tint: "rgba(0,122,255,0.12)" },
  medium: { label: "Média", color: "#B38600", tint: "rgba(255,204,0,0.20)" },
  high: { label: "Alta", color: "#FF9500", tint: "rgba(255,149,0,0.14)" },
  critical: { label: "Crítica", color: "#FF3B30", tint: "rgba(255,59,48,0.12)" },
};

const STATUS: Record<Status, { label: string; color: string; tint: string }> = {
  open: { label: "Aberto", color: "#FF3B30", tint: "rgba(255,59,48,0.12)" },
  in_analysis: { label: "Em análise", color: "#B38600", tint: "rgba(255,204,0,0.20)" },
  in_maintenance: { label: "Em manutenção", color: "#007AFF", tint: "rgba(0,122,255,0.12)" },
  resolved: { label: "Resolvido", color: "#248A3D", tint: "rgba(52,199,89,0.16)" },
};

const FILTERS: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "open", label: "Abertos" },
  { key: "in_analysis", label: "Em análise" },
  { key: "in_maintenance", label: "Em manutenção" },
  { key: "resolved", label: "Resolvidos" },
];

const SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.9 } as const;
const PRESS = { type: "spring", stiffness: 600, damping: 30 } as const;

const haptic = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* sem suporte */
  }
};

/* ------------------------------------------------------------------ */
/* Componentes pequenos                                                */
/* ------------------------------------------------------------------ */

function Pill({ label, color, tint }: { label: string; color: string; tint: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none whitespace-nowrap"
      style={{ color, backgroundColor: tint }}
    >
      {label}
    </span>
  );
}

function NavBar({
  title,
  onBack,
  backLabel,
  action,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="sticky top-0 z-30 border-b border-black/[0.06] bg-[rgba(29,48,80,0.8)] backdrop-blur-xl backdrop-saturate-150"
      style={{ WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}
    >
      <div className="mx-auto my-0 flex h-[52px] w-full max-w-3xl items-center justify-between px-2 sm:px-4">
        <motion.button
          type="button"
          whileTap={{ opacity: 0.4 }}
          onClick={() => {
            haptic();
            onBack();
          }}
          className="-ml-1 mt-[15px] flex h-11 min-w-[44px] items-center gap-0.5 rounded-xl pr-3 text-[17px] text-[#007AFF] active:opacity-50"
          aria-label={`Voltar para ${backLabel}`}
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2.4} />
          <span className="-ml-0.5">{backLabel}</span>
        </motion.button>
        <div className="flex min-w-[44px] justify-end">{action}</div>
      </div>
      <div className="mx-auto mb-[3px] mt-[3px] w-full max-w-3xl px-4 pb-2 pt-0 sm:px-6">
        <h1 className="py-[7px] text-[28px] font-medium leading-[28.8px] tracking-[-0.022em] text-[#E1EEEC]">
          {title}
        </h1>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela principal                                                      */
/* ------------------------------------------------------------------ */

export default function GestaoCTM() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [aircraftSearch, setAircraftSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getCTMMaintenanceReports();
      setReports((response.data || []) as MaintenanceReport[]);
      setAircraft((response.aeronaves || []) as Aircraft[]);
    } catch (error: any) {
      toast.error("Não foi possível carregar os reports. " + (error?.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  /* contagem de reports abertos por aeronave (para o badge do card) */
  const openCountByAircraft = useMemo(() => {
    const map: Record<string, number> = {};
    reports.forEach((r) => {
      if (r.status !== "resolved") map[r.aircraft_id] = (map[r.aircraft_id] || 0) + 1;
    });
    return map;
  }, [reports]);

  const visibleAircraft = useMemo(() => {
    const s = aircraftSearch.trim().toLowerCase();
    return aircraft.filter((ac) => !s || `${ac.registration} ${ac.model}`.toLowerCase().includes(s));
  }, [aircraft, aircraftSearch]);

  const selectedAircraft = aircraft.find((a) => a.id === selectedAircraftId);

  const filteredReports = useMemo(() => {
    if (!selectedAircraftId) return [];
    return reports
      .filter((r) => r.aircraft_id === selectedAircraftId)
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .sort((a, b) => +new Date(b.report_date) - +new Date(a.report_date));
  }, [reports, selectedAircraftId, statusFilter]);

  const openAircraft = (id: string) => {
    haptic();
    setStatusFilter("all");
    setExpandedId(null);
    setSelectedAircraftId(id);
  };

  const closeAircraft = () => {
    setSelectedAircraftId(null);
    setExpandedId(null);
  };

  const pageAnim = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
      };

  /* ---------------------------- loading ---------------------------- */
  if (loading) {
    return (
      <MobileLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#090B10] px-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          >
            <Wrench className="h-10 w-10 text-[#007AFF]" strokeWidth={1.8} />
          </motion.div>
          <p className="text-[15px] text-black/50">Carregando reports…</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-[#090B10] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Inter',system-ui,sans-serif] antialiased">
        <AnimatePresence mode="wait" initial={false}>
          {selectedAircraftId && selectedAircraft ? (
            /* ======================= DETALHE DA AERONAVE ======================= */
            <motion.div key="detail" {...pageAnim} transition={SPRING}>
              <NavBar
                title={selectedAircraft.registration}
                backLabel="Aeronaves"
                onBack={closeAircraft}
                action={
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    transition={PRESS}
                    onClick={() => {
                      haptic();
                      toast.info("Criar novo report em breve");
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[#007AFF]"
                    aria-label="Novo report"
                  >
                    <Plus className="h-6 w-6" strokeWidth={2.4} />
                  </motion.button>
                }
              />

              <div
                className="mx-auto w-full max-w-3xl space-y-5 px-4 pt-4 sm:px-6"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 112px)" }}
              >
                {/* Banner da aeronave */}
                <div className="relative h-36 overflow-hidden rounded-[22px] bg-gradient-to-br from-[#0A84FF] to-[#0040DD] shadow-[0_8px_24px_-8px_rgba(0,64,221,0.45)] sm:h-44">
                  {selectedAircraft.image_url && (
                    <img
                      src={selectedAircraft.image_url}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-45"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 sm:p-5">
                    <div>
                      <p className="text-[20px] font-bold leading-tight text-white">
                        {selectedAircraft.model}
                      </p>
                      <p className="text-[15px] text-white/80">{selectedAircraft.registration}</p>
                    </div>
                    {selectedAircraft.in_maintenance && (
                      <span className="rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-[#FF9500] backdrop-blur">
                        Em manutenção
                      </span>
                    )}
                  </div>
                </div>

                {/* Filtros por status (scroll horizontal com snap) */}
                <div className="-mx-4 sm:-mx-6">
                  <div
                    className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 sm:px-6 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                  >
                    {FILTERS.map((f) => {
                      const active = statusFilter === f.key;
                      return (
                        <motion.button
                          key={f.key}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          transition={PRESS}
                          onClick={() => {
                            haptic();
                            setStatusFilter(f.key);
                          }}
                          className={`h-9 shrink-0 snap-start rounded-full px-4 text-[15px] font-medium transition-colors ${
                            active
                              ? "bg-[#007AFF] text-white"
                              : "bg-white text-black/80 shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)]"
                          }`}
                        >
                          {f.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <p className="px-1 text-[13px] font-medium text-black/50">
                  {filteredReports.length === 1
                    ? "1 report"
                    : `${filteredReports.length} reports`}
                </p>

                {/* Lista de reports */}
                {filteredReports.length === 0 ? (
                  <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04]">
                      <Wrench className="h-6 w-6 text-black/35" />
                    </div>
                    <p className="text-[17px] font-semibold text-black">Nenhum report</p>
                    <p className="mt-1 max-w-[260px] text-[15px] leading-snug text-black/50">
                      {statusFilter === "all"
                        ? "Esta aeronave ainda não tem reports de manutenção."
                        : "Nenhum report com este status. Troque o filtro para ver outros."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredReports.map((report) => {
                      const sev = SEVERITY[report.severity];
                      const st = STATUS[report.status];
                      const expanded = expandedId === report.id;
                      return (
                        <motion.article
                          key={report.id}
                          layout={!reduceMotion}
                          transition={SPRING}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => {
                            haptic();
                            setExpandedId(expanded ? null : report.id);
                          }}
                          className="relative cursor-pointer overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_2px_10px_-4px_rgba(0,0,0,0.08)]"
                        >
                          {/* faixa de severidade */}
                          <span
                            className="absolute inset-y-0 left-0 w-[5px]"
                            style={{ backgroundColor: sev.color }}
                            aria-hidden
                          />
                          <div className="space-y-3 py-4 pl-[22px] pr-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                  style={{ backgroundColor: sev.tint }}
                                >
                                  <AlertTriangle
                                    className="h-5 w-5"
                                    style={{ color: sev.color }}
                                    strokeWidth={2.2}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[17px] font-semibold leading-tight text-black">
                                    Report #{report.id.slice(0, 8)}
                                  </p>
                                  <p className="text-[13px] text-black/50">
                                    {new Date(report.report_date).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Pill label={sev.label} color={sev.color} tint={sev.tint} />
                            </div>

                            <p
                              className={`text-[15px] leading-[1.4] text-black/75 ${
                                expanded ? "" : "line-clamp-3"
                              }`}
                            >
                              {report.description}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <Pill label={st.label} color={st.color} tint={st.tint} />
                              <span className="text-[13px] text-black/45">
                                {report.reporter?.full_name || "Desconhecido"}
                              </span>
                            </div>

                            <AnimatePresence initial={false}>
                              {expanded && report.corrective_action && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.22 }}
                                  className="overflow-hidden"
                                >
                                  <div className="rounded-2xl bg-[#34C759]/12 p-3">
                                    <p className="text-[13px] font-semibold text-[#248A3D]">
                                      Ação corretiva
                                    </p>
                                    <p className="mt-0.5 text-[15px] leading-snug text-black/75">
                                      {report.corrective_action}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.article>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ======================= LISTA DE AERONAVES ======================= */
            <motion.div key="list" {...pageAnim} transition={SPRING}>
              <NavBar title="Manutenção" backLabel="Início" onBack={() => navigate("/")} />

              <div
                className="mx-auto w-full max-w-3xl space-y-5 bg-[#090B10] px-4 pt-3 sm:px-6"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 112px)" }}
              >
                {/* Busca estilo iOS */}
                <div className="flex h-11 items-center gap-2 rounded-[14px] bg-[#767680]/12 px-3">
                  <Search className="h-[18px] w-[18px] shrink-0 text-white" strokeWidth={2.2} />
                  <input
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    placeholder="Buscar aeronave"
                    value={aircraftSearch}
                    onChange={(e) => setAircraftSearch(e.target.value)}
                    /* 17px evita o zoom automático do iOS Safari */
                    className="mx-[2px] mr-[48px] h-full min-w-0 flex-1 rounded-[10px] border border-[#091633] bg-[#AAB8B5] px-5 text-[17px] leading-[15.5px] text-[#F5EFEF] outline-none placeholder:text-black/40 [&::-webkit-search-cancel-button]:hidden"
                  />
                  <AnimatePresence>
                    {aircraftSearch && (
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        onClick={() => setAircraftSearch("")}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/25"
                        aria-label="Limpar busca"
                      >
                        <X className="h-4 w-4 text-white" strokeWidth={3} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Resumo */}
                <div className="ml-[145px] mr-[134px] flex items-center justify-between gap-[5px] rounded-[20px] bg-[#556163] px-[65px] py-3.5 shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
                  <div className="px-0">
                    <p className="text-[13px] text-white">Total de reports</p>
                    <p className="text-[28px] font-bold leading-none tracking-tight text-[#0D2138]">
                      {reports.length}
                    </p>
                  </div>
                  <div className="px-[18px] text-right">
                    <p className="text-[13px] text-white">Em aberto</p>
                    <p className="text-[28px] font-bold leading-none tracking-tight text-[#FF9500]">
                      {reports.filter((r) => r.status !== "resolved").length}
                    </p>
                  </div>
                </div>

                {/* Grid de aeronaves: 2 colunas no iPhone, 3 no tablet, 4 no iPad grande */}
                {visibleAircraft.length === 0 ? (
                  <div className="flex flex-col items-center rounded-[20px] bg-white px-6 py-12 text-center shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04]">
                      <Plane className="h-6 w-6 text-black/35" />
                    </div>
                    <p className="text-[17px] font-semibold text-black">Nenhuma aeronave</p>
                    <p className="mt-1 text-[15px] text-black/50">
                      Tente outra matrícula ou modelo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {visibleAircraft.map((ac) => {
                      const openCount = openCountByAircraft[ac.id] || 0;
                      return (
                        <motion.button
                          key={ac.id}
                          type="button"
                          layout={!reduceMotion}
                          whileTap={{ scale: 0.96 }}
                          transition={PRESS}
                          onClick={() => openAircraft(ac.id)}
                          className="group relative overflow-hidden rounded-[22px] bg-white text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.06),0_4px_14px_-6px_rgba(0,0,0,0.14)]"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#5AA9FF] to-[#0A66E0]">
                            {ac.image_url ? (
                              <img
                                src={ac.image_url}
                                alt={ac.registration}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Plane className="h-9 w-9 text-white/60" strokeWidth={1.6} />
                              </div>
                            )}
                            {openCount > 0 && (
                              <span className="absolute right-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[13px] font-semibold text-white shadow-md">
                                {openCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-[17px] font-semibold leading-tight text-black">
                                {ac.registration}
                              </p>
                              <p className="truncate text-[13px] text-black/50">{ac.model}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-black/25" strokeWidth={2.4} />
                          </div>

                          {ac.in_maintenance && (
                            <div className="mx-3.5 mb-3 -mt-1">
                              <Pill
                                label="Em manutenção"
                                color="#FF9500"
                                tint="rgba(255,149,0,0.14)"
                              />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
}

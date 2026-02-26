import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, AlertCircle, Plus, Wrench, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface MaintenanceReport {
  id: string;
  aircraft_id: string;
  reported_by: string;
  report_date: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "in_analysis" | "in_maintenance" | "resolved";
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
  status?: string;
}

export default function GestaoCTM() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load maintenance reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("maintenance_reports")
        .select(`
          *,
          aircraft:aircraft_id(id, registration, model, image_url),
          reporter:reported_by(full_name)
        `)
        .order("report_date", { ascending: false });

      if (reportsError) throw reportsError;
      if (reportsData) setReports(reportsData as MaintenanceReport[]);

      // Load aircraft
      const { data: aircraftData, error: aircraftError } = await supabase
        .from("aircraft")
        .select("id, registration, model, image_url, status")
        .order("registration");

      if (aircraftError) throw aircraftError;
      if (aircraftData) setAircraft(aircraftData as Aircraft[]);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-blue-100 text-blue-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "critical":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case "low":
        return "Baixa";
      case "medium":
        return "Média";
      case "high":
        return "Alta";
      case "critical":
        return "Crítica";
      default:
        return severity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700";
      case "in_analysis":
        return "bg-yellow-100 text-yellow-700";
      case "in_maintenance":
        return "bg-blue-100 text-blue-700";
      case "resolved":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Aberto";
      case "in_analysis":
        return "Em Análise";
      case "in_maintenance":
        return "Em Manutenção";
      case "resolved":
        return "Resolvido";
      default:
        return status;
    }
  };

  // Get reports for selected aircraft
  const filteredReports = selectedAircraftId
    ? reports.filter((r) => r.aircraft_id === selectedAircraftId)
    : reports;

  // Count reports by aircraft
  const getAircraftReportCount = (aircraftId: string) => {
    return reports.filter((r) => r.aircraft_id === aircraftId).length;
  };

  // Count critical/high severity reports
  const getCriticalCount = (aircraftId: string) => {
    return reports.filter(
      (r) => r.aircraft_id === aircraftId && (r.severity === "critical" || r.severity === "high")
    ).length;
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Wrench className="h-12 w-12 text-primary" />
          </motion.div>
        </div>
      </MobileLayout>
    );
  }

  // Show selected aircraft reports
  if (selectedAircraftId) {
    const selectedAircraft = aircraft.find((a) => a.id === selectedAircraftId);

    return (
      <MobileLayout>
        <div className="p-4 sm:p-6 space-y-6 pb-28">
          {/* Back button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedAircraftId(null)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{selectedAircraft?.registration}</h1>
          </div>

          {/* Aircraft info banner */}
          <div className="relative h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden shadow-lg">
            {selectedAircraft?.image_url && (
              <img
                src={selectedAircraft.image_url}
                alt={selectedAircraft.registration}
                className="w-full h-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 p-4 flex flex-col justify-between">
              <h2 className="text-white font-bold text-lg">{selectedAircraft?.model}</h2>
              <p className="text-white text-sm">{selectedAircraft?.registration}</p>
            </div>
          </div>

          {/* Reports list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Reports ({filteredReports.length})</h2>
              <Button size="sm" onClick={() => toast.info("Criar novo report em breve")} className="bg-primary">
                <Plus className="h-4 w-4 mr-2" />
                Novo
              </Button>
            </div>

            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  Nenhum report de manutenção para esta aeronave
                </CardContent>
              </Card>
            ) : (
              filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              report.severity === "critical"
                                ? "bg-red-100"
                                : report.severity === "high"
                                  ? "bg-orange-100"
                                  : report.severity === "medium"
                                    ? "bg-yellow-100"
                                    : "bg-blue-100"
                            }`}
                          >
                            <AlertCircle
                              className={`h-5 w-5 ${
                                report.severity === "critical"
                                  ? "text-red-600"
                                  : report.severity === "high"
                                    ? "text-orange-600"
                                    : report.severity === "medium"
                                      ? "text-yellow-600"
                                      : "text-blue-600"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Report #{report.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(report.report_date).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge className={getSeverityColor(report.severity)}>
                            {getSeverityLabel(report.severity)}
                          </Badge>
                          <Badge className={getStatusColor(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700">{report.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Reportado por: {report.reporter?.full_name || "Desconhecido"}</span>
                      </div>

                      {report.corrective_action && (
                        <div className="p-2 bg-green-50 rounded text-sm border border-green-200">
                          <p className="font-medium text-green-900">Ação Corretiva:</p>
                          <p className="text-green-700">{report.corrective_action}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Show aircraft selection view
  return (
    <MobileLayout>
      <div className="p-4 sm:p-6 space-y-6 pb-28">
        {/* Back button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Reports de Manutenção</h1>
        </div>

        {/* Search header */}
        <div className="rounded-2xl p-4 border border-[#3c5791]" style={{ backgroundColor: 'rgba(74, 127, 187, 1)' }}>
          <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2">
            <span className="text-lg">🔍</span>
            <input
              type="text"
              placeholder="Buscar aeronave"
              className="w-full bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Aircraft cards grid - Folder style */}
        <div className="grid grid-cols-2 gap-4">
          {aircraft.length === 0 ? (
            <Card className="col-span-2">
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma aeronave encontrada
              </CardContent>
            </Card>
          ) : (
            aircraft.map((ac) => {
              const reportCount = getAircraftReportCount(ac.id);
              const criticalCount = getCriticalCount(ac.id);

              return (
                <motion.div
                  key={ac.id}
                  onClick={() => setSelectedAircraftId(ac.id)}
                  className="block w-full text-left"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Folder-style card container */}
                  <div className="relative cursor-pointer group">
                    {/* Folder tab effect - top accent */}
                    <div className="absolute -top-2 left-0 w-24 h-4 bg-gradient-to-b from-blue-500 to-blue-600 rounded-t-xl opacity-70 group-hover:opacity-100 transition-opacity"></div>

                    {/* Main card */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all border border-blue-200">
                      {/* Aircraft image section */}
                      <div className="relative h-32 bg-gradient-to-b from-blue-400 to-blue-600 overflow-hidden">
                        {ac.image_url && (
                          <img
                            src={ac.image_url}
                            alt={ac.registration}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {!ac.image_url && (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-300 to-blue-500">
                            <Wrench className="h-10 w-10 text-white opacity-50" />
                          </div>
                        )}

                        {/* Report indicator badge - circular on top right */}
                        <div className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-teal-600 shadow-md hover:bg-teal-50 transition text-lg">
                          ➤
                        </div>
                      </div>

                      {/* Content section */}
                      <div className="p-3 space-y-2">
                        {/* Aircraft registration - compact */}
                        <div>
                          <h3 className="font-bold text-sm text-gray-800">{ac.registration}</h3>
                          <p className="text-xs text-gray-500 truncate">{ac.model}</p>
                        </div>

                        {/* Stats - compact icons */}
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="text-lg">👥</span>
                            <span className="font-semibold">{reportCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">🎯</span>
                            <span className="font-semibold">{criticalCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-lg">✓</span>
                            <span className="font-semibold text-green-600">{ac.status === "ativo" || ac.status === "Ativo" ? "Ativo" : "Inativo"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Info card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-bold mb-1">Total de Reports: {reports.length}</p>
                <p>Selecione uma aeronave para ver seus reports de manutenção em detalhes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}

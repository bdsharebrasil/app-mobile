import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import {
  checklistItemsForAircraft,
  FLIGHT_CHECKLIST_SECTIONS,
  type ChecklistAnswer,
  type ChecklistRecord,
  type ChecklistSection,
} from "@/lib/flight-checklist";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Flight = {
  id: string;
  matricula_registro: string | null;
  modelo: string | null;
  numero_voo: string | null;
  origem: string | null;
  destino: string | null;
  data_agendada: string;
};
type AnswerStatus = ChecklistAnswer["status"];
type FuelForm = {
  data: string;
  tipo: string;
  local: string;
  litros: string;
  valorUnitario: string;
  desconto: string;
  comanda: string;
  notaFiscal: string;
};
const initialFuel = (
  dataAgendada: string,
  origem?: string | null,
): FuelForm => ({
  data: dataAgendada.slice(0, 10),
  tipo: "",
  local: origem || "",
  litros: "",
  valorUnitario: "",
  desconto: "",
  comanda: "",
  notaFiscal: "",
});
const sectionCard =
  "overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b192b]";
const fieldClass =
  "h-11 rounded-xl border-white/10 bg-[#071326] text-white placeholder:text-slate-500 focus-visible:ring-emerald-300/50";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-400";
const isDone = (status?: string | null) =>
  String(status || "")
    .trim()
    .toLowerCase() === "concluido";
const normalizeResponse = (value: unknown): Record<string, ChecklistAnswer> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([, answer]) =>
          answer &&
          typeof answer === "object" &&
          ["feito", "alerta", "nao_feito"].includes(
            String((answer as ChecklistAnswer).status),
          ),
      )
      .map(([id, answer]) => [id, answer as ChecklistAnswer]),
  );
};
function splitOilValue(value?: string | null) {
  const match = String(value || "").match(
    /^\s*LH\s*:\s*(.*?)\s*[|;]\s*RH\s*:\s*(.*?)\s*$/i,
  );
  return match
    ? { left: match[1], right: match[2] }
    : { left: String(value || ""), right: "" };
}
function answerNote(itemId: string, record: ChecklistRecord) {
  const direct = record?.itens?.[itemId]?.observacao?.trim();
  if (direct) return direct;
  const legacy = Object.values(record?.alertas || {}).find((entry) =>
    entry.startsWith(`${itemId}:`),
  );
  return legacy ? legacy.slice(itemId.length + 1).trim() : "";
}

export function FlightPreflightChecklist({
  flight,
  checklist,
  editable,
  open,
  onClose,
  onSaved,
}: {
  flight: Flight;
  checklist: ChecklistRecord;
  editable: boolean;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const items = useMemo(
    () => checklistItemsForAircraft(flight.matricula_registro, flight.modelo),
    [flight.matricula_registro, flight.modelo],
  );
  const initialResponses = useMemo(
    () => normalizeResponse(checklist?.itens),
    [checklist?.itens],
  );
  const initialOil = useMemo(
    () => splitOilValue(checklist?.nivel_oleo),
    [checklist?.nivel_oleo],
  );
  const [responses, setResponses] =
    useState<Record<string, ChecklistAnswer>>(initialResponses);
  const [alertNotes, setAlertNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items
        .filter((item) => initialResponses[item.id]?.status === "alerta")
        .map((item) => [item.id, answerNote(item.id, checklist)]),
    ),
  );
  const [oilLeft, setOilLeft] = useState(initialOil.left);
  const [oilRight, setOilRight] = useState(initialOil.right);
  const [needsRefuel, setNeedsRefuel] = useState<"sim" | "nao">(() =>
    checklist?.precisa_abastecer === true ||
    Number(checklist?.precisa_abastecer) === 1 ||
    String(checklist?.precisa_abastecer).toLowerCase() === "sim"
      ? "sim"
      : "nao",
  );
  const [fuel, setFuel] = useState<FuelForm>(() => ({
    ...initialFuel(flight.data_agendada, flight.origem),
    data: String(
      checklist?.abastecimento?.data || flight.data_agendada.slice(0, 10),
    ),
    tipo: String(checklist?.abastecimento?.tipo_combustivel || ""),
    local: String(checklist?.abastecimento?.local || flight.origem || ""),
    litros: String(checklist?.abastecimento?.litros ?? ""),
    valorUnitario: String(checklist?.abastecimento?.valor_unitario ?? ""),
    desconto: String(checklist?.abastecimento?.desconto ?? ""),
    comanda: String(checklist?.abastecimento?.numero_comanda || ""),
    notaFiscal: String(checklist?.abastecimento?.numero_nf || ""),
  }));
  const [notes, setNotes] = useState(checklist?.observacoes || "");
  const [openSection, setOpenSection] = useState(
    FLIGHT_CHECKLIST_SECTIONS[0]?.id || "",
  );
  const [validationMessage, setValidationMessage] = useState("");
  const complete = isDone(checklist?.status);
  const readOnly = complete || !editable;
  const linkedFuel = Boolean(checklist?.abastecimento_id);
  const cacheKey = `share-flight-preflight-${flight.id}`;
  const answeredCount = items.filter((item) =>
    Boolean(responses[item.id]?.status),
  ).length;
  const alertCount = items.filter(
    (item) => responses[item.id]?.status === "alerta",
  ).length;
  const invalidAlertCount = items.filter(
    (item) =>
      responses[item.id]?.status === "alerta" &&
      !String(alertNotes[item.id] || "").trim(),
  ).length;
  const unfinishedItems = items.filter(
    (item) =>
      !["feito", "alerta"].includes(String(responses[item.id]?.status || "")),
  ).length;
  const oilValid =
    oilLeft.trim() !== "" &&
    oilRight.trim() !== "" &&
    Number(oilLeft) >= 0 &&
    Number(oilRight) >= 0;
  const fuelValid =
    needsRefuel === "nao" ||
    Boolean(
      fuel.data &&
        fuel.tipo.trim() &&
        /^[A-Za-z0-9]{4}$/.test(fuel.local.trim()) &&
        Number(fuel.litros) > 0 &&
        Number(fuel.valorUnitario) >= 0 &&
        Number(fuel.desconto || 0) >= 0,
    );
  const isComplete =
    items.length > 0 &&
    answeredCount === items.length &&
    unfinishedItems === 0 &&
    invalidAlertCount === 0 &&
    (!items.some((item) => item.tipo === "oleo") || oilValid) &&
    fuelValid;
  const progress = items.length
    ? Math.round((answeredCount / items.length) * 100)
    : 0;
  const pendingSummary = [
    unfinishedItems
      ? `${unfinishedItems} item(ns) precisam estar como “feito” ou “alerta” justificado.`
      : "",
    invalidAlertCount
      ? `${invalidAlertCount} alerta(s) sem justificativa.`
      : "",
    items.some((item) => item.tipo === "oleo") && !oilValid
      ? "Informe óleo LH e RH."
      : "",
    !fuelValid ? "Complete os dados de abastecimento." : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (open) setValidationMessage("");
    if (!open || checklist) return;
    setValidationMessage("");
    const defaults = {
      responses: {},
      alertNotes: {},
      oilLeft: "",
      oilRight: "",
      needsRefuel: "nao",
      fuel: initialFuel(flight.data_agendada, flight.origem),
      notes: "",
    };
    try {
      const saved =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(cacheKey);
      if (saved) {
        const draft = JSON.parse(saved) as Partial<typeof defaults>;
        setResponses(normalizeResponse(draft.responses));
        setAlertNotes(draft.alertNotes || {});
        setOilLeft(draft.oilLeft || "");
        setOilRight(draft.oilRight || "");
        setNeedsRefuel(draft.needsRefuel === "sim" ? "sim" : "nao");
        setFuel({
          ...initialFuel(flight.data_agendada, flight.origem),
          ...(draft.fuel || {}),
        });
        setNotes(draft.notes || "");
        return;
      }
    } catch {
      /* ignora somente um rascunho local inválido */
    }
    setResponses({});
    setAlertNotes({});
    setOilLeft("");
    setOilRight("");
    setNeedsRefuel("nao");
    setFuel(initialFuel(flight.data_agendada, flight.origem));
    setNotes("");
  }, [open, checklist, flight.data_agendada, flight.origem, cacheKey]);

  useEffect(() => {
    if (!open || complete || readOnly || typeof window === "undefined") return;
    const timer = window.setTimeout(
      () =>
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({
            responses,
            alertNotes,
            oilLeft,
            oilRight,
            needsRefuel,
            fuel,
            notes,
          }),
        ),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [
    open,
    complete,
    readOnly,
    cacheKey,
    responses,
    alertNotes,
    oilLeft,
    oilRight,
    needsRefuel,
    fuel,
    notes,
  ]);

  const saveMutation = useMutation({
    mutationFn: (status: "rascunho" | "concluido") =>
      apiClient.post(
        `/api/interno/agendamento/${encodeURIComponent(flight.id)}/checklist`,
        {
          itens: responses,
          respostas: responses,
          observacoes: notes,
          status,
          alertas: Object.fromEntries(
            items
              .filter((item) => responses[item.id]?.status === "alerta")
              .map((item) => [item.id, alertNotes[item.id] || ""]),
          ),
          nivel_oleo: items.some((item) => item.tipo === "oleo")
            ? `LH: ${oilLeft.trim()} | RH: ${oilRight.trim()}`
            : null,
          abastecimento: {
            necessita_abastecer: needsRefuel === "sim",
            data: fuel.data,
            tipo_combustivel: fuel.tipo.trim(),
            local: fuel.local.trim().toUpperCase(),
            litros: Number(fuel.litros || 0),
            valor_unitario: Number(fuel.valorUnitario || 0),
            desconto: Number(fuel.desconto || 0),
            numero_comanda: fuel.comanda.trim() || null,
            numero_nf: fuel.notaFiscal.trim() || null,
            trecho: `${flight.origem || ""} X ${flight.destino || ""}`,
          },
        },
      ),
    onSuccess: async (_result, status) => {
      await queryClient.invalidateQueries({
        queryKey: ["flight-operations", flight.id, "checklist"],
      });
      onSaved();
      if (status === "concluido") {
        if (typeof window !== "undefined")
          window.localStorage.removeItem(cacheKey);
        toast.success("Checklist pré-voo concluído.");
        onClose();
      } else toast.success("Rascunho do checklist salvo.");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Não foi possível salvar o checklist."),
  });

  const setAnswer = (id: string, status: AnswerStatus) => {
    setValidationMessage("");
    if (
      status === "alerta" &&
      responses[id]?.status !== "alerta" &&
      alertCount >= 10
    ) {
      setValidationMessage(
        "O registro atual aceita até 10 itens em alerta. Resolva ou reclassifique um alerta antes de adicionar outro.",
      );
      return;
    }
    setResponses((current) => ({
      ...current,
      [id]: { ...current[id], status },
    }));
    const section = FLIGHT_CHECKLIST_SECTIONS.find((group) =>
      group.itens.some((item) => item.id === id),
    );
    if (status && section) {
      const sectionItems = section.itens.filter((item) =>
        items.some((active) => active.id === item.id),
      );
      if (
        sectionItems.every(
          (item) =>
            item.id === id ||
            ["feito", "alerta"].includes(
              String(responses[item.id]?.status || ""),
            ),
        )
      ) {
        const index = FLIGHT_CHECKLIST_SECTIONS.findIndex(
          (group) => group.id === section.id,
        );
        setOpenSection(FLIGHT_CHECKLIST_SECTIONS[index + 1]?.id || section.id);
      }
    }
  };

  const submit = (status: "rascunho" | "concluido") => {
    if (readOnly) return;
    if (status === "concluido" && !isComplete) {
      setValidationMessage(
        pendingSummary || "Confira os dados antes de concluir.",
      );
      return;
    }
    setValidationMessage("");
    saveMutation.mutate(status);
  };

  const renderSection = (section: ChecklistSection, index: number) => {
    const visible = section.itens.filter((item) =>
      items.some((active) => active.id === item.id),
    );
    if (!visible.length) return null;
    const sectionAnswered = visible.filter((item) =>
      Boolean(responses[item.id]?.status),
    ).length;
    const expanded = openSection === section.id;
    return (
      <section
        key={section.id}
        className={sectionCard}
        aria-labelledby={`checklist-section-${section.id}`}
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setOpenSection(expanded ? "" : section.id)}
          className="flex min-h-[62px] w-full items-center gap-3 px-3.5 py-3 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-xs font-bold text-emerald-200">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <strong
              id={`checklist-section-${section.id}`}
              className="block text-sm text-white"
            >
              {section.titulo}
            </strong>
            <span className="mt-0.5 block text-[11px] text-slate-400">
              {section.subtitulo}
            </span>
          </span>
          <span className="mr-1 text-[11px] font-semibold text-slate-400">
            {sectionAnswered}/{visible.length}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded && (
          <div className="space-y-2 border-t border-white/[0.06] p-3">
            {visible.map((item) => {
              const answer = responses[item.id];
              const activeStatus = answer?.status;
              const control = (
                status: AnswerStatus,
                label: string,
                Icon: typeof Check,
                selectedClass: string,
              ) => (
                <button
                  type="button"
                  key={status}
                  disabled={readOnly || saveMutation.isPending}
                  onClick={() => setAnswer(item.id, status)}
                  aria-pressed={activeStatus === status}
                  className={`flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-semibold transition disabled:cursor-not-allowed ${activeStatus === status ? selectedClass : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]"}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </button>
              );
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <div className="text-xs font-medium leading-5 text-slate-200">
                    {item.label}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {control(
                      "feito",
                      "Feito",
                      Check,
                      "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
                    )}
                    {control(
                      "alerta",
                      "Alerta",
                      AlertTriangle,
                      "border-amber-300/30 bg-amber-300/10 text-amber-100",
                    )}
                    {control(
                      "nao_feito",
                      "Não feito",
                      X,
                      "border-rose-300/30 bg-rose-300/10 text-rose-200",
                    )}
                  </div>
                  {item.tipo === "oleo" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label>
                        <span className={labelClass}>Óleo motor LH</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={oilLeft}
                          disabled={readOnly}
                          onChange={(event) => setOilLeft(event.target.value)}
                          className={fieldClass}
                          placeholder="Nível"
                        />
                      </label>
                      <label>
                        <span className={labelClass}>Óleo motor RH</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          inputMode="decimal"
                          value={oilRight}
                          disabled={readOnly}
                          onChange={(event) => setOilRight(event.target.value)}
                          className={fieldClass}
                          placeholder="Nível"
                        />
                      </label>
                    </div>
                  )}
                  {activeStatus === "alerta" && (
                    <label className="mt-3 block">
                      <span className={labelClass}>
                        Justificativa do alerta{" "}
                        <span className="text-amber-200">· obrigatória</span>
                      </span>
                      <Textarea
                        value={alertNotes[item.id] || answer?.observacao || ""}
                        disabled={readOnly}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAlertNotes((current) => ({
                            ...current,
                            [item.id]: value,
                          }));
                          setResponses((current) => ({
                            ...current,
                            [item.id]: {
                              ...current[item.id],
                              status: "alerta",
                              observacao: value,
                            },
                          }));
                        }}
                        className="min-h-20 rounded-xl border-white/10 bg-[#071326] text-white"
                        placeholder="Registre o motivo e a condição observada"
                      />
                    </label>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-white">
          <ClipboardCheck className="h-5 w-5 text-emerald-200" />
          Checklist pré-voo
        </DialogTitle>
        <DialogDescription className="text-slate-400">
          {flight.numero_voo || "Voo"} ·{" "}
          {flight.matricula_registro || flight.modelo || "Aeronave"} ·{" "}
          {flight.origem || "—"} → {flight.destino || "—"}
        </DialogDescription>
      </DialogHeader>
      {complete ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              Checklist oficial concluído
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {checklist.executado_por_nome
                ? `Registrado por ${checklist.executado_por_nome}`
                : "Registro confirmado"}
              {checklist.concluido_em
                ? ` · ${new Date(checklist.concluido_em).toLocaleString("pt-BR")}`
                : ""}
            </p>
          </div>
        </div>
      ) : !editable ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Este voo já saiu da fase de preparação. O checklist fica disponível
          somente para consulta.
        </div>
      ) : null}
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0b192b] p-3">
          <div className="flex items-center justify-between text-xs">
            <strong className="text-white">
              {answeredCount} de {items.length} itens respondidos
            </strong>
            <span className="font-mono text-emerald-200">{progress}%</span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Progresso do checklist"
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={answeredCount}
          >
            <div
              className="h-full rounded-full bg-emerald-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">
            {pendingSummary || "Marque cada item após verificá-lo fisicamente."}
          </p>
        </div>
        <div className="space-y-2.5">
          {FLIGHT_CHECKLIST_SECTIONS.map((section, index) =>
            renderSection(section, index),
          )}
        </div>
        {items.some((item) => item.tipo === "abastecimento") && (
          <section className={sectionCard}>
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Registro de abastecimento
                  </h3>
                  <p className="mt-1 text-[11px] leading-4 text-slate-400">
                    Se precisar abastecer, os dados serão enviados ao fluxo
                    financeiro já existente.
                  </p>
                </div>
                <span className="rounded-full bg-sky-300/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-sky-200">
                  {linkedFuel ? "Vinculado ao financeiro" : "Opcional"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={readOnly || linkedFuel}
                  aria-pressed={needsRefuel === "nao"}
                  onClick={() => setNeedsRefuel("nao")}
                  className={`min-h-11 rounded-xl border text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${needsRefuel === "nao" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-white/10 text-slate-400"}`}
                >
                  Não precisa
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  aria-pressed={needsRefuel === "sim"}
                  onClick={() => setNeedsRefuel("sim")}
                  className={`min-h-11 rounded-xl border text-xs font-semibold ${needsRefuel === "sim" ? "border-sky-300/30 bg-sky-300/10 text-sky-200" : "border-white/10 text-slate-400"}`}
                >
                  Precisa abastecer
                </button>
              </div>
              {linkedFuel && (
                <p className="mt-2 text-[10px] leading-4 text-amber-100">
                  O registro já foi enviado ao fluxo financeiro e não pode ser
                  removido por esta tela.
                </p>
              )}
              {needsRefuel === "sim" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <span className={labelClass}>
                      Data <span className="text-amber-200">*</span>
                    </span>
                    <Input
                      type="date"
                      value={fuel.data}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          data: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>
                      Tipo de combustível{" "}
                      <span className="text-amber-200">*</span>
                    </span>
                    <Input
                      value={fuel.tipo}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          tipo: event.target.value,
                        }))
                      }
                      className={fieldClass}
                      placeholder="Conforme nota"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>
                      Local (ICAO) <span className="text-amber-200">*</span>
                    </span>
                    <Input
                      value={fuel.local}
                      disabled={readOnly}
                      maxLength={4}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          local: event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, ""),
                        }))
                      }
                      className={fieldClass}
                      placeholder="SBSP"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>
                      Quantidade (L) <span className="text-amber-200">*</span>
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={fuel.litros}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          litros: event.target.value,
                        }))
                      }
                      className={fieldClass}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>
                      Valor unitário <span className="text-amber-200">*</span>
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={fuel.valorUnitario}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          valorUnitario: event.target.value,
                        }))
                      }
                      className={fieldClass}
                      placeholder="R$ / L"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Desconto (opcional)</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={fuel.desconto}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          desconto: event.target.value,
                        }))
                      }
                      className={fieldClass}
                      placeholder="R$"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Comanda (opcional)</span>
                    <Input
                      value={fuel.comanda}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          comanda: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Nota fiscal (opcional)</span>
                    <Input
                      value={fuel.notaFiscal}
                      disabled={readOnly}
                      onChange={(event) =>
                        setFuel((current) => ({
                          ...current,
                          notaFiscal: event.target.value,
                        }))
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>
        )}
        <label>
          <span className={labelClass}>Observações gerais</span>
          <Textarea
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-xl border-white/10 bg-[#071326] text-white"
            placeholder="Observações da preparação"
          />
        </label>
        {complete && (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0b192b] p-3 text-xs text-slate-300">
            <span className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              Resultado registrado
            </span>
            {checklist.nivel_oleo && (
              <p className="mt-2">Óleo: {checklist.nivel_oleo}</p>
            )}
            {checklist.observacoes && (
              <p className="mt-2 whitespace-pre-wrap">
                {checklist.observacoes}
              </p>
            )}
          </div>
        )}
        {validationMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {validationMessage}
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        {!readOnly && (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => submit("rascunho")}
              className="h-11 rounded-xl border-white/10 text-white"
            >
              {saveMutation.isPending &&
              saveMutation.variables === "rascunho" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar rascunho
            </Button>
            <Button
              type="button"
              disabled={saveMutation.isPending || !isComplete}
              onClick={() => submit("concluido")}
              className="h-11 rounded-xl bg-emerald-300 font-semibold text-[#062219] hover:bg-emerald-200"
            >
              {saveMutation.isPending &&
              saveMutation.variables === "concluido" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Concluir checklist
            </Button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-11 rounded-xl text-slate-300"
        >
          {readOnly ? "Fechar" : "Cancelar"}
        </Button>
      </DialogFooter>
    </>
  );
}

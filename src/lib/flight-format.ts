const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

function parseFlightInstant(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const timeOnly = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (timeOnly) {
    const [, hours, minutes, seconds = "0"] = timeOnly;
    return new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes), Number(seconds)));
  }

  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const instant = new Date(hasTimeZone ? normalized : `${normalized}Z`);
  return Number.isFinite(instant.getTime()) ? instant : null;
}

function formatTime(value: unknown, timeZone: string): string | null {
  const instant = parseFlightInstant(value);
  if (!instant) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

export function formatScheduledFlightTime(value: unknown): string {
  const zulu = formatTime(value, "UTC");
  const brasilia = formatTime(value, BRASILIA_TIME_ZONE);
  if (!zulu || !brasilia) return "Não informado";
  return `${zulu}Z · ${brasilia} Brasília`;
}

export function formatBrasiliaTime(value: unknown): string {
  const time = formatTime(value, BRASILIA_TIME_ZONE);
  return time ? `${time} Brasília` : "—";
}

export function formatZuluTime(value: unknown): string {
  const time = formatTime(value, "UTC");
  return time ? `${time}Z` : "—";
}

function formatFlightStatus(value: unknown, fallback = "Não informado"): string {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return fallback;
  const labels: Record<string, string> = {
    acionado: "Acionado",
    decolado: "Em voo",
    em_rota: "Em voo",
    em_voo: "Em voo",
    em_solo: "Em solo",
    pousado: "Em solo",
    programada: "Programada",
    encerrada: "Encerrada",
    concluida: "Concluída",
    cortado: "Cortado",
  };
  return labels[normalized] || normalized.replace(/_/g, " ").replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-BR"));
}

type FlightLegStatusFields = {
  status?: unknown;
  horario_ac?: unknown;
  horario_dep?: unknown;
  horario_pouso?: unknown;
  horario_corte?: unknown;
};

export function formatFlightLegStatus(leg: FlightLegStatusFields, fallback = "Não informado"): string {
  const status = String(leg.status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (leg.horario_corte || status === "cortado") return "Cortado";
  if (leg.horario_pouso || ["pousado", "em_solo"].includes(status)) return "Em solo";
  if (leg.horario_dep || ["em_voo", "em_rota", "decolado"].includes(status)) return "Em voo";
  if (leg.horario_ac || status === "acionado") return "Acionado";
  return formatFlightStatus(leg.status, fallback);
}

type FlightJourneyStatusFields = {
  status?: unknown;
  horario_acionamento?: unknown;
  horario_decolagem?: unknown;
  horario_pouso?: unknown;
  pernas?: FlightLegStatusFields[] | null;
};

export function formatFlightJourneyStatus(journey: FlightJourneyStatusFields, fallback = "Registrada"): string {
  const latestLeg = journey.pernas?.at(-1);
  if (latestLeg) return formatFlightLegStatus(latestLeg, fallback);
  const status = String(journey.status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (journey.horario_pouso || status === "pousado" || (status === "em_solo" && journey.horario_decolagem)) return "Em solo";
  if (journey.horario_decolagem || ["em_voo", "em_rota", "decolado"].includes(status)) return "Em voo";
  if (journey.horario_acionamento || status === "acionado") return "Acionado";
  return formatFlightStatus(journey.status, fallback);
}

export function formatFlightDate(value: unknown): string {
  const date = String(value ?? "").trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date || "Data não informada";
  const [, year, month, day] = match;
  return `${day}/${month}/${year.slice(-2)}`;
}

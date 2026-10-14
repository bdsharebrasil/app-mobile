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

export function formatZuluTime(value: unknown): string {
  const time = formatTime(value, "UTC");
  return time ? `${time}Z` : "—";
}

export function formatFlightDate(value: unknown): string {
  const date = String(value ?? "").trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date || "Data não informada";
  const [, year, month, day] = match;
  return `${day}/${month}/${year.slice(-2)}`;
}

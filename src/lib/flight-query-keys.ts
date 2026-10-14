export const flightListQueryKey = ["colaborador-meus-voos"] as const;

const FLIGHTS_REQUIRING_TIME_COMPLETION = new Set(["em_voo", "em_rota", "em_solo", "pousado"]);

export function flightNeedsTimeCompletion(status: unknown): boolean {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  return FLIGHTS_REQUIRING_TIME_COMPLETION.has(normalized);
}

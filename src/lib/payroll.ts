export type WorkerPayrollRow = {
  id: string;
  competencia_ano: number;
  competencia_mes: number;
  rotulo: string;
  valor_centavos: number;
  data_prevista: string | null;
  data_pagamento: string | null;
  holerite_url: string | null;
  comprovante_url: string | null;
  observacoes: string | null;
  criado_em: string | null;
};

export type SalaryPayment = {
  id: string;
  created_at: string | null;
  data_pagamento: string | null;
  base_salary_holerite: number | null;
  horas_voo: string | null;
  ferias: number | null;
  decimo_terceiro_parcela1: number | null;
  decimo_terceiro_parcela2: number | null;
  benefit: string | null;
  banco: string | null;
  holerite_url: string | null;
  comprovante_url: string | null;
  obs: string | null;
  obs2: string | null;
};

export function normalizePayrollRows(rows: WorkerPayrollRow[]): SalaryPayment[] {
  const byPeriod = new Map<string, SalaryPayment>();
  for (const row of rows) {
    const period = `${row.competencia_ano}-${String(row.competencia_mes).padStart(2, "0")}`;
    let payment = byPeriod.get(period);
    if (!payment) {
      payment = {
        id: period,
        created_at: row.criado_em,
        data_pagamento: row.data_pagamento || row.data_prevista,
        base_salary_holerite: null,
        horas_voo: null,
        ferias: null,
        decimo_terceiro_parcela1: null,
        decimo_terceiro_parcela2: null,
        benefit: null,
        banco: null,
        holerite_url: null,
        comprovante_url: null,
        obs: null,
        obs2: null,
      };
      byPeriod.set(period, payment);
    }
    const value = Number(row.valor_centavos || 0) / 100;
    switch (row.rotulo) {
      case "SALARIO": payment.base_salary_holerite = (payment.base_salary_holerite || 0) + value; break;
      case "FERIAS": payment.ferias = (payment.ferias || 0) + value; break;
      case "13_P1": payment.decimo_terceiro_parcela1 = (payment.decimo_terceiro_parcela1 || 0) + value; break;
      case "13_P2": payment.decimo_terceiro_parcela2 = (payment.decimo_terceiro_parcela2 || 0) + value; break;
      case "BENEFICIO": payment.benefit = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); break;
    }
    payment.holerite_url ||= row.holerite_url;
    payment.comprovante_url ||= row.comprovante_url;
    payment.obs = [payment.obs, row.observacoes].filter(Boolean).join(" · ") || null;
  }
  return [...byPeriod.values()].sort((a, b) => String(b.data_pagamento || b.created_at).localeCompare(String(a.data_pagamento || a.created_at)));
}

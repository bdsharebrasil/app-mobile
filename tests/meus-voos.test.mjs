import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const src = new URL("../src/", import.meta.url);
const detailSource = await readFile(new URL("pages/MeusVoos.tsx", src), "utf8");
const operationsSource = await readFile(new URL("components/mobile/FlightOperations.tsx", src), "utf8");
const formatterSource = await readFile(new URL("lib/flight-format.ts", src), "utf8");
const dashboardSource = await readFile(new URL("components/mobile/MobileDashboard.tsx", src), "utf8");
const flightQueryKeysSource = await readFile(new URL("lib/flight-query-keys.ts", src), "utf8");

test("horário previsto mostra apenas horas UTC e de Brasília e não duplica cotista", () => {
  assert.match(detailSource, /formatScheduledFlightTime\(flight\.horario_previsto_agendamento\)/);
  assert.match(detailSource, /cliente_tipo/);
  assert.doesNotMatch(detailSource, /label="Cotista"/);
  assert.match(formatterSource, /America\/Sao_Paulo/);
  assert.match(formatterSource, /return `\$\{zulu\}Z · \$\{brasilia\} Brasília`/);
});

test("jornadas usam data curta e horários Zulu sem repetir data nos horários", () => {
  assert.match(detailSource, /formatFlightDate\(jornada\.data\)/);
  assert.match(detailSource, /formatZuluTime\(jornada\.horario_apresentacao\)/);
  assert.match(detailSource, /formatZuluTime\(perna\.horario_ac\)/);
  assert.match(operationsSource, /formatFlightDate\(record\.data\)/);
  assert.match(operationsSource, /formatZuluTime\(leg\.horario_ac\)/);
});

test("ficha pendente continua editável para voo encerrado, mantendo ficha finalizada somente para consulta", () => {
  assert.match(operationsSource, /const weightReadOnly = weightComplete \|\| !config/);
  assert.match(operationsSource, /!weightComplete && config &&/);
  assert.doesNotMatch(operationsSource, /!weightComplete && checklistEditable && config/);
});

test("observações do agendamento são a única mensagem de voo exibida", () => {
  assert.match(detailSource, /mensagem: string \| null/);
  assert.match(detailSource, /flight\.mensagem \?/);
  assert.doesNotMatch(detailSource, /detail\.mensagens/);
  assert.doesNotMatch(detailSource, /flight\.observacoes/);
});

test("menu destaca Meus Voos com quantidade e instrução quando há voos em operação", () => {
  assert.match(dashboardSource, /apiClient\.get<\{ voos:/);
  assert.match(dashboardSource, /flightNeedsTimeCompletion\(flight\.status\)/);
  assert.match(dashboardSource, /Complete horários/);
  assert.match(dashboardSource, /ring-2 ring-amber-300/);
  assert.match(dashboardSource, /refetchInterval: 60_000/);
  assert.match(flightQueryKeysSource, /\["em_voo", "em_rota", "em_solo", "pousado"\]/);
  assert.match(detailSource, /flightNeedsTimeCompletion\(flight\.status\)/);
  assert.match(detailSource, /Completar horários/);
});

test("voo em operação permite preencher AC/DEP/POU/COR da perna e bloqueia pernas lançadas", () => {
  assert.match(operationsSource, /apiClient\.patch\(`\/api\/interno\/jornadas/);
  assert.match(operationsSource, /horario_ac: legTimes\.horario_ac \|\| null/);
  assert.match(operationsSource, /horario_dep: legTimes\.horario_dep \|\| null/);
  assert.match(operationsSource, /horario_pouso: legTimes\.horario_pouso \|\| null/);
  assert.match(operationsSource, /horario_corte: legTimes\.horario_corte \|\| null/);
  assert.match(operationsSource, /!leg\.lancamento_diario_id/);
  assert.match(operationsSource, /Completar horários da perna/);
  assert.match(operationsSource, /resumo da jornada atualizado/i);
});

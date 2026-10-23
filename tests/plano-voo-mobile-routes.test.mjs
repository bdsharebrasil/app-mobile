import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../src/", import.meta.url);
const page = await readFile(new URL("pages/PlanoVoo.tsx", root), "utf8");
const icao = await readFile(new URL("components/plano-voo/PlanoIcaoMobile.tsx", root), "utf8");
const hook = await readFile(new URL("hooks/useFlightPlans.ts", root), "utf8");
const pdf = await readFile(new URL("lib/flightPlanPdf.ts", root), "utf8");

test("planejador consulta rota preferencial, permite aplicá-la e transfere os dados ao FPL ICAO", () => {
  assert.match(page, /apiClient\.get<RouteSuggestionResponse>\('\/api\/flightplan'/);
  assert.match(page, /Usar esta rota/);
  assert.match(page, /Preencher ICAO FPL/);
  assert.match(icao, /initialValues/);
  assert.match(icao, /Usar plano selecionado como base/);
  assert.match(icao, /rota: form\.rota\.trim\(\) \|\| null/);
});

test("planos calculados podem ser atualizados e exclusão exige confirmação", () => {
  assert.match(page, /updateFlightPlan\(editingPlanId, planInput\)/);
  assert.match(page, /window\.confirm\('Excluir este plano de voo salvo\?/);
  assert.match(page, /formSnapshot/);
  assert.match(hook, /updates\.alternate_airport !== undefined/);
});

test("o PDF é gerado e compartilhado no telefone ou baixado como alternativa", () => {
  assert.match(page, /exportFlightPlanPdf\(/);
  assert.doesNotMatch(page, /Exportar PDF[\s\S]{0,180}disabled/);
  assert.match(pdf, /navigator\.share/);
  assert.match(pdf, /link\.download = fileName/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const page = await readFile(new URL("../src/pages/PlanoVoo.tsx", import.meta.url), "utf8");
const navigation = await readFile(new URL("../src/components/plano-voo/FlightPlanNavigation.tsx", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
test("plano de voo expõe as ferramentas móveis e seus caminhos diretos", () => {
  for (const menu of ["Criar Plano de Voo", "Informações", "Aeródromo", "Meteorologia", "Planos de Voo", "Salvos"]) assert.ok(page.includes(menu), `Menu ausente: ${menu}`);
  for (const label of ["Formulário ICAO", "Criar rotas", "Resultados", "NOTAMs", "Cartas", "Rotas salvas"]) assert.ok(navigation.includes(label), `Seção ausente: ${label}`);
  for (const path of ["/plano-voo/formulario-icao", "/plano-voo/rotas", "/plano-voo/resultados", "/plano-voo/notams", "/plano-voo/cartas", "/plano-voo/rotas-salvas"]) assert.ok(navigation.includes(path), `Caminho ausente: ${path}`);
  assert.match(page, /Novo plano/);
  assert.match(page, /aria-label="Menu do plano de voo"/);
  assert.match(app, /path="\/plano-voo\/\*"/);
});

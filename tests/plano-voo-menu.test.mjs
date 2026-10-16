import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const page = await readFile(new URL("../src/pages/PlanoVoo.tsx", import.meta.url), "utf8");
test("plano de voo usa quatro menus principais e duas opções no plano completo", () => {
  for (const menu of ["Criar Plano de Voo", "Informações", "Aeródromo", "Meteorologia", "Planos de Voo", "Salvos"]) assert.ok(page.includes(menu), `Menu ausente: ${menu}`);
  assert.match(page, /Formulário ICAO/);
  assert.match(page, /Criar rotas/);
  assert.match(page, /Novo plano/);
  assert.match(page, /aria-label="Menu do plano de voo"/);
});

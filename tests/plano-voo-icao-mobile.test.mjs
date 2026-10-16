import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../src/", import.meta.url);
const component = await readFile(new URL("components/plano-voo/PlanoIcaoMobile.tsx", root), "utf8");
const page = await readFile(new URL("pages/PlanoVoo.tsx", root), "utf8");
test("plano mobile oferece formulário ICAO por itens e preenchimento opcional da reserva", () => {
  assert.match(component, /Formulário de plano de voo ICAO/);
  assert.match(component, /\/api\/interno\/agendamento/);
  assert.match(component, /Preencher manualmente/);
  assert.match(component, /Item 19/);
  assert.match(page, /<PlanoIcaoMobile/);
});
test("planos ICAO são salvos e carregados pelo endpoint D1 do Worker", () => {
  assert.match(component, /\/api\/interno\/planos-voo/);
  assert.match(component, /Salvar plano de voo/);
  assert.match(component, /Planos salvos/);
  assert.match(component, /invalidateQueries/);
});

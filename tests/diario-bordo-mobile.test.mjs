import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../src/", import.meta.url);
const dashboard = await readFile(new URL("components/mobile/MobileDashboard.tsx", root), "utf8");
const aircraftSelector = await readFile(new URL("components/diario/MobileDiarioAircraftSelector.tsx", root), "utf8");
const entryForm = await readFile(new URL("components/diario/MobileDiarioEntryForm.tsx", root), "utf8");
const diaryPage = await readFile(new URL("pages/DiarioBordo.tsx", root), "utf8");

test("card do Dashboard identifica o Diário de Bordo e mantém a rota do diário", () => {
  assert.match(dashboard, /title: "Diário de Bordo"/);
  assert.match(dashboard, /route: "\/diario-bordo"/);
});

test("seletor exibe imagem recebida do endpoint D1 da aeronave", () => {
  assert.match(aircraftSelector, /aircraft\.image_url/);
  assert.match(aircraftSelector, /onSelect\(item\.id, item\.matricula_registro, item\.image_url\)/);
  assert.match(aircraftSelector, /Horas e célula sincronizadas/);
});

test("formulário envia número do voo e combustível com as colunas D1 correspondentes", () => {
  assert.match(entryForm, /numero_voo: flightNumber\.trim\(\) \|\| null/);
  assert.match(entryForm, /litros_combustivel_inicio_voo:/);
  assert.match(entryForm, /litros_combustivel_abastecido:/);
  assert.match(entryForm, /valor_total: \(parseFloat\(fuelLiters\)/);
  assert.match(entryForm, /!Number\(logbookMonth\?\.fechado\)/);
  assert.doesNotMatch(entryForm, /pic_canac:.*user\?\.id/);
});

test("ao abrir uma aeronave, o diário lista lançamentos e oferece novo registro", () => {
  assert.match(diaryPage, /aircraft-logbook/);
  assert.match(diaryPage, /Lançamentos do mês/);
  assert.match(diaryPage, /Novo lançamento/);
  assert.match(diaryPage, /getDiarioDetalhes/);
});

test("aviso de reserva em andamento é opcional e não restringe lançamentos a um usuário", () => {
  assert.match(diaryPage, /solicitação de reserva ativa/);
  assert.match(diaryPage, /Isso é opcional e qualquer usuário pode registrar lançamentos/);
  assert.doesNotMatch(diaryPage, /disabled=\{[^}]*activeFlight/);
});

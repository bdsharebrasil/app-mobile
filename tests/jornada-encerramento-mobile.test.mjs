import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/components/mobile/FlightOperations.tsx", import.meta.url), "utf8");

test("a jornada ativa exibe adicionar perna e encerrar jornada lado a lado", () => {
  assert.match(source, /hasOpenJourney && \(\s*<div className="space-y-2">/);
  assert.match(source, /grid grid-cols-2 gap-2/);
  assert.match(source, /Adicionar perna/);
  assert.match(source, /Encerrar jornada/);
  assert.match(source, /disabled=\{!canEndJourney \|\| endJourneyMutation\.isPending\}/);
});

test("encerrar jornada usa o endpoint PATCH existente e atualiza os dados", () => {
  assert.match(source, /apiClient\.patch\(`\/api\/interno\/jornadas\/\$\{encodeURIComponent\(journey\.id\)\}`, \{ status: "encerrada" \}\)/);
  assert.match(source, /client\.invalidateQueries\(\{ queryKey: \[\.\.\.baseKey, "journey"\] \}\)/);
  assert.match(source, /Confirmar encerramento/);
});

test("jornada encerrada habilita criação de nova jornada com nova data e rota", () => {
  assert.match(source, /const hasPreviousJourney = Boolean\(journey && !hasOpenJourney\)/);
  assert.match(source, /hasPreviousJourney \? "CRIAR NOVA JORNADA" : "INICIAR VOO"/);
  assert.match(source, /data: journeyDate/);
  assert.match(source, /origem: journeyOrigin\.trim\(\)\.toUpperCase\(\)/);
  assert.match(source, /destino: journeyDestination\.trim\(\)\.toUpperCase\(\)/);
  assert.match(source, /Nova jornada no mesmo voo, com histórico preservado/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const root = new URL("../src/components/plano-voo/", import.meta.url);
const meteo = await readFile(new URL("MeteorologiaMobile.tsx", root), "utf8");
const airport = await readFile(new URL("InformacoesAerodromoMobile.tsx", root), "utf8");
const page = await readFile(new URL("../src/pages/PlanoVoo.tsx", import.meta.url), "utf8");
test("meteorologia móvel consulta METAR/TAF, métricas e seis camadas Windy", () => {
  for (const layer of ['temp', 'clouds', 'wind', 'rain', 'pressure', 'visibility']) assert.ok(meteo.includes(`'${layer}'`));
  for (const field of ['temperature_c', 'dew_point_c', 'speed_kt', 'qnh_hpa', 'metar', 'taf']) assert.ok(meteo.includes(field));
  assert.match(meteo, /embed\.windy\.com/);
  assert.match(page, /<MeteorologiaMobile \/>/);
});
test("informações do aeródromo incluem ROTAER, solar, NOTAM, cartas, filtros e preview", () => {
  for (const endpoint of ['/api/weather/', '/api/notam/', '/api/charts/', '/api/solar/', '/api/rotaer/']) assert.ok(airport.includes(endpoint));
  for (const label of ['Pistas e frequências', 'Dados adicionais publicados pelo AISWEB/ROTAER', 'Nascer do sol', 'Pôr do sol', 'NOTAM', 'Pesquisar carta']) assert.ok(airport.includes(label));
  assert.match(airport, /categories\.map/);
  assert.match(airport, /charts\/preview/);
  assert.match(page, /<InformacoesAerodromoMobile \/>/);
});

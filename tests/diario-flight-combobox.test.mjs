import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const src = new URL('../src/', import.meta.url);
const [form, combobox, layout, aircraftSelector] = await Promise.all([
  readFile(new URL('components/diario/MobileDiarioEntryForm.tsx', src), 'utf8'),
  readFile(new URL('components/diario/FlightNumberCombobox.tsx', src), 'utf8'),
  readFile(new URL('components/mobile/MobileLayout.tsx', src), 'utf8'),
  readFile(new URL('components/diario/MobileDiarioAircraftSelector.tsx', src), 'utf8'),
]);

test('combobox lista voos do mesmo diário e mostra número, rota e data', () => {
  assert.match(form, /diarioDetails\?\.lancamentos/);
  assert.match(form, /existingFlightOptions/);
  assert.match(form, /<FlightNumberCombobox[\s\S]*options=\{existingFlightOptions\}/);
  assert.match(combobox, /role="combobox"/);
  assert.match(combobox, /<CommandItem/);
  assert.match(combobox, /option\.number/);
  assert.match(combobox, /option\.route/);
  assert.match(combobox, /option\.date/);
});

test('combobox aceita número novo e mantém o número escolhido no formulário', () => {
  assert.match(combobox, /Usar “\{normalizedQuery\}” neste lançamento/);
  assert.match(combobox, /onChange\(nextValue\)/);
  assert.match(form, /numero_voo: flightNumber\.trim\(\) \|\| null/);
});

test('data e número cabem em colunas móveis e o cabeçalho respeita o safe area do iPhone', () => {
  assert.match(form, /grid-cols-1 gap-3 min-\[360px\]:grid-cols-2/);
  assert.match(form, /w-full min-w-0 max-w-full rounded-xl bg-background/);
  assert.match(form, /top-\[max\(24px,env\(safe-area-inset-top\)\)\]/);
  assert.match(layout, /pt-\[max\(24px,env\(safe-area-inset-top\)\)\]/);
  assert.match(aircraftSelector, /top-\[max\(24px,env\(safe-area-inset-top\)\)\]/);
  assert.doesNotMatch(aircraftSelector, /-my-\[34px\]|my-\[28px\]|py-\[31px\]/);
});

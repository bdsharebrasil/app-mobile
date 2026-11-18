import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Folha consulta o Worker e não acessa a tabela do Supabase diretamente", async () => {
  const page = await source("../src/pages/financeiro/FolhaPagamento.tsx");
  assert.match(page, /\/api\/colaborador\/folha-pagamento/);
  assert.doesNotMatch(page, /supabase\.(from|storage)/);
});

test("Perfil usa o Worker para perfil, férias, folha e foto; senha permanece no provedor de autenticação", async () => {
  const page = await source("../src/pages/Perfil.tsx");
  assert.match(page, /\/api\/colaborador\/ferias/);
  assert.match(page, /\/api\/colaborador\/folha-pagamento/);
  assert.match(page, /\/api\/colaborador\/foto/);
  assert.doesNotMatch(page, /supabase\.(from|storage)/);
  assert.match(page, /supabase\.auth\.updateUser/);
});

test("Ponto não é exibido nem mantém componente importado no app", async () => {
  const page = await source("../src/pages/Perfil.tsx");
  assert.doesNotMatch(page, /TimeClockTab|showTimeClock|tab === ["']ponto["']/);
  await assert.rejects(access(new URL("../src/components/profile/TimeClockTab.tsx", import.meta.url)));
});

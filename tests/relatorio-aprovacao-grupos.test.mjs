import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/pages/financeiro/RelatorioViagem.tsx", import.meta.url),
  "utf8",
);

test("aprovar relatório no app mobile não depende da revisão de todos os grupos", () => {
  assert.match(source, /disabled=\{busy\}/);
  assert.doesNotMatch(source, /reviewedGroups|allGroupsReviewed|pendingGroups/);
  assert.doesNotMatch(source, /Revise cada grupo.*liberar a aprovação/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const [layout, navigation, select, dialog, styles, html] = await Promise.all([
  readFile(new URL("src/components/mobile/MobileLayout.tsx", root), "utf8"),
  readFile(new URL("src/components/mobile/MobileTabBar.tsx", root), "utf8"),
  readFile(new URL("src/components/ui/select.tsx", root), "utf8"),
  readFile(new URL("src/components/ui/dialog.tsx", root), "utf8"),
  readFile(new URL("src/index.css", root), "utf8"),
  readFile(new URL("index.html", root), "utf8"),
]);

test("navegação mobile usa destinos identificáveis e navegação acessível", () => {
  assert.match(navigation, /<nav aria-label="Navegação principal"/);
  assert.match(navigation, /mobile-tab-bar__inner/);
  assert.match(navigation, /aria-current=\{isActive \? "page"/);
  assert.match(navigation, /title: "Manut\."/);
  assert.match(navigation, /paths: \["\/financeiro"\]/);
});

test("moldura deixa espaço para navegação inferior e respeita insets do dispositivo", () => {
  assert.match(layout, /100dvh/);
  assert.match(layout, /env\(safe-area-inset-bottom\)/);
  assert.match(layout, /overflow-x-clip/);
});

test("seletores oferecem área de toque ampla, largura controlada e lista rolável", () => {
  assert.match(select, /h-12 w-full min-w-0/);
  assert.match(select, /max-h-\[min\(60dvh,28rem\)\]/);
  assert.match(select, /min-h-11/);
  assert.match(select, /max-w-\[calc\(100vw-2rem\)\]/);
});

test("diálogos viram folhas roláveis em celular e mantêm centralização em desktop", () => {
  assert.match(dialog, /bottom-0 top-auto/);
  assert.match(dialog, /rounded-t-\[24px\]/);
  assert.match(dialog, /overscroll-contain/);
  assert.match(dialog, /sm:top-1\/2/);
  assert.match(dialog, /safe-area-inset-bottom/);
});

test("fundamentos mobile respeitam zoom acessível, áreas de toque e movimento reduzido", () => {
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale/);
  assert.match(styles, /\.mobile-tab-bar\s*\{/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /@media \(pointer: coarse\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

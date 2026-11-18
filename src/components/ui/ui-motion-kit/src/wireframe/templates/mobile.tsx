import type { Rect } from "@/engine/geometry";
import { Avatar, Bar, Block, Button, pct } from "../parts";
import { defineTemplate, type TemplateState } from "./types";

/** The phone, in page-area px. Everything inside is laid out relative to it. */
export const PHONE = { x: 194, y: 14, w: 172, h: 316 } as const;
const inPhone = (r: Rect): Rect => ({ x: PHONE.x + r.x, y: PHONE.y + r.y, w: r.w, h: r.h });
const card = (i: number): Rect => ({ x: 12, y: 94 + i * 58, w: 148, h: 50 });
const TAB_X = [20, 58, 96, 134] as const;
const tab = (i: number): Rect => ({ x: TAB_X[i]! - 6, y: 274, w: 28, h: 28 });

const LOCAL = {
  segment0: { x: 18, y: 62, w: 68, h: 20 },
  segment1: { x: 86, y: 62, w: 68, h: 20 },
  card0: card(0),
  card1: card(1),
  card2: card(2),
  fab: { x: 120, y: 212, w: 40, h: 40 },
  tab0: tab(0),
  tab1: tab(1),
  tab2: tab(2),
  tab3: tab(3),
} satisfies Record<string, Rect>;
type Key = keyof typeof LOCAL;
const T = Object.fromEntries(Object.entries(LOCAL).map(([k, r]) => [k, inPhone(r)])) as Record<Key, Rect>;
const CARDS = ["card0", "card1", "card2"] as const;
const TABS = ["tab0", "tab1", "tab2", "tab3"] as const;

/**
 * Phone frame for touch pieces (bottom sheets, swipe actions, pull to refresh): status bar,
 * title, a two-way segmented control, three cards, a floating action button and a tab bar.
 * `targets` are in page-area px like every template; the drawing is relative to the phone.
 */
function MobilePage({ state = {} }: { state?: TemplateState<Key> }) {
  const seg = (state.segment1?.on ?? 0) > 0.5 ? 1 : 0;
  const activeTab = Math.max(0, TABS.findIndex((k) => (state[k]?.on ?? 0) > 0.5));
  return (
    <>
      <Block x={0} y={0} w={560} h={344} r={0} tone="panel" />
      <div
        style={{
          position: "absolute",
          left: PHONE.x,
          top: PHONE.y,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: 28,
          background: "var(--mk-surface)",
          boxShadow: "var(--mk-shadow-window), 0 0 0 1px var(--mk-window-border)",
          overflow: "hidden",
        }}
      >
        <Bar x={18} y={14} w={24} h={6} tone="strong" />
        <Bar x={130} y={14} w={24} h={6} tone="base" />
        <Bar x={16} y={36} w={84} h={12} tone="title" />
        <Avatar x={132} y={30} size={24} tone="title" />
        <Block x={16} y={60} w={140} h={24} r={12} tone="panel" />
        <Block {...(seg ? LOCAL.segment1 : LOCAL.segment0)} r={10} tone="surface" style={{ boxShadow: "0 1px 2px rgb(10 12 16 / 0.12)" }} />
        <Bar x={34} y={69} w={36} h={6} tone={seg ? "base" : "strong"} />
        <Bar x={102} y={69} w={36} h={6} tone={seg ? "strong" : "base"} />
        {CARDS.map((k, i) => {
          const s = state[k];
          return (
            <Block key={k} {...LOCAL[k]} r={12} style={{ transform: s?.press ? `scale(${1 - 0.03 * s.press})` : undefined }}>
              <div data-anchor={s?.anchor} style={{ position: "absolute", inset: 0 }} />
              <Avatar x={10} y={14} size={22} tone="title" />
              <Bar x={40} y={16} w={[72, 60, 84][i]} h={7} tone="title" />
              <Bar x={40} y={29} w={[92, 76, 64][i]} h={5} tone="base" />
            </Block>
          );
        })}
        <Button {...LOCAL.fab} r={20} hover={state.fab?.hover} press={state.fab?.press} anchor={state.fab?.anchor} style={{ boxShadow: "0 6px 14px -6px rgb(10 12 16 / 0.45)" }}>
          <Block x={14} y={19} w={12} h={2} r={1} tone="surface" />
          <Block x={19} y={14} w={2} h={12} r={1} tone="surface" />
        </Button>
        <Block x={0} y={264} w={172} h={1} r={0} tone="base" />
        {TABS.map((k, i) => (
          <Block
            key={k}
            {...LOCAL[k]}
            r={8}
            tone="panel"
            style={{ background: `color-mix(in srgb, var(--mk-panel) ${pct(state[k]?.hover ?? 0)}%, transparent)` }}
          >
            <div data-anchor={state[k]?.anchor} style={{ position: "absolute", inset: 0 }} />
            <Block x={6} y={6} w={16} h={16} r={5} tone={i === activeTab ? "strong" : "title"} />
          </Block>
        ))}
        <Bar x={62} y={306} w={48} h={4} r={2} tone="strong" />
      </div>
    </>
  );
}

export const MOBILE = defineTemplate<Key>({
  id: "mobile",
  name: "Mobile",
  use: "Touch patterns: bottom sheets, swipe actions, pull to refresh, floating action buttons, tab bars, haptic-style presses.",
  targets: T,
  Page: MobilePage,
});

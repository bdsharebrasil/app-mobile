import type { ReactNode } from "react";
import { contains, target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { DURATION, STAGE } from "@/engine/tokens";
import { Avatar, Bar, Block, DASHBOARD, Field, pct, type SceneProps } from "@/wireframe";
import { PALETTE_MS, PALETTE_TRAVEL } from "./timing";

/**
 * Command palette on the dashboard template. A search pill with a ⌘ K keycap hint sits in the
 * header; the palette opens centered on the content column with a search input, two result groups
 * (Actions, Pages) and a footer with key hints. Typing narrows six results to two, and the panel
 * height follows.
 */
const HINT: Rect = { x: 292, y: 20, w: 96, h: 30 };
const PANEL = { x: 172, y: 36, w: 340 };
const INPUT_H = 44;
const FOOT_H = 30;
const GROUP_H = 20;
const ROW_H = 28;
const LIST_PAD = 6;

/** Query typed into the input, and the results left after each character (Actions, Pages). */
const QUERY = "inv";
const STEPS = [
  { actions: [64, 72, 56], pages: [52, 76, 48] },
  { actions: [64, 72], pages: [52, 76] },
  { actions: [64], pages: [52, 76] },
  { actions: [64], pages: [52] },
] as const;
const listH = (s: number) => LIST_PAD * 2 + GROUP_H * 2 + ROW_H * (STEPS[s]!.actions.length + STEPS[s]!.pages.length);

/** Result rows (panel px) for a step, in order; group labels sit above each group. */
function layout(s: number) {
  const rows: { y: number; w: number; group: 0 | 1 }[] = [];
  const labels: number[] = [];
  let y = INPUT_H + 1 + LIST_PAD;
  [STEPS[s]!.actions, STEPS[s]!.pages].forEach((group, g) => {
    labels.push(y);
    y += GROUP_H;
    for (const w of group) {
      rows.push({ y, w, group: g as 0 | 1 });
      y += ROW_H;
    }
  });
  return { rows, labels };
}
const rowBox = (y: number): Rect => ({ x: PANEL.x + 6, y: PANEL.y + y, w: PANEL.w - 12, h: ROW_H });
/** The second result once the query is typed ("Invoices"). */
const PICK = rowBox(layout(3).rows[1]!.y);

/** Cursor rest point (stage px): low on the chart, right. */
const REST = { x: 470, y: 330 };

/*
 * Choreography: the ⌘ K keycaps pulse (the shortcut is pressed) and the palette drops in from 12 px
 * above; "inv" is typed and the results narrow with each character while the first one stays
 * highlighted. The cursor glides up from the chart and the highlight follows it to the second
 * result; the Enter key hint pulses, the palette lifts away and the sidebar shows the opened page.
 */
const b = script({
  cursor: REST,
  tracks: { open: 0, kbd: 0, enter: 0, list: listH(0), nav: 0 },
  textTracks: ["q"],
})
  .wait(560)
  .tween("kbd", 1, 90, { ease: "out" })
  .wait(140)
  .tween("kbd", 0, 130, { ease: "out" })
  .tween("open", 1, PALETTE_MS.enter, { ease: "out" })
  .wait(PALETTE_MS.enter + 160);

const typing = b.now;
const charMs = 130;
for (let i = 1; i <= QUERY.length; i++) b.tween("list", listH(i), DURATION.fast, { at: typing + i * charMs, ease: "out" });
b.type("q", QUERY, QUERY.length * charMs)
  .wait(DURATION.fast + 60)
  .moveTo(target(PICK, { fx: 0.4, fy: 0.55 }), 680, { curve: 0.22 })
  .wait(420)
  .mark("picked")
  .wait(200)
  .tween("enter", 1, 90, { ease: "out" })
  .wait(140)
  .tween("enter", 0, 130, { ease: "out" })
  .tween("open", 0, PALETTE_MS.exit, { ease: "in" })
  .tween("nav", 1, DURATION.enter, { at: b.now + PALETTE_MS.exit, ease: "out" })
  .wait(PALETTE_MS.exit)
  .erase("q", 30)
  .set("list", listH(0))
  .moveTo(REST, 640, { curve: -0.18 })
  .wait(240)
  .tween("nav", 0, DURATION.slow, { ease: "inOut", advance: true });

export const timeline = b.build();

/** Palette open, query typed, cursor on the second result: shown under reduced motion. */
export const poster = timeline.marks.picked ?? 0;

function Keycap({ x, y, w = 16, pulse = 0, children }: { x: number; y: number; w?: number; pulse?: number; children?: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: 16,
        borderRadius: 4,
        background: `color-mix(in srgb, var(--mk-wire-strong) ${pct(pulse)}%, var(--mk-surface))`,
        boxShadow: `inset 0 0 0 1px var(--mk-wire-strong), 0 ${1 - pulse}px 0 var(--mk-wire-strong)`,
        transform: `translateY(${pulse}px) scale(${1 - 0.06 * pulse})`,
      }}
    >
      {children}
    </div>
  );
}

export default function CommandPaletteScene({ frame }: SceneProps) {
  const { open, kbd, enter, list, nav } = frame.v as Record<"open" | "kbd" | "enter" | "list" | "nav", number>;
  const typed = frame.text.q ?? "";
  const { rows, labels } = layout(typed.length);
  const cursor = { x: frame.cursor.x, y: frame.cursor.y - STAGE.chromeH };
  const hovered = rows.findIndex((r) => contains(rowBox(r.y), cursor));
  const active = hovered === -1 ? 0 : hovered;
  const height = INPUT_H + 1 + list + 1 + FOOT_H;
  return (
    <>
      <DASHBOARD.Page state={{ nav0: { on: 1 - nav }, nav3: { on: nav } }} />
      <Field {...HINT} r={8}>
        <Avatar x={10} y={10} size={10} tone="strong" />
        <Bar x={26} y={12} w={24} h={6} tone="base" />
        <Keycap x={HINT.w - 44} y={7} pulse={kbd}>
          <Bar x={4} y={5} w={8} h={6} r={2} tone="strong" />
        </Keycap>
        <Keycap x={HINT.w - 24} y={7} pulse={kbd}>
          <Bar x={5} y={5} w={6} h={6} r={2} tone="strong" />
        </Keycap>
      </Field>
      {open > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "var(--mk-scrim)", opacity: open }} />
          <div
            style={{
              position: "absolute",
              left: PANEL.x,
              top: PANEL.y,
              width: PANEL.w,
              height,
              overflow: "hidden",
              borderRadius: "var(--mk-r-overlay)",
              background: "var(--mk-surface)",
              boxShadow: "var(--mk-shadow-overlay)",
              opacity: open,
              transform: `translateY(${lerp(-PALETTE_TRAVEL, 0, open)}px)`,
            }}
          >
            <Avatar x={18} y={16} size={12} tone="strong" />
            {typed.length === 0 ? <Bar x={40} y={18} w={128} h={8} tone="base" /> : <Bar x={40} y={17} w={typed.length * 8} h={10} r={3} tone="strong" />}
            {open > 0.9 && Math.floor(frame.t / 480) % 2 === 0 ? <Block x={42 + typed.length * 8} y={13} w={2} h={18} r={1} tone="accent" /> : null}
            <Block x={0} y={INPUT_H} w={PANEL.w} h={1} r={0} tone="base" />
            {labels.map((y, i) => (
              <Bar key={`g${i}`} x={18} y={y + 8} w={i === 0 ? 40 : 32} h={5} tone="title" />
            ))}
            {rows.map((r, i) => (
              <div key={`${r.group}-${r.w}`} style={{ position: "absolute", left: 6, top: r.y, width: PANEL.w - 12, height: ROW_H, borderRadius: 7, background: i === active ? "var(--mk-panel)" : "transparent" }}>
                <Block x={10} y={7} w={14} h={14} r={4} tone={i === active ? "strong" : "title"} />
                <Bar x={34} y={11} w={r.w + 40} h={7} tone={i === active ? "strong" : "title"} />
                {i === active ? <Bar x={PANEL.w - 12 - 40} y={12} w={28} h={5} tone="base" /> : null}
              </div>
            ))}
            <div style={{ position: "absolute", left: 0, top: height - FOOT_H - 1, width: PANEL.w, height: FOOT_H + 1 }}>
              <Block x={0} y={0} w={PANEL.w} h={1} r={0} tone="base" />
              <Keycap x={14} y={8}>
                <Bar x={5} y={5} w={6} h={6} r={2} tone="strong" />
              </Keycap>
              <Bar x={36} y={13} w={36} h={5} tone="base" />
              <Keycap x={PANEL.w - 84} y={8} w={22} pulse={enter}>
                <Bar x={6} y={5} w={10} h={6} r={2} tone="strong" />
              </Keycap>
              <Bar x={PANEL.w - 54} y={13} w={40} h={5} tone="base" />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

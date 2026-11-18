import { target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Avatar, Bar, Block, DASHBOARD, pct, type SceneProps } from "@/wireframe";

/**
 * A tabbed report card on the dashboard template, drawn over the template's chart card: a white
 * tab track with four tabs and a dark pill on the active one, a range picker on the right, and the
 * active panel below (tab 1 a line chart, tab 3 a list of customers with usage bars).
 */
const CARD: Rect = DASHBOARD.targets.chart;
const TRACK: Rect = { x: 14, y: 14, w: 254, h: 30 };
const TAB_X = [17, 85, 147, 211] as const;
const TAB_W = [66, 60, 62, 54] as const;
const LABEL_W = [34, 30, 32, 26] as const;
const TAB_Y = 17;
const TAB_H = 24;
const tab = (i: number): Rect => ({ x: TAB_X[i]!, y: TAB_Y, w: TAB_W[i]!, h: TAB_H });
const inPage = (r: Rect): Rect => ({ ...r, x: CARD.x + r.x, y: CARD.y + r.y });

/** Panel area inside the card. */
const PANEL: Rect = { x: 16, y: 58, w: 348, h: 96 };
/** Line chart samples (panel px, 12 points across 348 px). */
const LINE = [62, 58, 64, 50, 54, 42, 46, 36, 40, 28, 32, 22] as const;
const line = LINE.map((y, i) => `${Math.round((i * 348) / 11)},${y}`).join(" ");
/** Customer rows: name width, plan width, usage fill (0..1). */
const ROWS = [
  { name: 92, plan: 52, use: 0.78 },
  { name: 76, plan: 64, use: 0.52 },
  { name: 104, plan: 44, use: 0.34 },
] as const;
const ROW_Y = [0, 34, 68] as const;
const ROW_H = 28;
/** The row the cursor rests on while tab 3 is open (panel px). */
const HOVER_ROW = 1;

/** Cursor rest point (stage px): over the lower right of the card. */
const REST = { x: 420, y: 326 };

/*
 * Choreography: idle over the chart, curve up to tab 3 and press it; the pill slides from tab 1 to
 * tab 3 (220 ms ease-out) while the chart fades out (160 ms ease-in) and the list fades in
 * (220 ms ease-out, 60 ms later). The cursor drifts down onto a customer row, then back up to
 * tab 1; the pill slides home, the chart returns and the cursor settles where it started.
 */
const b = script({
  cursor: REST,
  tracks: { ind: 0, p0: 1, p2: 0, hover1: 0, hover3: 0, press1: 0, press3: 0, row: 0 },
})
  .wait(900)
  .moveTo(target(inPage(tab(2)), { fx: 0.52, fy: 0.62 }), 650, { curve: 0.18 })
  .tween("hover3", 1, DURATION.fast)
  .wait(160)
  .mark("press3")
  .press({ key: "press3", anchor: "tabs-tab3" });

const toUsers = b.lastClick;
b.tween("ind", 2, DURATION.enter, { at: toUsers, ease: "out" })
  .tween("p0", 0, DURATION.exit, { at: toUsers, ease: "in" })
  .tween("p2", 1, DURATION.enter, { at: toUsers + 60, ease: "out" })
  .tween("hover3", 0, DURATION.fast, { at: toUsers })
  .wait(300)
  .moveTo(target(inPage({ ...PANEL, y: PANEL.y + ROW_Y[HOVER_ROW], h: ROW_H }), { fx: 0.72, fy: 0.55 }), 560, { curve: -0.14 })
  .mark("usersShown")
  .tween("row", 1, DURATION.fast)
  .wait(340)
  .tween("row", 0, DURATION.fast)
  .moveTo(target(inPage(tab(0)), { fx: 0.5, fy: 0.6 }), 560, { curve: 0.16 })
  .tween("hover1", 1, DURATION.fast)
  .wait(160)
  .press({ key: "press1", anchor: "tabs-tab1" });

const toOverview = b.lastClick;
b.tween("ind", 0, DURATION.enter, { at: toOverview, ease: "out" })
  .tween("p2", 0, DURATION.exit, { at: toOverview, ease: "in" })
  .tween("p0", 1, DURATION.enter, { at: toOverview + 60, ease: "out" })
  .tween("hover1", 0, DURATION.fast, { at: toOverview })
  .moveTo(REST, 560, { curve: -0.12 });

export const timeline = b.build();

/** Tab 3 active, the customer list shown and the cursor on a row: shown under reduced motion. */
export const poster = timeline.marks.usersShown ?? 0;

/** Pill box for a fractional tab index (0..3): interpolates position and width between tabs. */
function pill(ind: number): Rect {
  const i = Math.min(Math.max(Math.floor(ind), 0), TAB_X.length - 2);
  const f = Math.min(Math.max(ind - i, 0), 1);
  const a = tab(i);
  const z = tab(i + 1);
  return { x: lerp(a.x, z.x, f), y: TAB_Y, w: lerp(a.w, z.w, f), h: TAB_H };
}

/** How much tab `i` sits under the pill (1 = fully selected). */
const under = (ind: number, i: number) => Math.max(0, 1 - Math.abs(ind - i));

function OverviewPanel({ opacity }: { opacity: number }) {
  return (
    <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, opacity }}>
      <Bar x={0} y={0} w={64} h={14} tone="title" />
      <Bar x={72} y={4} w={36} h={6} tone="strong" />
      <svg width={348} height={72} viewBox="0 0 348 72" style={{ position: "absolute", left: 0, top: 24, overflow: "visible" }}>
        {[0, 24, 48, 72].map((y) => (
          <line key={y} x1={0} x2={348} y1={y} y2={y} stroke="var(--mk-wire)" strokeWidth={1} />
        ))}
        <polygon points={`0,72 ${line} 348,72`} fill="var(--mk-wire-title)" opacity={0.45} />
        <polyline points={line} fill="none" stroke="var(--mk-wire-strong)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function CustomersPanel({ opacity, row }: { opacity: number; row: number }) {
  return (
    <div style={{ position: "absolute", left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, opacity }}>
      {ROWS.map((r, i) => (
        <Block
          key={i}
          x={0}
          y={ROW_Y[i]}
          w={PANEL.w}
          h={ROW_H}
          r={8}
          tone="surface"
          style={{ background: `color-mix(in srgb, var(--mk-surface) ${pct(i === HOVER_ROW ? 0.55 + 0.45 * row : 0.55)}%, transparent)` }}
        >
          <Avatar x={6} y={4} size={20} tone={i === 0 ? "strong" : "title"} />
          <Bar x={34} y={7} w={r.name} h={7} tone="title" />
          <Bar x={34} y={18} w={r.plan} h={5} tone="base" />
          <Block x={220} y={11} w={88} h={6} r={3} tone="base">
            <Block x={0} y={0} w={Math.round(88 * r.use)} h={6} r={3} tone="strong" />
          </Block>
          <Bar x={318} y={11} w={20} h={6} tone="title" />
        </Block>
      ))}
    </div>
  );
}

export default function SlidingTabsScene({ frame }: SceneProps) {
  const { ind, p0, p2, hover1, hover3, press1, press3, row } = frame.v as Record<
    "ind" | "p0" | "p2" | "hover1" | "hover3" | "press1" | "press3" | "row",
    number
  >;
  const indicator = pill(ind);
  const hover = [hover1, 0, hover3, 0];
  const press = [press1, 0, press3, 0];
  const anchors = ["tabs-tab1", undefined, "tabs-tab3", undefined];
  return (
    <>
      <DASHBOARD.Page />
      <Block {...CARD} r={12}>
        <Block {...TRACK} r={8} tone="surface" />
        {TAB_X.map((_, i) => (
          <Block key={`hover-${i}`} {...tab(i)} r={6} tone="panel" style={{ opacity: hover[i]! * (1 - under(ind, i)) }} />
        ))}
        <Block {...indicator} r={6} tone="accent" />
        {TAB_X.map((x, i) => (
          <div
            key={`tab-${i}`}
            data-anchor={anchors[i]}
            style={{
              position: "absolute",
              left: x,
              top: TAB_Y,
              width: TAB_W[i],
              height: TAB_H,
              transform: press[i]! > 0 ? `scale(${1 - 0.04 * press[i]!})` : undefined,
            }}
          >
            <Bar
              x={(TAB_W[i]! - LABEL_W[i]!) / 2}
              y={9}
              w={LABEL_W[i]}
              h={6}
              style={{ background: `color-mix(in srgb, var(--mk-surface) ${pct(under(ind, i))}%, var(--mk-wire-strong))` }}
            />
          </div>
        ))}
        <Block x={300} y={TRACK.y} w={66} h={TRACK.h} r={8} tone="surface">
          <Bar x={12} y={12} w={28} h={6} tone="title" />
          <Bar x={48} y={13} w={8} h={4} r={2} tone="strong" />
        </Block>
        {p0 > 0 ? <OverviewPanel opacity={p0} /> : null}
        {p2 > 0 ? <CustomersPanel opacity={p2} row={row} /> : null}
      </Block>
    </>
  );
}

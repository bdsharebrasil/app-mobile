import { target, type Rect } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { Bar, Block, MOBILE, PHONE, pct, type SceneProps } from "@/wireframe";
import { CONTENT_ENTER_DELAY, CONTENT_ENTER_MS, CONTENT_EXIT_MS, THUMB_MS } from "./timing";

/**
 * A Day / Week / Month range switch at the top of an activity screen on the mobile template (it
 * covers the template's two-way switch and its cards): a light track, a raised white thumb, dark
 * text on the checked segment, and below it a total and a bar chart for the chosen range. Distinct
 * from sliding-tabs (a dark pill in a dashboard card): a compact pill inside a phone screen, where
 * the choice re-scopes one chart instead of switching panels.
 */

/** Phone-local boxes (the drawing sits inside PHONE). */
const CTRL: Rect = { x: 12, y: 58, w: 148, h: 30 };
const PAD = 3;
const SEG_W = (CTRL.w - PAD * 2) / 3;
const LABEL_W = [18, 26, 24] as const;
const segLocal = (i: number): Rect => ({ x: CTRL.x + PAD + i * SEG_W, y: CTRL.y + PAD, w: SEG_W, h: CTRL.h - PAD * 2 });
const toPage = (r: Rect): Rect => ({ ...r, x: PHONE.x + r.x, y: PHONE.y + r.y });
const seg = (i: number) => toPage(segLocal(i));

/** Chart area (phone-local): bars grow up from the baseline. */
const CHART = { x: 16, w: 140, base: 230, h: 88 } as const;
/** Per range: total width, caption width, bar heights (0..1) and the gap between bars. */
const RANGES: readonly { total: number; caption: number; gap: number; bars: readonly number[] }[] = [
  { total: 50, caption: 74, gap: 6, bars: [0.34, 0.5, 0.42, 0.78, 0.6, 0.92, 0.54, 0.38] },
  { total: 66, caption: 62, gap: 7, bars: [0.56, 0.7, 0.46, 0.84, 0.66, 0.36, 0.6] },
  { total: 58, caption: 82, gap: 4, bars: [0.4, 0.52, 0.62, 0.46, 0.72, 0.58, 0.8, 0.64, 0.7, 0.5, 0.88, 0.68] },
];

/** Cursor rest point (stage px): right of the phone, clear of every control. */
const REST = { x: 432, y: 300 };

/*
 * Choreography: 1 s idle on Day, one long arc into the phone to Month, then two short hops back
 * along the control that dip under it (negative curve), choosing Week and then Day. Each click moves
 * the thumb 200 ms ease-out (no spring: a click, not a drag) while the old chart fades out in 120 ms
 * and the new one fades in 200 ms. The cursor leaves to the rest point and the loop starts on Day.
 */
const b = script({ cursor: REST, tracks: { pos: 0, a0: 1, a1: 0, a2: 0, press0: 0, press1: 0, press2: 0 } }).wait(1000);
function choose(from: number, to: number) {
  b.tween("pos", to, THUMB_MS, { at: b.lastClick });
  b.tween(`a${from}`, 0, CONTENT_EXIT_MS, { at: b.lastClick, ease: "in" });
  b.tween(`a${to}`, 1, CONTENT_ENTER_MS, { at: b.lastClick + CONTENT_ENTER_DELAY });
}
b.moveTo(target(seg(2), { fx: 0.52, fy: 0.62 }), 560, { curve: 0.24 }).wait(80).press({ key: "press2", anchor: "seg-2" });
choose(0, 2);
b.mark("picked").wait(480).moveTo(target(seg(1), { fx: 0.5, fy: 0.62 }), 300, { curve: -0.4 }).wait(80).press({ key: "press1", anchor: "seg-1" });
choose(2, 1);
b.wait(480).moveTo(target(seg(0), { fx: 0.48, fy: 0.62 }), 300, { curve: -0.4 }).wait(80).press({ key: "press0", anchor: "seg-0" });
choose(1, 0);
b.wait(270).moveTo(REST, 560, { curve: 0.16 });

export const timeline = b.build();
/** Static preview: Month chosen, its chart fully in. */
export const poster = timeline.marks.picked! + 400;

function Chart({ i, alpha }: { i: number; alpha: number }) {
  if (alpha <= 0) return null;
  const r = RANGES[i]!;
  const n = r.bars.length;
  const w = (CHART.w - r.gap * (n - 1)) / n;
  const peak = r.bars.indexOf(Math.max(...r.bars));
  // A short fade with a 4 px settle; the departing chart only fades.
  const rise = (1 - alpha) * 4;
  return (
    <div data-range={i} style={{ position: "absolute", inset: 0, opacity: alpha, transform: `translateY(${rise}px)` }}>
      <Bar x={16} y={102} w={r.total} h={12} tone="strong" />
      <Bar x={16} y={120} w={r.caption} h={5} tone="base" />
      {r.bars.map((v, k) => (
        <Block key={k} x={CHART.x + k * (w + r.gap)} y={CHART.base - v * CHART.h} w={w} h={v * CHART.h} r={3} tone={k === peak ? "strong" : "base"} />
      ))}
      {[0, Math.floor(n / 2), n - 1].map((k) => (
        <Bar key={k} x={CHART.x + k * (w + r.gap) + w / 2 - 5} y={CHART.base + 8} w={10} h={4} tone="base" />
      ))}
    </div>
  );
}

export default function SegmentedScene({ frame }: SceneProps) {
  const { pos = 0 } = frame.v;
  const alpha = [frame.v.a0 ?? 0, frame.v.a1 ?? 0, frame.v.a2 ?? 0];
  const press = [frame.v.press0 ?? 0, frame.v.press1 ?? 0, frame.v.press2 ?? 0];
  return (
    <>
      <MOBILE.Page />
      {/* Phone-local layer; everything drawn stays between the rounded corners, so nothing needs clipping. */}
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h }}>
        {/* The activity screen replaces the template's switch, cards and button above the tab bar. */}
        <Block x={0} y={54} w={PHONE.w} h={209} r={0} tone="surface" />
        <Block {...CTRL} r={10} tone="panel" style={{ boxShadow: "inset 0 0 0 1px var(--mk-wire)" }} />
        <Block
          x={CTRL.x + PAD + pos * SEG_W}
          y={CTRL.y + PAD}
          w={SEG_W}
          h={CTRL.h - PAD * 2}
          r={7}
          tone="surface"
          style={{ boxShadow: "0 0 0 1px var(--mk-wire), 0 1px 3px rgb(10 12 16 / 0.14)" }}
        />
        {[0, 1, 2].map((i) => {
          const r = segLocal(i);
          const on = Math.max(0, 1 - Math.abs(pos - i));
          return (
            <div key={i} data-anchor={`seg-${i}`} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, transform: press[i] ? `scale(${1 - 0.05 * press[i]!})` : undefined }}>
              <Bar
                x={(r.w - LABEL_W[i]!) / 2}
                y={(r.h - 6) / 2}
                w={LABEL_W[i]}
                h={6}
                style={{ background: `color-mix(in srgb, var(--mk-accent) ${pct(on)}%, var(--mk-wire-title))` }}
              />
            </div>
          );
        })}
        {alpha.map((a, i) => (
          <Chart key={i} i={i} alpha={a} />
        ))}
      </div>
    </>
  );
}

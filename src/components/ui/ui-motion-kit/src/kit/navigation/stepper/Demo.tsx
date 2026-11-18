import type { Rect } from "@/engine/geometry";
import { pageToStage, target } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { Bar, Block, Button, DASHBOARD, Field, type SceneProps } from "@/wireframe";

/**
 * A three-step setup wizard laid over the dashboard's content column (it covers the KPI tiles and
 * the chart): a horizontal step list, a form body and Back / Next. Next completes step one (its
 * check draws, the connector fills and step two's label darkens), the body swaps from two fields
 * to a choice list, and Back undoes it. Long diagonal cursor travel, unlike the short hops of
 * segmented-control.
 */
const CARD = { x: 152, y: 72, w: 380, h: 248 } as const;
const NODE = 22;
const nodeX = (i: number) => 24 + i * 132;
const LABEL_W = [52, 64, 44] as const;
const BACK: Rect = { x: CARD.x + 24, y: CARD.y + 202, w: 72, h: 30 };
const NEXT: Rect = { x: CARD.x + CARD.w - 24 - 88, y: CARD.y + 202, w: 88, h: 30 };
const ENTER = 240;
const EXIT = 150;

/** Cursor rest point (stage px): the empty header strip between the page title and the filter button. */
const REST = pageToStage({ x: 316, y: 40 });

/*
 * Choreography: 1 s idle on step one, a long diagonal down to Next and a click (step one's check
 * draws and its connector fills in 240 ms ease-out while the body crossfades, the new body sliding
 * 12 px from the right), a pause, a short move left to Back and a click (150 ms ease-in reverse,
 * the old body returning from the left), then the diagonal back up to the rest point.
 */
const b = script({ cursor: REST, tracks: { adv: 0, pressNext: 0, pressBack: 0 } })
  .wait(1000)
  .moveTo(target(NEXT, { fx: 0.52, fy: 0.58 }), 720, { curve: 0.14 })
  .wait(90)
  .press({ key: "pressNext", anchor: "next" });
b.tween("adv", 1, ENTER, { at: b.lastClick, ease: "out" });
b.mark("advanced")
  .wait(860)
  .moveTo(target(BACK, { fx: 0.5, fy: 0.6 }), 560, { curve: -0.08 })
  .wait(90)
  .press({ key: "pressBack", anchor: "back" });
b.tween("adv", 0, EXIT, { at: b.lastClick, ease: "in" });
b.wait(280).moveTo(REST, 680, { curve: -0.12 });

export const timeline = b.build();
/** Static preview: step two current, step one complete. */
export const poster = timeline.marks.advanced! + 420;

function Node({ i, adv }: { i: number; adv: number }) {
  const x = CARD.x + nodeX(i);
  const y = CARD.y + 20;
  // Step 0: current, then complete (filled with a drawn check). Step 1: upcoming, then current.
  const done = i === 0 ? adv : 0;
  const current = i === 0 ? 1 - adv : i === 1 ? adv : 0;
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: NODE,
          height: NODE,
          borderRadius: "50%",
          boxSizing: "border-box",
          background: `color-mix(in srgb, var(--mk-accent) ${pct(done)}, var(--mk-surface))`,
          boxShadow: `inset 0 0 0 2px color-mix(in srgb, var(--mk-wire-strong) ${pct(1 - Math.max(current, done))}, var(--mk-accent))`,
        }}
      >
        {/* Center dot on every step that is not done: light while upcoming, dark while current. */}
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 8,
            width: 6,
            height: 6,
            borderRadius: 3,
            opacity: 1 - done,
            background: `color-mix(in srgb, var(--mk-wire-title) ${pct(1 - current)}, var(--mk-accent))`,
          }}
        />
        {i === 0 ? (
          <svg width={NODE} height={NODE} viewBox="0 0 22 22" style={{ position: "absolute", inset: 0 }}>
            <path d="M6.5 11.5l3 3 6-6.5" pathLength={1} fill="none" stroke="var(--mk-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - done} />
          </svg>
        ) : null}
      </div>
      {/* Label: light while upcoming, mid gray once done, dark (emphasized) while current. */}
      <Bar
        x={x + NODE + 8}
        y={y + 7}
        w={LABEL_W[i]}
        h={8}
        style={{ background: `color-mix(in srgb, color-mix(in srgb, var(--mk-wire-title) ${pct(1 - done)}, var(--mk-wire-strong)) ${pct(1 - current)}, var(--mk-accent))` }}
      />
    </>
  );
}

export default function StepperScene({ frame }: SceneProps) {
  const { adv = 0, pressNext = 0, pressBack = 0 } = frame.v;
  const lineY = CARD.y + 20 + NODE / 2;
  return (
    <>
      <DASHBOARD.Page />
      <Block x={CARD.x} y={CARD.y} w={CARD.w} h={CARD.h} r={10} tone="surface" style={{ boxShadow: "inset 0 0 0 1px var(--mk-wire), 0 6px 18px rgb(10 12 16 / 0.08)" }} />
      {[0, 1].map((i) => {
        const x0 = CARD.x + nodeX(i) + NODE + 8 + LABEL_W[i]! + 8;
        const x1 = CARD.x + nodeX(i + 1) - 8;
        const fill = i === 0 ? adv : 0;
        return (
          <div key={i}>
            <div style={{ position: "absolute", left: x0, top: lineY - 1, width: x1 - x0, height: 2, borderRadius: 1, background: "var(--mk-wire)" }} />
            <div style={{ position: "absolute", left: x0, top: lineY - 1, width: (x1 - x0) * fill, height: 2, borderRadius: 1, background: "var(--mk-accent)" }} />
          </div>
        );
      })}
      {[0, 1, 2].map((i) => (
        <Node key={i} i={i} adv={adv} />
      ))}
      <div style={{ position: "absolute", left: CARD.x + 16, top: CARD.y + 60, width: CARD.w - 32, height: 1, background: "var(--mk-wire)" }} />

      {/* Step one body: two labelled fields. Leaves by fading; returns from the left on Back. */}
      <div style={{ position: "absolute", left: CARD.x + 24, top: CARD.y + 76, width: 332, height: 112, opacity: 1 - adv, transform: `translateX(${-12 * adv}px)` }}>
        <Bar x={0} y={0} w={120} h={12} tone="title" />
        <Bar x={0} y={28} w={56} h={6} tone="base" />
        <Field x={0} y={40} w={332} h={28} />
        <Bar x={0} y={78} w={72} h={6} tone="base" />
        <Field x={0} y={90} w={200} h={22} />
      </div>
      {/* Step two body: a choice list. Enters 12 px from the right while fading in. */}
      <div style={{ position: "absolute", left: CARD.x + 24, top: CARD.y + 76, width: 332, height: 112, opacity: adv, transform: `translateX(${12 * (1 - adv)}px)` }}>
        <Bar x={0} y={0} w={96} h={12} tone="title" />
        {[0, 1, 2].map((k) => (
          <div key={k} style={{ position: "absolute", left: 0, top: 26 + k * 30, width: 332, height: 24 }}>
            <div style={{ position: "absolute", left: 0, top: 5, width: 14, height: 14, borderRadius: "50%", boxSizing: "border-box", boxShadow: `inset 0 0 0 ${k === 0 ? 4 : 2}px var(--mk-wire-strong)` }} />
            <Bar x={24} y={8} w={[112, 92, 132][k]} h={8} tone={k === 0 ? "strong" : "title"} />
          </div>
        ))}
      </div>

      <Button {...BACK} variant="secondary" press={pressBack} anchor="back" style={{ opacity: 0.45 + 0.55 * adv }}>
        <Bar x={22} y={11} w={28} h={8} tone="strong" />
      </Button>
      <Button {...NEXT} press={pressNext} anchor="next">
        <Bar x={26} y={11} w={36} h={8} tone="surface" />
      </Button>
    </>
  );
}

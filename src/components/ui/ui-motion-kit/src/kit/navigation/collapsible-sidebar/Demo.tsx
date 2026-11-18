import type { Rect } from "@/engine/geometry";
import { pageToStage, target } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { Avatar, Bar, Block, DASHBOARD, pct, type SceneProps } from "@/wireframe";

/**
 * The dashboard template's navigation rail, collapsible: the toggle at the bottom of the rail
 * narrows it to an icon rail (labels fade, the content column re-centres in the wider space),
 * hovering a rail icon shows its name in a tooltip, and the toggle brings the labels back.
 * A short hop, a long climb up the rail, then a straight drop: unlike stepper's diagonals on the
 * same template.
 */
const OPEN_W = 128;
const RAIL_W = 52;
/** The content column has a fixed width and centres in the space right of the rail. */
const SHIFT = 36;
const NAV_W = [56, 44, 60, 40, 52] as const;
const ICON_X = 20;
const navY = (i: number) => 60 + i * 32;
const TOGGLE = (c: number): Rect => ({ x: 88 + (12 - 88) * c, y: 302, w: 28, h: 28 });
const ENTER = 240;
const EXIT = 180;
const TIP_IN = 180;
const TIP_OUT = 120;
const TIP_DELAY = 300;
/** Hovered rail item. */
const HOVER = 2;

/** Cursor rest point (stage px): just below the chart, near the rail's toggle. */
const REST = pageToStage({ x: 178, y: 334 });

/*
 * Choreography: 1 s idle expanded, a short hop to the toggle and a click (rail narrows in 180 ms
 * ease-in, labels fade with it), a long climb to the third rail icon, the tooltip after its 300 ms
 * delay (180 ms fade with 4 px travel), a straight drop to the toggle (tooltip closes in 120 ms) and
 * a click (rail widens in 240 ms ease-out), then back to rest.
 */
const b = script({ cursor: REST, tracks: { c: 0, tip: 0, pressToggle: 0 } })
  .wait(1000)
  .moveTo(target(TOGGLE(0), { fx: 0.5, fy: 0.55 }), 360, { curve: 0.1 })
  .wait(60)
  .press({ key: "pressToggle", anchor: "toggle" });
b.tween("c", 1, EXIT, { at: b.lastClick, ease: "in" });
b.wait(220)
  .moveTo(pageToStage({ x: ICON_X + 7, y: navY(HOVER) + 15 }), 520, { curve: -0.16 })
  .wait(TIP_DELAY)
  .tween("tip", 1, TIP_IN, { ease: "out" });
b.mark("tooltip")
  .wait(820)
  .tween("tip", 0, TIP_OUT, { ease: "in" });
b.moveTo(target(TOGGLE(1), { fx: 0.5, fy: 0.5 }), 460, { curve: 0.06 })
  .wait(60)
  .press({ key: "pressToggle", anchor: "toggle" });
b.tween("c", 0, ENTER, { at: b.lastClick, ease: "out" });
b.wait(120).moveTo(REST, 440, { curve: -0.12 });

export const timeline = b.build();
/** Static preview: collapsed rail with the tooltip showing. */
export const poster = timeline.marks.tooltip! + TIP_IN + 200;

function ToggleIcon({ c }: { c: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ position: "absolute", left: 6, top: 6 }}>
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" fill="none" stroke="var(--mk-wire-strong)" strokeWidth="1.5" />
      <path d="M5.75 3v10" stroke="var(--mk-wire-strong)" strokeWidth="1.5" />
      <path d={`M${11 - c * 2} 6l${-2 + c * 4} 2 ${2 - c * 4} 2`} fill="none" stroke="var(--mk-wire-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CollapsibleSidebarScene({ frame }: SceneProps) {
  const { c = 0, tip = 0, pressToggle = 0 } = frame.v;
  const w = OPEN_W + (RAIL_W - OPEN_W) * c;
  const labels = 1 - c;
  const toggle = TOGGLE(c);
  const tipY = navY(HOVER) + 2;
  return (
    <>
      {/* Content column: the template page without its rail, re-centred as the rail narrows. */}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${w}px)` }}>
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${OPEN_W}px)`, transform: `translateX(${-SHIFT * c}px)` }}>
          <DASHBOARD.Page />
        </div>
      </div>

      <Block x={0} y={0} w={w} h={344} r={0} tone="panel" style={{ overflow: "hidden" }}>
        <Avatar x={20} y={20} size={18} tone="strong" />
        <Bar x={44} y={25} w={52} h={8} tone="strong" style={{ opacity: labels }} />
        {NAV_W.map((lw, i) => {
          const on = i === 0;
          const hover = i === HOVER ? tip : 0;
          const x = 12 - 4 * c;
          return (
            <Block
              key={i}
              x={x}
              y={navY(i)}
              w={w - 2 * x}
              h={28}
              r={8}
              tone="surface"
              style={{ background: `color-mix(in srgb, var(--mk-surface) ${pct(Math.max(on ? 1 : 0, hover))}%, transparent)` }}
            >
              <Block x={ICON_X - x} y={8} w={12} h={12} r={3} tone={on ? "strong" : "title"} />
              <Bar x={30} y={10} w={lw} h={8} tone={on ? "strong" : "title"} style={{ opacity: labels }} />
            </Block>
          );
        })}
        <div
          data-anchor="toggle"
          style={{
            position: "absolute",
            left: toggle.x,
            top: toggle.y,
            width: toggle.w,
            height: toggle.h,
            borderRadius: 8,
            background: "var(--mk-surface)",
            boxShadow: "inset 0 0 0 1px var(--mk-wire)",
            transform: pressToggle ? `scale(${1 - 0.05 * pressToggle})` : undefined,
          }}
        >
          <ToggleIcon c={c} />
        </div>
      </Block>
      <Block x={w - 1} y={0} w={1} h={344} r={0} tone="base" />

      {/* Tooltip naming the hovered rail icon. */}
      <div
        style={{
          position: "absolute",
          left: RAIL_W + 6,
          top: tipY,
          width: 66,
          height: 24,
          borderRadius: 8,
          background: "var(--mk-accent)",
          opacity: tip,
          transform: `translateX(${-4 * (1 - tip)}px)`,
        }}
      >
        <div style={{ position: "absolute", left: -4, top: 8, width: 8, height: 8, background: "var(--mk-accent)", transform: "rotate(45deg)" }} />
        <Bar x={10} y={9} w={NAV_W[HOVER] - 8} h={6} tone="surface" />
      </div>
    </>
  );
}

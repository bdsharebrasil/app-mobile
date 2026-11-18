import { target } from "@/engine/geometry";
import { timeline as script, lerp } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { DASHBOARD, Avatar, Bar, Block, Button, pct, type SceneProps } from "@/wireframe";
// Static frame: dashboard sidebar footer. No room below the account trigger, so the inverted
// panel flips above it, aligned to its start edge, and rises from the trigger.
const TRIGGER = { x: 12, y: 292, w: 104, h: 40 };
const PANEL = { x: 12, y: 58, w: 232, h: 226 };
const ROW_Y = [68, 106, 144, 182] as const;
const ROW_W = [88, 120, 104, 64] as const;
const THIRD = { x: PANEL.x + 8, y: PANEL.y + ROW_Y[2], w: 216, h: 36 };
const REST = { x: 492, y: 110 };
// Charcoal inverted surface from accent + surface tokens: near-black #17191d reads 0.2 HSV
// saturation, too gray at this size.
const INVERTED = "color-mix(in srgb, var(--mk-accent) 88%, var(--mk-surface))";
const b = script({ cursor: REST, tracks: { open: 0, press: 0, row: 0, choose: 0 } })
  .wait(1000).moveTo(target(TRIGGER, { fx: 0.36 }), 700, { curve: 0.22 }).press({ key: "press", anchor: "popover-trigger" });
b.tween("open", 1, DURATION.enter, { at: b.lastClick, ease: "out" }).wait(480)
  .moveTo(target(THIRD, { fx: 0.42 }), 480, { curve: -0.2 }).tween("row", 1, DURATION.fast)
  .wait(700).mark("thirdRow").press({ key: "choose", anchor: "popover-third" });
b.tween("open", 0, DURATION.exit, { at: b.lastClick, ease: "in" }).tween("row", 0, DURATION.fast, { at: b.lastClick })
  .wait(DURATION.exit).moveTo(REST, 700, { curve: -0.2 });
export const timeline = b.build();
export const poster = timeline.marks.thirdRow!;

export default function Scene({ frame }: SceneProps) {
  const { open = 0, press = 0, row = 0, choose = 0 } = frame.v;
  return (
    <>
      <DASHBOARD.Page />
      <Block {...TRIGGER} r={10} tone="panel" style={{ background: `color-mix(in srgb, var(--mk-secondary-hover) ${pct(open)}%, var(--mk-panel))`, transform: press ? `scale(${1 - 0.03 * press})` : undefined }}>
        <div data-anchor="popover-trigger" style={{ position: "absolute", inset: 0 }} />
        <Avatar x={8} y={8} size={24} tone="title" />
        <Bar x={40} y={16} w={44} h={8} tone="strong" />
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" style={{ position: "absolute", left: 88, top: 15, color: "var(--mk-wire-strong)" }}>
          <path d="m2 6.5 3-3 3 3" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Block>
      {open > 0 && (
        <Block {...PANEL} r={12} style={{ background: INVERTED, opacity: open, transform: `translateY(${lerp(6, 0, open)}px)`, boxShadow: "var(--mk-shadow-overlay)" }}>
          <Avatar x={16} y={16} size={28} tone="strong" />
          <Bar x={54} y={19} w={96} h={8} tone="surface" />
          <Bar x={54} y={33} w={128} h={6} tone="strong" />
          <Block x={12} y={59} w={208} h={1} r={0} style={{ background: "color-mix(in srgb, var(--mk-surface) 14%, transparent)" }} />
          {ROW_Y.map((y, i) => (
            <Button
              key={y}
              x={8}
              y={y}
              w={216}
              h={36}
              hover={i === 2 ? row : 0}
              press={i === 2 ? choose : 0}
              anchor={i === 2 ? "popover-third" : undefined}
              style={{ background: `color-mix(in srgb, var(--mk-surface) ${i === 2 ? pct(row) * 0.14 : 0}%, ${INVERTED})` }}
            >
              <Bar x={12} y={14} w={ROW_W[i]} h={8} tone={i === 2 ? "surface" : "strong"} />
            </Button>
          ))}
        </Block>
      )}
    </>
  );
}

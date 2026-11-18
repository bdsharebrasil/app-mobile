import { target } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, SETTINGS, type SceneProps } from "@/wireframe";

const REST = { x: 390, y: 310 };
const b = script({ cursor: REST, tracks: { first: 0, second: 0, hover: 0, press: 0, progress1: 0, progress2: 0 } })
  .wait(1000)
  .moveTo(target(SETTINGS.targets.save), 480, { curve: -0.2 })
  .tween("hover", 1, DURATION.fast, { advance: true })
  .press({ key: "press", anchor: "toast-save" });
const firstClick = b.lastClick;
b.tween("first", 1, DURATION.enter, { at: firstClick })
  .wait(160)
  .press({ key: "press", anchor: "toast-save" });
const secondClick = b.lastClick;
b.tween("second", 1, DURATION.enter, { at: secondClick })
  .tween("hover", 0, DURATION.fast)
  .moveTo({ x: 408, y: 280 }, 480, { curve: 0.22 })
  .mark("stacked")
  .wait(1180);
const closeAt = b.now;
b.tween("progress1", 1, closeAt - firstClick, { at: firstClick, ease: "linear" })
  .tween("progress2", 1, closeAt + 140 - secondClick, { at: secondClick, ease: "linear" })
  .tween("first", 0, DURATION.exit, { ease: "in" })
  .tween("second", 0, DURATION.exit, { at: closeAt + 140, ease: "in" })
  .moveTo(REST, 660, { curve: -0.18 })
  .set("progress1", 0)
  .set("progress2", 0);

export const timeline = b.build();
export const poster = timeline.marks.stacked!;

function Notice({ open, y, progress, secondary = false }: { open: number; y: number; progress: number; secondary?: boolean }) {
  if (open <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 28, top: y, width: 320, height: 92, background: "var(--mk-wire-title)", borderRadius: "var(--mk-r-overlay)", boxShadow: "var(--mk-shadow-overlay)", opacity: open, transform: `translateY(${12 * (1 - open)}px)` }}>
      <Block x={16} y={18} w={32} h={32} r={8} tone="accent">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" style={{ position: "absolute", left: 6, top: 6, color: "var(--mk-accent-fg)" }} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8v8h12V8M3 4h14v4H3zM7 11l2 2 4-4" />
        </svg>
      </Block>
      <Bar x={60} y={20} w={secondary ? 108 : 132} h={10} tone="accent" />
      <Bar x={60} y={40} w={secondary ? 132 : 156} h={6} tone="strong" />
      <Block x={244} y={16} w={60} h={36} r={8} tone="accent"><Bar x={14} y={14} w={32} h={8} tone="surface" /></Block>
      <Bar x={16} y={74} w={288} h={3} tone="strong" style={{ opacity: 0.25 }} />
      <Bar x={16} y={74} w={288} h={3} tone="accent" style={{ transformOrigin: "left", transform: `scaleX(${1 - progress})` }} />
    </div>
  );
}

export default function ToastScene({ frame }: SceneProps) {
  const { first = 0, second = 0, hover = 0, press = 0, progress1 = 0, progress2 = 0 } = frame.v;
  return <>
    <SETTINGS.Page state={{ save: { hover, press, anchor: "toast-save" } }} />
    <Notice open={first} y={108} progress={progress1} />
    <Notice open={second} y={212} progress={progress2} secondary />
  </>;
}

import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, LANDING, type SceneProps } from "@/wireframe";
const REST = { x: 236, y: 300 };
const b = script({ cursor: REST, tracks: { pending: 0, turn: 0, press: 0 } })
  .wait(1000).moveTo(target(LANDING.targets.primary), 440, { curve: -.32 }).press({ key: "press", anchor: "spinner-load" });
const click = b.lastClick;
b.tween("pending", 1, DURATION.enter, { at: click }).tween("turn", 800, 2000, { at: click, ease: "linear" })
  .moveTo({ x: 422, y: 276 }, 600, { curve: .26 }).mark("loading").wait(1350)
  .tween("pending", 0, DURATION.exit, { advance: true, ease: "in" }).set("turn", 0)
  .moveTo(REST, 700, { curve: -.18 });
export const timeline = b.build();
export const poster = timeline.marks.loading!;
function Ring({ size, turn }: { size: number; turn: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: `rotate(${turn}deg)` }}><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M12 3a9 9 0 0 1 9 9" /></svg>; }
export default function SpinnerScene({ frame }: SceneProps) {
  const { pending = 0, turn = 0, press = 0 } = frame.v;
  return <><LANDING.Page state={{ primary: { press, anchor: "spinner-load" } }} />
    <Bar x={48} y={191} w={64} h={8} tone="surface" style={{ opacity: 1 - pending }} />
    <div style={{ position: "absolute", left: 66, top: 182, color: "var(--mk-accent-fg)", opacity: pending }}><Ring size={26} turn={turn} /></div>
    <Block {...LANDING.targets.media} r={12} tone="panel" style={{ opacity: pending }}><div style={{ position: "absolute", left: 94, top: 52, color: "var(--mk-accent)" }}><Ring size={44} turn={turn} /></div></Block>
  </>;
}

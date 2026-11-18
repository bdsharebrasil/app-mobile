import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, Button, LANDING, type SceneProps } from "@/wireframe";

const REST = { x: 440, y: 300 };
const b = script({ cursor: REST, tracks: { open: 0, press: 0 } })
  .wait(1000).tween("open", 1, DURATION.enter, { advance: true })
  .wait(1000).mark("shown")
  .moveTo(target({ x: 484, y: 12, w: 48, h: 40 }), 500, { curve: -0.24 })
  .wait(300).press({ key: "press", anchor: "inline-banner-dismiss" });
b.tween("open", 0, DURATION.exit, { at: b.lastClick, ease: "in" })
  .wait(300).moveTo(REST, 700, { curve: 0.18 });
export const timeline = b.build();
export const poster = timeline.marks.shown!;
export default function InlineBannerScene({ frame }: SceneProps) {
  const { open = 0, press = 0 } = frame.v;
  return <>
    <div style={{ position: "absolute", inset: 0, transform: `translateY(${64 * open}px)` }}><LANDING.Page /></div>
    <div style={{ position: "absolute", left: 0, top: 0, width: 560, height: 64 * open, overflow: "hidden" }}>
      <Block x={0} y={0} w={560} h={64} r={0} tone="secondary">
        <Block x={28} y={20} w={24} h={24} r={8} tone="accent"><Bar x={11} y={5} w={2} h={3} tone="surface" /><Bar x={11} y={11} w={2} h={8} tone="surface" /></Block>
        <Bar x={68} y={20} w={180} h={9} tone="strong" /><Bar x={68} y={37} w={280} h={6} />
        <Button x={484} y={12} w={48} h={40} variant="secondary" press={press} anchor="inline-banner-dismiss">
          <svg width="16" height="16" viewBox="0 0 20 20" style={{ position: "absolute", left: 16, top: 12, color: "var(--mk-accent)" }}><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        </Button>
      </Block>
    </div>
  </>;
}

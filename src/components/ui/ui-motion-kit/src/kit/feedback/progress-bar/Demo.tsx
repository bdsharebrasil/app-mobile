import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, DASHBOARD, type SceneProps } from "@/wireframe";
const REST = { x: 220, y: 290 };
const b = script({ cursor: REST, tracks: { open: 0, fill: 0, done: 0, press: 0 } })
  .wait(1000).moveTo(target(DASHBOARD.targets.create), 560, { curve: .24 }).press({ key: "press", anchor: "progress-bar-upload" });
const click = b.lastClick;
b.tween("open", 1, DURATION.enter, { at: click })
  .tween("fill", .32, DURATION.enter, { at: click + 220 })
  .tween("fill", .68, DURATION.enter, { at: click + 700 })
  .tween("fill", 1, DURATION.enter, { at: click + 1200 })
  .tween("done", 1, DURATION.enter, { at: click + 1440 })
  .wait(1900).tween("open", 0, DURATION.exit, { ease: "in", advance: true })
  .set("fill", 0).set("done", 0).moveTo(REST, 760, { curve: -.22 });
export const timeline = b.build();
export const poster = click + 1000;
export default function ProgressScene({ frame }: SceneProps) {
  const { open = 0, fill = 0, done = 0, press = 0 } = frame.v;
  return <><DASHBOARD.Page state={{ create: { press, anchor: "progress-bar-upload" } }} />
    <Block x={156} y={174} w={376} h={138} tone="surface" style={{ opacity: open, border: "1px solid var(--mk-window-border)" }}>
      <Block x={20} y={20} w={36} h={40} r={6} tone="secondary"><Bar x={8} y={10} w={20} h={4} tone="strong" /><Bar x={8} y={20} w={14} h={4} /></Block>
      <Bar x={72} y={25} w={152} h={10} tone="strong" /><Bar x={72} y={44} w={100} h={6} />
      <Bar x={20} y={82} w={336} h={8} tone="base" /><Bar x={20} y={82} w={336} h={8} tone="accent" style={{ transformOrigin: "left", transform: `scaleX(${fill})` }} />
      <Bar x={20} y={108} w={72 + fill * 60} h={6} tone="title" />
      <svg width="24" height="24" viewBox="0 0 24 24" style={{ position: "absolute", right: 20, top: 24, opacity: done, color: "var(--mk-accent)" }} fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4 10-10" /></svg>
    </Block></>;
}

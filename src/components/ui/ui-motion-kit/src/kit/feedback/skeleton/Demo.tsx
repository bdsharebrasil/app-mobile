import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Avatar, Bar, Block, FEED, type SceneProps } from "@/wireframe";
const REST = { x: 370, y: 296 };
const b = script({ cursor: REST, tracks: { loading: 0, sweep: 0, press: 0 } })
  .wait(1000).moveTo(target(FEED.targets.filter), 420, { curve: -.2 }).press({ key: "press", anchor: "skeleton-reload" });
const click = b.lastClick;
b.tween("loading", 1, DURATION.enter, { at: click }).tween("sweep", 1, 1400, { at: click + 220, ease: "linear" })
  .moveTo({ x: 222, y: 284 }, 520, { curve: .2 }).mark("loading").wait(1300)
  .tween("loading", 0, DURATION.enter, { advance: true }).set("sweep", 0)
  .wait(340).moveTo(REST, 500, { curve: -.16 });
export const timeline = b.build();
export const poster = timeline.marks.loading!;
export default function SkeletonScene({ frame }: SceneProps) {
  const { loading = 0, sweep = 0, press = 0 } = frame.v;
  return <><FEED.Page state={{ filter: { press, anchor: "skeleton-reload" } }} />
    <div style={{ position: "absolute", left: 28, top: 98, width: 504, height: 230, opacity: loading, overflow: "hidden", background: "var(--mk-window)" }}>
      {[0, 1, 2, 3, 4].map(i => <Block key={i} x={0} y={i * 46} w={504} h={44} r={8} tone="surface"><Avatar x={10} y={9} size={28} tone="base" /><Bar x={50} y={12} w={140 - i * 12} h={8} /><Bar x={50} y={26} w={280 - i * 16} h={6} /><Bar x={452} y={12} w={40} h={6} /></Block>)}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,var(--mk-surface),transparent)", transform: `translateX(${-100 + sweep * 200}%)` }} />
    </div></>;
}

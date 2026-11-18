import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, Button, FEED, type SceneProps } from "@/wireframe";
const REST = { x: 120, y: 306 };
const b = script({ cursor: REST, tracks: { empty: 0, icon: 0, title: 0, action: 0, press: 0 } })
  .wait(1000).moveTo(target(FEED.targets.filter), 620, { curve: .3 }).press({ key: "press", anchor: "empty-state-delete" });
const click = b.lastClick;
b.tween("empty", 1, DURATION.exit, { at: click }).tween("icon", 1, DURATION.enter, { at: click + 160 })
  .tween("title", 1, DURATION.enter, { at: click + 185 }).tween("action", 1, DURATION.enter, { at: click + 235 })
  .moveTo({ x: 390, y: 310 }, 560, { curve: -.2 }).mark("empty").wait(1300)
  .tween("empty", 0, DURATION.exit, { advance: true, ease: "in" }).set("icon", 0).set("title", 0).set("action", 0)
  .moveTo(REST, 720, { curve: .22 });
export const timeline = b.build();
export const poster = timeline.marks.empty!;
export default function EmptyScene({ frame }: SceneProps) {
  const { empty = 0, icon = 0, title = 0, action = 0, press = 0 } = frame.v;
  return <><FEED.Page state={{ filter: { press, anchor: "empty-state-delete" } }} />
    <Block x={28} y={98} w={504} h={230} r={0} tone="surface" style={{ opacity: empty }}>
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="var(--mk-wire-strong)" strokeWidth="3" strokeLinejoin="round" style={{ position: "absolute", left: 224, top: 20, opacity: icon, transform: `translateY(${8 * (1 - icon)}px)` }}><path d="M10 19h36v28H10zM7 11h42v8H7zM21 29h14" /></svg>
      <div style={{ opacity: title, transform: `translateY(${8 * (1 - title)}px)` }}><Bar x={176} y={100} w={152} h={12} tone="strong" /><Bar x={124} y={124} w={256} h={6} /><Bar x={164} y={138} w={176} h={6} /></div>
      <Button x={200} y={168} w={104} h={34} style={{ opacity: action, transform: `translateY(${8 * (1 - action)}px)` }}><Bar x={24} y={13} w={56} h={8} tone="surface" /></Button>
    </Block></>;
}

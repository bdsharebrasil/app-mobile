import { target } from "@/engine/geometry";
import { timeline as script, lerp } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { SETTINGS, Bar, Block, Button, type SceneProps } from "@/wireframe";

const BOX = { x: 116, y: 88, w: 328, h: 164 };
const CANCEL = { x: 136, y: 108, w: 76, h: 36 };
const REST = { x: 264, y: 300 };
// Frame established first: shared settings geometry, compact two-action confirmation.
const b = script({ cursor: REST, tracks: { open: 0, press: 0, cancel: 0, hover: 0 } })
  .wait(1000).moveTo(target(SETTINGS.targets.action4), 600, { curve: -0.22 })
  .press({ key: "press", anchor: "alert-dialog-delete" });
b.tween("open", 1, DURATION.enter, { at: b.lastClick, ease: "out" })
  .wait(550).moveTo(target({ x: 352, y: 200, w: 72, h: 28 }), 240, { curve: 0.18 })
  .wait(420) // Hesitate over the destructive action, then choose the safe one.
  .moveTo(target({ ...CANCEL, x: BOX.x + CANCEL.x, y: BOX.y + CANCEL.y }), 300, { curve: -0.2 })
  .tween("hover", 1, DURATION.fast).wait(170).mark("safeChoice")
  .press({ key: "cancel", anchor: "alert-dialog-cancel" });
b.tween("open", 0, DURATION.exit, { at: b.lastClick, ease: "in" })
  .tween("hover", 0, DURATION.fast, { at: b.lastClick })
  .wait(DURATION.exit).moveTo(REST, 650, { curve: 0.26 });
export const timeline = b.build();
export const poster = timeline.marks.safeChoice!;

export default function Scene({ frame }: SceneProps) {
  const { open = 0, press = 0, cancel = 0, hover = 0 } = frame.v;
  return <>
    <SETTINGS.Page />
    <Button {...SETTINGS.targets.action4} press={press} anchor="alert-dialog-delete"><Bar x={20} y={10} w={40} h={8} tone="surface" /></Button>
    {open > 0 && <>
      <div style={{ position: "absolute", inset: 0, background: "var(--mk-scrim)", opacity: open }} />
      <Block {...BOX} r={12} tone="surface" style={{ boxShadow: "var(--mk-shadow-overlay)", opacity: open, transform: `scale(${lerp(0.98, 1, open)})` }}>
        <Block x={20} y={20} w={28} h={28} r={8} tone="secondary"><Bar x={13} y={7} w={2} h={10} tone="strong" /><Bar x={13} y={20} w={2} h={2} tone="strong" /></Block>
        <Bar x={60} y={24} w={144} h={12} tone="strong" />
        <Bar x={20} y={64} w={268} h={8} tone="title" /><Bar x={20} y={80} w={212} h={8} tone="base" />
        <Button {...CANCEL} variant="secondary" press={cancel} hover={hover} anchor="alert-dialog-cancel"><Bar x={20} y={14} w={36} h={8} tone="strong" /></Button>
        <Button x={224} y={108} w={84} h={36}><Bar x={22} y={14} w={40} h={8} tone="surface" /></Button>
      </Block>
    </>}
  </>;
}

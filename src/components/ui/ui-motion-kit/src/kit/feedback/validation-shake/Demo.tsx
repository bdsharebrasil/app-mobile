import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, Field, SETTINGS, type SceneProps } from "@/wireframe";
const REST = { x: 300, y: 306 };
const b = script({ cursor: REST, tracks: { error: 0, shake: 0, press: 0 } })
  .wait(1000).moveTo(target(SETTINGS.targets.save), 520, { curve: -.3 }).press({ key: "press", anchor: "validation-shake-submit" });
const click = b.lastClick;
b.tween("error", 1, DURATION.enter, { at: click });
// Integer millisecond boundaries, as in the engine's PRESS schedule, avoid floating-point overlap.
[-4, 4, -3, 3, -2, 0].forEach((x, i) => b.tween("shake", x, DURATION.fast / 3, { at: click + i * (DURATION.fast / 3) }));
b.moveTo({ x: 208, y: 194 }, 480, { curve: .24 }).mark("invalid").wait(1450)
  .tween("error", 0, DURATION.exit, { advance: true, ease: "in" }).moveTo(REST, 760, { curve: -.2 });
export const timeline = b.build();
export const poster = timeline.marks.invalid!;
export default function ValidationScene({ frame }: SceneProps) {
  const { error = 0, shake = 0, press = 0 } = frame.v;
  return <><SETTINGS.Page state={{ save: { press, anchor: "validation-shake-submit" } }} />
    <Block x={24} y={100} w={512} h={144} r={0} tone="surface">
      <Bar x={4} y={14} w={104} h={8} tone="title" />
      <Field x={4 + shake} y={38} w={368} h={40} focus={error}><Bar x={12} y={16} w={132} h={8} /></Field>
      <div style={{ opacity: error }}><Bar x={4} y={92} w={12} h={12} tone="accent" /><Bar x={28} y={95} w={224} h={6} tone="strong" /></div>
    </Block></>;
}

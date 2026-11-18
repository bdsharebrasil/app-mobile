import { target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { Bar, Block, Button, Field, MOBILE, PHONE, pct, type SceneProps } from "@/wireframe";
import { FLOAT_MS } from "./timing";

/**
 * Mobile template: the phone's list becomes a sign-up step with two outlined fields. "Full name"
 * is prefilled (its label already floats); "Work email" is empty, its label resting inside.
 */
const FORM_TOP = 56;
const FIELD_W = 140;
const FIELD_H = 40;
const NAME: Rect = { x: 16, y: 76, w: FIELD_W, h: FIELD_H };
const EMAIL: Rect = { x: 16, y: 124, w: FIELD_W, h: FIELD_H };
/** Clear button inside the email field (field px). */
const CLEAR: Rect = { x: 116, y: 12, w: 16, h: 16 };
const EMAIL_TEXT = "ana@studio.co";
const CHAR_W = 4.4;

const inPage = (r: Rect, inside?: Rect): Rect => ({
  x: PHONE.x + (inside?.x ?? 0) + r.x,
  y: PHONE.y + (inside?.y ?? 0) + r.y,
  w: r.w,
  h: r.h,
});

/** Cursor rest point (stage px): on the backdrop left of the phone, low. */
const REST = { x: 100, y: 298 };

/*
 * Choreography: idle beside the phone; rise up-right and tap the empty email field (the label
 * rises and shrinks, the border darkens); the address types in and a clear button fades in; tap
 * the clear button (the text goes, but the label stays up because the field still has focus);
 * drift back down and tap the backdrop: the field blurs empty, so the label returns.
 */
const b = script({ cursor: REST, tracks: { focus: 0, float: 0, clear: 0 }, textTracks: ["email"] })
  .wait(1000)
  .moveTo(target(inPage(EMAIL), { fx: 0.35, fy: 0.55 }), 600, { curve: 0.22 })
  .wait(60)
  .mark("tap")
  .press({ anchor: "floating-field" });

b.tween("focus", 1, FLOAT_MS.enter, { at: b.lastClick, ease: "out" })
  .tween("float", 1, FLOAT_MS.enter, { at: b.lastClick, ease: "out" })
  .wait(100);
b.tween("clear", 1, FLOAT_MS.enter, { ease: "out" })
  .type("email", EMAIL_TEXT, 520)
  .mark("typed")
  .wait(160)
  .moveTo(target(inPage(CLEAR, EMAIL)), 300, { curve: -0.1 })
  .wait(60)
  .mark("clearTap")
  .press({ anchor: "floating-clear" });

b.tween("text:email", 0, 0, { at: b.lastClick })
  .tween("clear", 0, FLOAT_MS.exit, { at: b.lastClick, ease: "in" })
  .wait(200)
  .moveTo(REST, 520, { curve: 0.12 })
  .wait(40)
  .mark("blurTap")
  .press({ anchor: "floating-backdrop" });

b.tween("focus", 0, FLOAT_MS.exit, { at: b.lastClick, ease: "in" }).tween("float", 0, FLOAT_MS.exit, {
  at: b.lastClick,
  ease: "in",
});

export const timeline = b.build();

/** Address typed, label floated, clear button showing: shown under reduced motion. */
export const poster = (timeline.marks.typed ?? 0) + 100;

/** Label bar geometry (field px) for float progress f: 0 resting inside, 1 raised and small. */
export function labelBox(f: number) {
  return { x: 12, y: lerp(17, 7, f), w: lerp(56, 42, f), h: lerp(6, 4, f) };
}

export default function FloatingLabelScene({ frame }: SceneProps) {
  const { focus, float, clear } = frame.v as Record<"focus" | "float" | "clear", number>;
  const typed = frame.text.email ?? "";
  const label = labelBox(float);
  const textW = Math.round(typed.length * CHAR_W * 10) / 10;
  return (
    <>
      <MOBILE.Page />
      {/* Backdrop beside the phone: tapping it blurs the field. */}
      <div data-anchor="floating-backdrop" style={{ position: "absolute", left: 0, top: 0, width: PHONE.x - 16, height: 344 }} />
      <div
        style={{
          position: "absolute",
          left: PHONE.x,
          top: PHONE.y + FORM_TOP,
          width: PHONE.w,
          height: 263 - FORM_TOP,
          background: "var(--mk-surface)",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: -FORM_TOP, width: PHONE.w, height: PHONE.h }}>
          <Bar x={16} y={62} w={64} h={5} tone="base" />
          {/* Prefilled: label already floated above the value. */}
          <Field {...NAME}>
            <Bar {...labelBox(1)} tone="title" />
            <Bar x={12} y={21} w={64} h={6} tone="strong" />
          </Field>
          <Field {...EMAIL} focus={focus} anchor="floating-field">
            <Bar {...label} tone="title" />
            {typed ? <Bar x={12} y={21} w={textW} h={6} tone="strong" /> : null}
            {focus > 0.5 ? <Block x={12 + textW + 1.5} y={18} w={1.5} h={12} r={1} tone="accent" /> : null}
            <div
              data-anchor="floating-clear"
              style={{
                position: "absolute",
                left: CLEAR.x,
                top: CLEAR.y,
                width: CLEAR.w,
                height: CLEAR.h,
                borderRadius: 8,
                background: "var(--mk-panel)",
                opacity: clear,
              }}
            >
              <Block x={4} y={7.25} w={8} h={1.5} r={1} tone="strong" style={{ transform: "rotate(45deg)" }} />
              <Block x={4} y={7.25} w={8} h={1.5} r={1} tone="strong" style={{ transform: "rotate(-45deg)" }} />
            </div>
          </Field>
          <Bar x={16} y={EMAIL.y + EMAIL.h + 7} w={104} h={5} tone="base" />
          <Button x={16} y={190} w={FIELD_W} h={30} r={10}>
            <Bar x={48} y={12} w={44} h={6} tone="surface" />
          </Button>
          {/* Focus also thickens the email border to 2 px, the way the real field does. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: EMAIL.x,
              top: EMAIL.y,
              width: EMAIL.w,
              height: EMAIL.h,
              borderRadius: 8,
              pointerEvents: "none",
              boxShadow: `inset 0 0 0 ${Math.round(focus * 20) / 10}px color-mix(in srgb, var(--mk-accent) ${pct(focus)}%, transparent)`,
            }}
          />
        </div>
      </div>
    </>
  );
}

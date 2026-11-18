import { target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Avatar, Bar, Block, Button, DASHBOARD, Field, type SceneProps } from "@/wireframe";

/**
 * "New report" dialog on the dashboard template: icon, title and hint, one labeled input, then a
 * full-width primary action with a quiet Cancel under it. Centered on the content column (right
 * of the rail), not on the page.
 */
const DIALOG: Rect = { x: 182, y: 60, w: 320, h: 224 };
const INNER = {
  icon: { x: 20, y: 20, w: 36, h: 36 },
  title: { x: 68, y: 24, w: 128, h: 12 },
  hint: { x: 68, y: 42, w: 168, h: 6 },
  close: { x: 284, y: 20, w: 16, h: 16 },
  label: { x: 20, y: 76, w: 64, h: 8 },
  field: { x: 20, y: 92, w: 280, h: 36 },
  confirm: { x: 20, y: 144, w: 280, h: 34 },
  cancel: { x: 124, y: 186, w: 72, h: 22 },
} satisfies Record<string, Rect>;

const inPage = (r: Rect): Rect => ({ ...r, x: DIALOG.x + r.x, y: DIALOG.y + r.y });

/** Typed name, drawn as a bar of this many px per character. */
const NAME = "Q3 revenue";
const CHAR_W = 7;

/** Cursor rest point (stage px): over the chart, below the KPI tiles. */
const REST = { x: 330, y: 290 };

/*
 * Choreography: idle over the chart, travel up to "New report" in the header and press it; the
 * dialog opens; the cursor drops into the name field, clicks, the name is typed; it slides down
 * to the primary action and presses it; the dialog closes and the cursor returns to the chart.
 */
const b = script({
  cursor: REST,
  tracks: { open: 0, hoverOpen: 0, pressOpen: 0, focus: 0, pressField: 0, hoverConfirm: 0, pressConfirm: 0 },
  textTracks: ["name"],
})
  .wait(700)
  .moveTo(target(DASHBOARD.targets.create, { fx: 0.55, fy: 0.6 }), 700, { curve: 0.16 })
  .tween("hoverOpen", 1, DURATION.fast)
  .wait(200)
  .mark("openPress")
  .press({ key: "pressOpen", anchor: "modal-open" });

const opened = b.lastClick;
b.tween("open", 1, DURATION.enter, { at: opened, ease: "out" })
  .tween("hoverOpen", 0, DURATION.fast, { at: opened })
  .wait(160)
  .moveTo(target(inPage(INNER.field), { fx: 0.3, fy: 0.55 }), 380, { curve: -0.12 })
  .wait(80)
  .press({ key: "pressField", anchor: "modal-field" });

b.tween("focus", 1, DURATION.fast, { at: b.lastClick })
  .type("name", NAME, 400)
  .wait(80)
  .moveTo(target(inPage(INNER.confirm), { fx: 0.42, fy: 0.55 }), 320, { curve: 0.1 })
  .tween("hoverConfirm", 1, DURATION.fast)
  .wait(120)
  .mark("confirmPress")
  .press({ key: "pressConfirm", anchor: "modal-confirm" });

const closed = b.lastClick;
b.tween("open", 0, DURATION.exit, { at: closed, ease: "in" })
  .tween("hoverConfirm", 0, DURATION.fast, { at: closed })
  .tween("focus", 0, DURATION.fast, { at: closed + DURATION.exit })
  .wait(DURATION.exit)
  .erase("name", 40)
  .wait(160)
  .moveTo(REST, 640, { curve: -0.14 });

export const timeline = b.build();

/** Open state with the name typed and the cursor on the primary action: shown under reduced motion. */
export const poster = timeline.marks.confirmPress ?? 0;

export default function ModalScene({ frame }: SceneProps) {
  const { open, hoverOpen, pressOpen, focus, hoverConfirm, pressConfirm } = frame.v as Record<
    "open" | "hoverOpen" | "pressOpen" | "focus" | "hoverConfirm" | "pressConfirm",
    number
  >;
  const typed = frame.text.name ?? "";
  const caretOn = focus > 0.5 && Math.floor(frame.t / 480) % 2 === 0;
  return (
    <>
      <DASHBOARD.Page state={{ create: { hover: hoverOpen, press: pressOpen, anchor: "modal-open" } }} />
      {open > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "var(--mk-scrim)", opacity: open }} />
          <div
            style={{
              position: "absolute",
              left: DIALOG.x,
              top: DIALOG.y,
              width: DIALOG.w,
              height: DIALOG.h,
              borderRadius: "var(--mk-r-overlay)",
              background: "var(--mk-surface)",
              boxShadow: "var(--mk-shadow-overlay)",
              opacity: open,
              transform: `translateY(${lerp(6, 0, open)}px) scale(${lerp(0.97, 1, open)})`,
            }}
          >
            <Avatar x={INNER.icon.x} y={INNER.icon.y} size={INNER.icon.w} tone="base">
              <Block x={11} y={11} w={14} h={14} r={4} tone="strong" />
            </Avatar>
            <Bar {...INNER.title} tone="strong" />
            <Bar {...INNER.hint} tone="base" />
            <Block {...INNER.close} r={5} tone="secondary" />
            <Bar {...INNER.label} tone="title" />
            <Field {...INNER.field} focus={focus} anchor="modal-field">
              {typed.length === 0 ? <Bar x={12} y={14} w={112} h={8} tone="base" /> : null}
              {typed.length > 0 ? <Bar x={12} y={13} w={typed.length * CHAR_W} h={10} r={3} tone="strong" /> : null}
              {caretOn ? <Block x={14 + typed.length * CHAR_W} y={10} w={2} h={16} r={1} tone="accent" /> : null}
            </Field>
            <Button {...INNER.confirm} hover={hoverConfirm} press={pressConfirm} anchor="modal-confirm">
              <Bar x={108} y={13} w={64} h={8} tone="surface" />
            </Button>
            <Block {...INNER.cancel} r={6} tone="surface">
              <Bar x={16} y={8} w={40} h={6} tone="title" />
            </Block>
          </div>
        </>
      ) : null}
    </>
  );
}

import { pageToStage, type Rect } from "@/engine/geometry";
import { lerp, PRESS, timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, LANDING, type SceneProps } from "@/wireframe";
import { SLIDER_MS } from "./timing";

/**
 * Landing template: the hero's chart panel becomes a "seats" estimator card with a slider. The
 * columns above the track light up as the value grows, the readout chip widens, and a value bubble
 * rides above the thumb while it is held.
 */
const CARD: Rect = LANDING.targets.media;
/** Track inside the card (card px): 200 px long, 4 px tall. */
const TRACK: Rect = { x: 16, y: 116, w: 200, h: 4 };
const THUMB = 18;
const COLUMNS = [10, 16, 13, 20, 17, 24, 21, 26] as const;
const COLUMN_W = 12;
const COLUMN_GAP = 8;
const COLUMN_BASE = 72;

/** Start value and the value the first drag reaches (0..1 of the track). */
const V0 = 0.3;
const V1 = 0.78;

/** Stage point of the thumb center at value v. */
const thumbAt = (v: number) =>
  pageToStage({ x: CARD.x + TRACK.x + v * TRACK.w, y: CARD.y + TRACK.y + TRACK.h / 2 });
/** The cursor tip grabs slightly below the thumb center, the way a hand rests on a knob. */
const grip = (v: number) => {
  const c = thumbAt(v);
  return { x: c.x + 1, y: c.y + 2 };
};

/** Cursor rest point (stage px): over the second stat tile, below the hero. */
const REST = { x: 214, y: 318 };

/*
 * Choreography: idle on the stat tiles; climb up-right to the thumb; grab it (ring grows, bubble
 * fades in) and drag right, the thumb, fill and columns following the pointer directly; release,
 * the ring settles and the bubble fades out a beat later; grab again and drag back, quicker; let
 * go and drift back down to the tiles.
 */
const b = script({ cursor: REST, tracks: { v: V0, hover: 0, grab: 0, bubble: 0 } })
  .wait(850)
  .moveTo(grip(V0), 520, { curve: -0.16 })
  .tween("hover", 1, DURATION.fast)
  .wait(110)
  .mark("grab1");

const DRAG1 = 760;
const g1 = b.now;
b.tween("grab", 1, SLIDER_MS.enter, { at: g1 })
  .tween("bubble", 1, SLIDER_MS.enter, { at: g1 })
  // Pointer drags are direct: the value follows the cursor's x exactly (same start, length, ease).
  .tween("v", V1, DRAG1, { at: g1 + PRESS.down, ease: "inOut" })
  .drag(grip(V1), DRAG1, { curve: 0.05 });

const r1 = g1 + PRESS.down + DRAG1;
b.tween("grab", 0, SLIDER_MS.exit, { at: r1, ease: "in" })
  .mark("held")
  .tween("bubble", 0, SLIDER_MS.exit, { at: r1 + 520, ease: "in" })
  .wait(800)
  .mark("grab2");

const DRAG2 = 520;
const g2 = b.now;
b.tween("grab", 1, SLIDER_MS.enter, { at: g2 })
  .tween("bubble", 1, SLIDER_MS.enter, { at: g2 })
  .tween("v", V0, DRAG2, { at: g2 + PRESS.down, ease: "inOut" })
  .drag(grip(V0), DRAG2, { curve: -0.05 });

const r2 = g2 + PRESS.down + DRAG2;
b.tween("grab", 0, SLIDER_MS.exit, { at: r2, ease: "in" })
  .tween("bubble", 0, SLIDER_MS.exit, { at: r2 + 250, ease: "in" })
  .tween("hover", 0, DURATION.fast)
  .moveTo(REST, 520, { curve: 0.14 });

export const timeline = b.build();

/** Thumb near the right end, released, bubble still showing: shown under reduced motion. */
export const poster = (timeline.marks.held ?? 0) + 200;

/** Exposed for the unit test: where the thumb is drawn for a value (stage px). */
export const thumbCenter = thumbAt;

export default function SliderScene({ frame }: SceneProps) {
  const { v, hover, grab, bubble } = frame.v as Record<"v" | "hover" | "grab" | "bubble", number>;
  const x = TRACK.x + v * TRACK.w;
  const cy = TRACK.y + TRACK.h / 2;
  const ring = 5 * Math.max(0.6 * hover, grab);
  const lit = Math.round(v * COLUMNS.length);
  return (
    <>
      <LANDING.Page />
      <Block {...CARD} r={12} tone="surface" style={{ boxShadow: "inset 0 0 0 1px var(--mk-wire)" }}>
        <Bar x={16} y={16} w={84} h={8} tone="title" />
        <Bar x={16} y={30} w={56} h={6} tone="base" />
        {/* Readout chip: its value bar widens with the slider. */}
        <Block x={160} y={12} w={56} h={24} r={6} tone="panel">
          <Bar x={10} y={9} w={Math.round(lerp(14, 36, v))} h={6} tone="strong" />
        </Block>
        {COLUMNS.map((h, i) => (
          <Bar
            key={i}
            x={16 + i * (COLUMN_W + COLUMN_GAP)}
            y={COLUMN_BASE - h}
            w={COLUMN_W}
            h={h}
            r={3}
            tone={i < lit ? "strong" : "title"}
          />
        ))}
        {/* Track and fill. */}
        <Bar {...TRACK} r={2} tone="title" />
        <Bar x={TRACK.x} y={TRACK.y} w={Math.max(0, x - TRACK.x)} h={TRACK.h} r={2} tone="accent" />
        <Bar x={TRACK.x} y={TRACK.y + 14} w={14} h={6} tone="base" />
        <Bar x={TRACK.x + TRACK.w - 20} y={TRACK.y + 14} w={20} h={6} tone="base" />
        {/* Value bubble above the thumb. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: x - 20,
            top: cy - 40,
            width: 40,
            height: 22,
            opacity: bubble,
            transform: `translateY(${Math.round((1 - bubble) * 40) / 10}px)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 16,
              top: 17,
              width: 8,
              height: 8,
              borderRadius: 1,
              background: "var(--mk-accent)",
              transform: "rotate(45deg)",
            }}
          />
          <Block x={0} y={0} w={40} h={22} r={6} tone="accent">
            <Bar x={10} y={8} w={20} h={6} tone="surface" />
          </Block>
        </div>
        <div
          data-anchor="slider-thumb"
          style={{
            position: "absolute",
            left: x - THUMB / 2,
            top: cy - THUMB / 2,
            width: THUMB,
            height: THUMB,
            borderRadius: 9,
            background: "var(--mk-surface)",
            boxShadow: `0 0 0 ${Math.round(ring * 10) / 10}px color-mix(in srgb, var(--mk-accent) 12%, transparent), inset 0 0 0 2px var(--mk-accent), 0 1px 2px rgb(10 12 16 / 0.2)`,
            transform: grab > 0 ? `scale(${Math.round((1 + 0.08 * grab) * 1000) / 1000})` : undefined,
          }}
        />
      </Block>
    </>
  );
}

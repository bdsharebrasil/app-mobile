import type { Rect } from "@/engine/geometry";
import { pageToStage, target } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { Avatar, Bar, Block, FEED, pct, type SceneProps } from "@/wireframe";

/**
 * The feed template's list, paged: four rows of results above a numbered pager (previous, 1 to 5,
 * ellipsis, 12, next), the same items the live component shows on pages 3 and 4. Choosing page 4 slides the filled marker one slot right and
 * swaps the rows (old rows fade, new rows arrive 12 px from the right); Previous brings page 3 back
 * from the left. Low horizontal arcs along the pager, unlike stepper's long diagonals.
 */
const ITEM = 28;
const GAP = 6;
/** Pager slots: 0 previous, 1-5 pages 1-5, 6 ellipsis, 7 page 12, 8 next. */
const SLOTS = 9;
const PAGER = { x: (560 - (SLOTS * ITEM + (SLOTS - 1) * GAP)) / 2, y: 298 } as const;
const slot = (i: number): Rect => ({ x: PAGER.x + i * (ITEM + GAP), y: PAGER.y, w: ITEM, h: ITEM });
const PAGE_SLOT = { 3: 3, 4: 4 } as const;
/** Digit-shaped marks, narrow and taller than wide: a "1" is 3 px, other digits 5 px. Page 12 is two
 * marks, a "1" and a "2" with a small gap, so it never reads as one solid box. */
const DIGITS: Record<number, readonly number[]> = { 1: [3], 2: [5], 3: [5], 4: [5], 5: [5], 7: [3, 5] };
const DIGIT_GAP = 2;
const LIST = { x: 28, y: 96, w: 504, row: 46 } as const;
const ROWS_A = [
  { name: 92, preview: 236, unread: true },
  { name: 70, preview: 204, unread: false },
  { name: 104, preview: 252, unread: false },
  { name: 80, preview: 188, unread: true },
] as const;
const ROWS_B = [
  { name: 76, preview: 220, unread: false },
  { name: 112, preview: 258, unread: true },
  { name: 64, preview: 196, unread: false },
  { name: 98, preview: 230, unread: false },
] as const;
const ENTER = 220;
const EXIT = 150;
/** Incoming rows start after the outgoing ones have mostly faded. */
const SWAP_DELAY = 90;

/** Cursor rest point (stage px): right of the pager, below the last row. */
const REST = pageToStage({ x: 486, y: 318 });

/*
 * Choreography: 1 s idle on page 3, a low arc left along the pager to page 4 and a click (the
 * marker slides one slot in 220 ms ease-out, page 3's rows fade in 150 ms ease-in, page 4's rows
 * arrive from the right), a pause to read, a longer arc to Previous and a click (marker and rows
 * return, page 3 arriving from the left), then a sweep back to the rest point.
 */
const b = script({ cursor: REST, tracks: { pg: 0, rowsA: 1, rowsB: 0, press4: 0, pressPrev: 0 } })
  .wait(1000)
  .moveTo(target(slot(PAGE_SLOT[4]), { fx: 0.46, fy: 0.55 }), 600, { curve: 0.2 })
  .wait(120)
  .press({ key: "press4", anchor: "page-4" });
b.tween("pg", 1, ENTER, { at: b.lastClick, ease: "out" });
b.tween("rowsA", 0, EXIT, { at: b.lastClick, ease: "in" });
b.tween("rowsB", 1, ENTER, { at: b.lastClick + SWAP_DELAY, ease: "out" });
b.mark("paged")
  .wait(900)
  .moveTo(target(slot(0), { fx: 0.52, fy: 0.5 }), 520, { curve: -0.14 })
  .wait(100)
  .press({ key: "pressPrev", anchor: "prev" });
b.tween("pg", 0, ENTER, { at: b.lastClick, ease: "out" });
b.tween("rowsB", 0, EXIT, { at: b.lastClick, ease: "in" });
b.tween("rowsA", 1, ENTER, { at: b.lastClick + SWAP_DELAY, ease: "out" });
b.wait(300).moveTo(REST, 760, { curve: 0.1 });

export const timeline = b.build();
/** Static preview: page 4 shown and marked. */
export const poster = timeline.marks.paged! + 420;

function Rows({ rows, opacity, dx }: { rows: typeof ROWS_A | typeof ROWS_B; opacity: number; dx: number }) {
  return (
    <div style={{ position: "absolute", left: LIST.x, top: LIST.y, width: LIST.w, height: rows.length * LIST.row, opacity, transform: `translateX(${dx}px)` }}>
      {rows.map((r, i) => (
        <div key={i} style={{ position: "absolute", left: 0, top: i * LIST.row, width: LIST.w, height: LIST.row }}>
          <Avatar x={10} y={9} size={28} tone="title" />
          <Bar x={50} y={12} w={r.name} h={8} tone={r.unread ? "strong" : "title"} />
          <Bar x={50} y={26} w={r.preview} h={6} tone="base" />
          <Bar x={452} y={12} w={40} h={6} tone="base" />
          {r.unread ? <Avatar x={484} y={26} size={8} tone="strong" /> : null}
          {i < rows.length - 1 ? <Block x={50} y={45} w={454} h={1} r={0} tone="base" /> : null}
        </div>
      ))}
    </div>
  );
}

/** Left offsets of a number's digit marks, the group centred in its slot. */
export function digitMarks(widths: readonly number[]) {
  const total = widths.reduce((a, w) => a + w, 0) + DIGIT_GAP * (widths.length - 1);
  let x = (ITEM - total) / 2;
  return widths.map((w) => {
    const mark = { x, w };
    x += w + DIGIT_GAP;
    return mark;
  });
}

function Chevron({ left }: { left: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: "absolute", left: 8, top: 8 }}>
      <path d={left ? "M7.5 2.5 4 6l3.5 3.5" : "M4.5 2.5 8 6 4.5 9.5"} fill="none" stroke="var(--mk-wire-strong)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PaginationScene({ frame }: SceneProps) {
  const { pg = 0, rowsA = 1, rowsB = 0, press4 = 0, pressPrev = 0 } = frame.v;
  const marker = slot(PAGE_SLOT[3]).x + pg * (ITEM + GAP);
  return (
    <>
      <FEED.Page />
      {/* The template's rows give way to the paged list. */}
      <div style={{ position: "absolute", left: 20, top: LIST.y - 2, width: 520, height: 250, background: "var(--mk-window)" }} />
      <Rows rows={ROWS_A} opacity={rowsA} dx={-12 * (1 - rowsA)} />
      <Rows rows={ROWS_B} opacity={rowsB} dx={12 * (1 - rowsB)} />
      <Block x={LIST.x} y={PAGER.y - 12} w={LIST.w} h={1} r={0} tone="base" />

      <Block x={marker} y={PAGER.y} w={ITEM} h={ITEM} r={8} tone="accent" />
      {Array.from({ length: SLOTS }, (_, i) => {
        const r = slot(i);
        const press = i === 4 ? press4 : i === 0 ? pressPrev : 0;
        const anchor = i === 4 ? "page-4" : i === 0 ? "prev" : undefined;
        if (i === 6) {
          return [0, 1, 2].map((k) => <Avatar key={`${i}-${k}`} x={r.x + 8 + k * 5} y={r.y + 13} size={3} tone="title" />);
        }
        // Each number reads in the marker's color while the marker sits under it.
        const under = Math.max(0, 1 - Math.abs(marker - r.x) / (ITEM + GAP));
        return (
          <div key={i} data-anchor={anchor} style={{ position: "absolute", left: r.x, top: r.y, width: ITEM, height: ITEM, borderRadius: 8, transform: press ? `scale(${1 - 0.06 * press})` : undefined }}>
            {i === 0 || i === SLOTS - 1 ? (
              <>
                <div style={{ position: "absolute", inset: 0, borderRadius: 8, boxShadow: "inset 0 0 0 1px var(--mk-wire)" }} />
                <Chevron left={i === 0} />
              </>
            ) : (
              digitMarks(DIGITS[i]!).map((d, k) => (
                <Bar
                  key={k}
                  x={d.x}
                  y={9}
                  w={d.w}
                  h={10}
                  r={1.5}
                  style={{ background: `color-mix(in srgb, var(--mk-surface) ${pct(under)}%, var(--mk-wire-strong))` }}
                />
              ))
            )}
          </div>
        );
      })}
    </>
  );
}

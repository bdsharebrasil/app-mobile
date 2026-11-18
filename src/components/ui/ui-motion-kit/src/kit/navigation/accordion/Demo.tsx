import type { Rect } from "@/engine/geometry";
import { pageToStage } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { Bar, Block, LANDING, pct, type SceneProps } from "@/wireframe";

/**
 * A FAQ card laid over the right half of the landing template (it covers the chart panel and the
 * two right stat tiles): four question rows, one open at a time. The card grows and shrinks with
 * its open panel; each chevron turns with its row. Vertical travel only, unlike the sideways hops
 * of segmented-control and sliding-tabs.
 */
const CARD = { x: 286, y: 62, w: 246 } as const;
const HEAD = 44;
const ROW_H = 36;
const PANEL_H = 52;
/**
 * Bottom padding. With one answer open the card ends at page y 317, 1 px past the stat tiles it
 * covers: while one panel opens (ease-out) and another closes (ease-in) their summed height dips
 * up to ~1% below one panel, and that margin keeps the tile edges hidden.
 */
const FOOT = 15;
const QUESTION_W = [128, 100, 140, 112] as const;
const ANSWER_W = [[196, 178, 120], [188, 164, 96], [200, 172, 132], [184, 150, 110]] as const;
const ENTER = 240;
const EXIT = 180;

/** Top of row `i` inside the card for the given open amounts. */
function rowTop(i: number, open: readonly number[]) {
  let y = HEAD + i * ROW_H;
  for (let j = 0; j < i; j++) y += open[j]! * PANEL_H;
  return y;
}

/** Page y of the card's bottom edge for the given open amounts (it must cover the tiles, which end at 316). */
export function cardBottom(open: readonly number[]) {
  return CARD.y + rowTop(4, open) + FOOT;
}

/** Page box of row `i`'s heading (the clickable strip). */
function heading(i: number, open: readonly number[]): Rect {
  return { x: CARD.x + 8, y: CARD.y + rowTop(i, open), w: CARD.w - 16, h: ROW_H };
}

/** Cursor rest point (stage px): just under the card's right edge, clear of every row. */
const REST = pageToStage({ x: 520, y: 322 });

/*
 * Choreography: 1 s idle with the first answer open, a near-vertical climb to the third question
 * and a click (it opens in 240 ms ease-out while the first closes in 180 ms ease-in), a pause to
 * read, a second climb to the first question and a click that restores the opening state, then a
 * drop back to the rest point.
 */
const b = script({ cursor: REST, tracks: { open0: 1, open1: 0, open2: 0, open3: 0, press0: 0, press2: 0 } })
  .wait(1000)
  .moveTo(pageToStage({ x: CARD.x + 188, y: heading(2, [1, 0, 0, 0]).y + 20 }), 560, { curve: 0.08 })
  .wait(90)
  .press({ key: "press2", anchor: "faq-2" });
b.tween("open2", 1, ENTER, { at: b.lastClick, ease: "out" });
b.tween("open0", 0, EXIT, { at: b.lastClick, ease: "in" });
b.mark("opened")
  .wait(880)
  .moveTo(pageToStage({ x: CARD.x + 150, y: heading(0, [0, 0, 1, 0]).y + 19 }), 500, { curve: -0.1 })
  .wait(90)
  .press({ key: "press0", anchor: "faq-0" });
b.tween("open0", 1, ENTER, { at: b.lastClick, ease: "out" });
b.tween("open2", 0, EXIT, { at: b.lastClick, ease: "in" });
b.wait(320).moveTo(REST, 600, { curve: 0.12 });

export const timeline = b.build();
/** Static preview: the third answer fully open. */
export const poster = timeline.marks.opened! + 420;

function Chevron({ turn }: { turn: number }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: "absolute", right: 12, top: 12, transform: `rotate(${turn * 180}deg)` }}>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="var(--mk-wire-strong)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AccordionScene({ frame }: SceneProps) {
  const open = [frame.v.open0 ?? 0, frame.v.open1 ?? 0, frame.v.open2 ?? 0, frame.v.open3 ?? 0];
  const press = [frame.v.press0 ?? 0, 0, frame.v.press2 ?? 0, 0];
  const h = cardBottom(open) - CARD.y;
  return (
    <>
      <LANDING.Page />
      <Block x={CARD.x} y={CARD.y} w={CARD.w} h={h} r={10} tone="surface" style={{ boxShadow: "inset 0 0 0 1px var(--mk-wire), 0 6px 18px rgb(10 12 16 / 0.08)", overflow: "hidden" }}>
        <Bar x={16} y={18} w={84} h={10} tone="strong" />
        {open.map((o, i) => {
          const top = rowTop(i, open);
          return (
            <div key={i} style={{ position: "absolute", left: 8, top, width: CARD.w - 16, height: ROW_H + o * PANEL_H }}>
              {i > 0 ? <div style={{ position: "absolute", left: 8, right: 8, top: 0, height: 1, background: "var(--mk-wire)" }} /> : null}
              <div
                data-anchor={`faq-${i}`}
                style={{
                  position: "absolute",
                  inset: `0 0 auto 0`,
                  height: ROW_H,
                  borderRadius: 8,
                  background: `color-mix(in srgb, var(--mk-panel) ${pct(press[i]!)}%, transparent)`,
                }}
              >
                <Bar x={8} y={14} w={QUESTION_W[i]} h={8} style={{ background: `color-mix(in srgb, var(--mk-wire-strong) ${pct(o)}%, var(--mk-wire-title))` }} />
                <Chevron turn={o} />
              </div>
              <div style={{ position: "absolute", left: 8, top: ROW_H, right: 0, height: o * PANEL_H, overflow: "hidden" }}>
                {ANSWER_W[i]!.map((w, k) => (
                  <Bar key={k} x={0} y={2 + k * 14} w={w} h={6} />
                ))}
              </div>
            </div>
          );
        })}
      </Block>
    </>
  );
}

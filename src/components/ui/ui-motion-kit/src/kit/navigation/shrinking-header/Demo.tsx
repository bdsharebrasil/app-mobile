import { pageToStage } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { EASING, STAGE } from "@/engine/tokens";
import { Avatar, Bar, Block, Button, LANDING, type SceneProps } from "@/wireframe";

/**
 * The landing template scrolled by the wheel under a header redrawn on top of it. Past a 24 px
 * threshold the header settles into its compact size (logo smaller, bar 16 px shorter, hairline and
 * shadow in) over 220 ms ease-out; scrolling back above the threshold restores it in 160 ms ease-in.
 * No clicks at all: the cursor sweeps in from the lower left, rests over the page while the wheel
 * turns, and sweeps back. Unlike the other navigation pieces, nothing is pressed.
 */
const COMPACT_IN = 220;
const COMPACT_OUT = 160;
/** Scroll offset (page px) past which the header is compact. */
export const THRESHOLD = 24;
/** Deepest scroll offset reached in the loop. */
export const DEPTH = 168;
/** Header height, expanded and compact. */
export const HEADER = { tall: 56, compact: 40 } as const;
/** Height of everything that scrolls: the template page plus one extra section below it. */
const CONTENT_H = 532;
const SCROLL_DOWN = 900;
const SCROLL_UP = 800;

/** Cursor rest point (stage px): low on the left, clear of the hero buttons. */
const REST = pageToStage({ x: 96, y: 326 });
/** Where the cursor sits while the wheel turns: over the chart panel, below the header. */
const OVER_PAGE = pageToStage({ x: 368, y: 236 });

/** Time (ms after a scroll tween starts) when an inOut scroll from `from` to `to` crosses THRESHOLD. */
export function crossing(from: number, to: number, ms: number) {
  const target = (THRESHOLD - from) / (to - from);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (EASING.inOut(mid) < target) lo = mid;
    else hi = mid;
  }
  return Math.round(hi * ms);
}

/*
 * Choreography: 1 s idle at the top, a sweeping arc from the lower left onto the page, the wheel
 * scrolls 168 px in 900 ms (the header compacts the moment the page passes 24 px), a pause to read
 * with the compact header, the wheel scrolls back to the top in 800 ms (the header expands as it
 * crosses 24 px again), then the cursor sweeps back to rest.
 */
const b = script({ cursor: REST, tracks: { scroll: 0, compact: 0 } })
  .wait(1000)
  .moveTo(OVER_PAGE, 620, { curve: 0.28 })
  .wait(120);
const down = b.now;
b.tween("scroll", DEPTH, SCROLL_DOWN, { ease: "inOut", advance: true });
b.tween("compact", 1, COMPACT_IN, { at: down + crossing(0, DEPTH, SCROLL_DOWN), ease: "out" });
b.wait(300).mark("compact").wait(400);
const up = b.now;
b.tween("scroll", 0, SCROLL_UP, { ease: "inOut", advance: true });
b.tween("compact", 0, COMPACT_OUT, { at: up + crossing(DEPTH, 0, SCROLL_UP), ease: "in" });
b.wait(Math.max(0, up + crossing(DEPTH, 0, SCROLL_UP) + COMPACT_OUT - b.now) + 60).moveTo(REST, 640, { curve: -0.2 });

export const timeline = b.build();
/** Static preview: scrolled, compact header with its shadow. */
export const poster = timeline.marks.compact!;

const lerp = (a: number, z: number, k: number) => a + (z - a) * k;
const pad = STAGE.pad;
const cardW = (STAGE.pageW - pad * 2 - 24) / 3;

/** A section below the template's stat tiles, so the page has somewhere to scroll to. */
function MoreContent() {
  return (
    <>
      <Bar x={pad} y={348} w={56} h={8} tone="strong" />
      <Bar x={pad} y={364} w={236} h={14} tone="title" />
      <Bar x={pad} y={386} w={300} h={8} tone="base" />
      {[0, 1, 2].map((i) => (
        <Block key={i} x={pad + i * (cardW + 12)} y={410} w={cardW} h={110} r={10}>
          <Avatar x={14} y={14} size={24} tone={i === 1 ? "strong" : "title"} />
          <Bar x={14} y={52} w={84 + (i % 2) * 20} h={8} tone="title" />
          <Bar x={14} y={68} w={128} h={6} tone="base" />
          <Bar x={14} y={80} w={96 - (i % 2) * 18} h={6} tone="base" />
        </Block>
      ))}
    </>
  );
}

export default function ShrinkingHeaderScene({ frame }: SceneProps) {
  const { scroll = 0, compact = 0 } = frame.v;
  const h = lerp(HEADER.tall, HEADER.compact, compact);
  const logo = lerp(20, 14, compact);
  const brandW = lerp(52, 44, compact);
  const btnH = lerp(26, 22, compact);
  const btnW = lerp(76, 70, compact);
  const mid = (size: number) => (h - size) / 2;
  // The scrollbar thumb: viewport over content height, travelling with the offset.
  const thumbH = (STAGE.pageH / CONTENT_H) * (STAGE.pageH - 8);
  const thumbY = 4 + (scroll / (CONTENT_H - STAGE.pageH)) * (STAGE.pageH - 8 - thumbH);
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.pageW, height: CONTENT_H, transform: `translateY(${-scroll}px)` }}>
        <LANDING.Page />
        <MoreContent />
      </div>
      {/* The header redrawn over the template's own header row; its height is reserved, so nothing below it moves. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.pageW, height: h, background: "var(--mk-window)" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: h - 1, height: 1, background: "var(--mk-wire)", opacity: compact }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: h, height: 14, background: "linear-gradient(rgb(20 24 33 / 0.10), rgb(20 24 33 / 0))", opacity: compact }} />
        <Avatar x={pad} y={mid(logo)} size={logo} tone="strong" />
        <Bar x={pad + logo + 8} y={mid(8)} w={brandW} h={8} tone="strong" />
        <Bar x={372} y={mid(8)} w={32} h={8} tone="title" />
        <Bar x={414} y={mid(8)} w={32} h={8} tone="title" />
        <Button x={STAGE.pageW - pad - btnW} y={mid(btnH)} w={btnW} h={btnH} variant="secondary" r={8} />
      </div>
      <Bar x={STAGE.pageW - 7} y={thumbY} w={3} h={thumbH} tone="base" />
    </>
  );
}

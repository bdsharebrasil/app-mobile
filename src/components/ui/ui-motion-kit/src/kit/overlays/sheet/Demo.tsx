import { target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Bar, Block, Button, FEED, pct, type SceneProps } from "@/wireframe";
import { SHEET_MS } from "./timing";

/**
 * "Filters" side sheet on the feed template: a floating panel inset 8 px from the right edge of the
 * page, with a sort segment, three status checkboxes, tag chips and a Reset / Apply footer. The
 * cursor opens it from the feed's filter button, ticks one status, then presses the dimmed page to
 * dismiss it.
 */
const PANEL: Rect = { x: 216, y: 8, w: 336, h: 328 };
const INNER = {
  title: { x: 20, y: 22, w: 88, h: 12 },
  hint: { x: 20, y: 40, w: 148, h: 6 },
  close: { x: 296, y: 18, w: 20, h: 20 },
  sortLabel: { x: 20, y: 74, w: 44, h: 6 },
  sort: { x: 20, y: 88, w: 296, h: 28 },
  statusLabel: { x: 20, y: 132, w: 52, h: 6 },
  tagsLabel: { x: 20, y: 230, w: 36, h: 6 },
  reset: { x: 20, y: 290, w: 144, h: 30 },
  apply: { x: 172, y: 290, w: 144, h: 30 },
} satisfies Record<string, Rect>;

/** Status rows: checkbox box, label width, count width. Row 0 starts checked. */
const STATUS_Y = [146, 172, 198] as const;
const STATUS_W = [92, 116, 76] as const;
const box = (i: number): Rect => ({ x: 20, y: STATUS_Y[i]!, w: 16, h: 16 });
/** Tag chips (x, width). The second one is selected. */
const TAGS = [
  [20, 64],
  [92, 80],
  [180, 56],
  [244, 72],
] as const;

const inPanel = (r: Rect): Rect => ({ ...r, x: PANEL.x + r.x, y: PANEL.y + r.y });
/** The dimmed page left of the panel: pressing it dismisses the sheet. */
const OUTSIDE: Rect = { x: 0, y: 0, w: PANEL.x - 8, h: 344 };

/** Cursor rest point (stage px): over the lower feed rows, left of center. */
const REST = { x: 172, y: 300 };

/*
 * Choreography: 0.9 s idle over the feed; the cursor rises right to the filter button on a wide arc
 * and presses it; the sheet slides in from the right while the page dims; the cursor dips into the
 * panel and ticks the second status; it drifts left out of the panel onto the dimmed feed and
 * presses there; the sheet slides back out and the cursor settles at rest.
 */
const b = script({
  cursor: REST,
  tracks: { open: 0, hoverFilter: 0, pressFilter: 0, check: 0, pressCheck: 0, pressOutside: 0 },
})
  .wait(900)
  .moveTo(target(FEED.targets.filter, { fx: 0.5, fy: 0.6 }), 680, { curve: -0.22 })
  .tween("hoverFilter", 1, DURATION.fast)
  .wait(140)
  .press({ key: "pressFilter", anchor: "sheet-open" });

const opened = b.lastClick;
b.tween("open", 1, SHEET_MS.enter, { at: opened, ease: "out" })
  .tween("hoverFilter", 0, DURATION.fast, { at: opened })
  .wait(160)
  .moveTo(target(inPanel(box(1)), { fx: 0.55, fy: 0.55 }), 460, { curve: 0.18 })
  .wait(100)
  .press({ key: "pressCheck", anchor: "sheet-check" });

b.tween("check", 1, DURATION.fast, { at: b.lastClick, ease: "out" })
  .wait(120)
  .mark("checked")
  .wait(200)
  .moveTo(target(OUTSIDE, { fx: 0.62, fy: 0.42 }), 480, { curve: -0.12 })
  .wait(80)
  .press({ key: "pressOutside", anchor: "sheet-outside" });

const closed = b.lastClick;
b.tween("open", 0, SHEET_MS.exit, { at: closed, ease: "in" })
  .wait(SHEET_MS.exit)
  .set("check", 0)
  .moveTo(REST, 560, { curve: 0.16 });

export const timeline = b.build();

/** Open sheet with the second status just ticked: shown under reduced motion. */
export const poster = timeline.marks.checked ?? 0;

function Checkbox({ x, y, on }: { x: number; y: number; on: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 16,
        height: 16,
        borderRadius: 4,
        background: `color-mix(in srgb, var(--mk-accent) ${pct(on)}%, var(--mk-surface))`,
        boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, var(--mk-accent) ${pct(on)}%, var(--mk-wire-strong))`,
      }}
    >
      {on > 0 ? (
        <svg width={16} height={16} viewBox="0 0 16 16" style={{ position: "absolute", inset: 0, opacity: on }}>
          <path d="M4.5 8.2l2.3 2.3 4.7-4.9" fill="none" stroke="var(--mk-surface)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

export default function SheetScene({ frame }: SceneProps) {
  const { open, hoverFilter, pressFilter, check } = frame.v as Record<"open" | "hoverFilter" | "pressFilter" | "check", number>;
  const slide = lerp(PANEL.w + 16, 0, open);
  return (
    <>
      <FEED.Page state={{ filter: { hover: hoverFilter, press: pressFilter, anchor: "sheet-open" } }} />
      {open > 0 ? (
        <>
          <div style={{ position: "absolute", inset: 0, background: "var(--mk-scrim)", opacity: open }} />
          <div data-anchor="sheet-outside" style={{ position: "absolute", left: OUTSIDE.x, top: OUTSIDE.y, width: OUTSIDE.w, height: OUTSIDE.h }} />
          <div
            style={{
              position: "absolute",
              left: PANEL.x,
              top: PANEL.y,
              width: PANEL.w,
              height: PANEL.h,
              borderRadius: "var(--mk-r-overlay)",
              background: "var(--mk-surface)",
              boxShadow: "var(--mk-shadow-overlay)",
              transform: `translateX(${slide}px)`,
            }}
          >
            <Bar {...INNER.title} tone="strong" />
            <Bar {...INNER.hint} tone="base" />
            <Block {...INNER.close} r={6} tone="secondary">
              <Bar x={6} y={9} w={8} h={2} r={1} tone="strong" />
            </Block>
            <Block x={0} y={60} w={PANEL.w} h={1} r={0} tone="base" />

            <Bar {...INNER.sortLabel} tone="title" />
            <Block {...INNER.sort} r={8} tone="base">
              <Block x={3} y={3} w={96} h={22} r={6} tone="surface" style={{ boxShadow: "0 1px 2px rgb(10 12 16 / 0.12)" }}>
                <Bar x={28} y={8} w={40} h={6} tone="strong" />
              </Block>
              <Bar x={126} y={11} w={44} h={6} tone="strong" />
              <Bar x={226} y={11} w={36} h={6} tone="strong" />
            </Block>

            <Bar {...INNER.statusLabel} tone="title" />
            {STATUS_Y.map((y, i) => {
              const on = i === 0 ? 1 : i === 1 ? check : 0;
              return (
                <div key={y}>
                  <Checkbox x={20} y={y} on={on} />
                  {i === 1 ? <div data-anchor="sheet-check" style={{ position: "absolute", left: 14, top: y - 6, width: 28, height: 28 }} /> : null}
                  <Bar x={46} y={y + 4} w={STATUS_W[i]} h={8} tone="title" />
                  <Bar x={288} y={y + 5} w={28} h={6} tone="base" />
                </div>
              );
            })}

            <Bar {...INNER.tagsLabel} tone="title" />
            {TAGS.map(([x, w], i) => (
              <Block key={x} x={x} y={244} w={w} h={22} r={11} tone={i === 1 ? "strong" : "base"} />
            ))}

            <Block x={0} y={280} w={PANEL.w} h={1} r={0} tone="base" />
            <Button {...INNER.reset} variant="secondary">
              <Bar x={52} y={12} w={40} h={6} tone="strong" />
            </Button>
            <Button {...INNER.apply}>
              <Bar x={50} y={12} w={44} h={6} tone="surface" />
            </Button>
          </div>
        </>
      ) : null}
    </>
  );
}

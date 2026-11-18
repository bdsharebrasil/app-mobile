import { contains, target, type Rect } from "@/engine/geometry";
import { lerp, timeline as script } from "@/engine/timeline";
import { DURATION, STAGE } from "@/engine/tokens";
import { Bar, Block, LANDING, pct, type SceneProps } from "@/wireframe";
import { MENU_MS } from "./timing";

/**
 * Right-click menu on the landing template's third tile (a file card). The tile sits near the
 * bottom of the page, so the menu cannot open downward from the pointer: it is clamped and opens
 * upward, its bottom-left corner on the pointer. Rows: Open, Rename, Duplicate, a separator, Move
 * to, Delete. The row under the cursor highlights.
 */
const TILE = LANDING.targets.tile2;
/** Right-click point (page px) and the menu box it produces. */
const POINTER = { x: TILE.x + 56, y: TILE.y + 40 };
const ROW_H = 26;
const PAD = 5;
const SEP_H = 9;
/** Row tops inside the menu; -1 marks the separator. */
const ROWS = [0, 1, 2, -1, 3, 4] as const;
const LABEL_W = [36, 48, 56, 52, 40] as const;
const KEY_W = [0, 18, 22, 0, 18] as const;
const MENU_W = 156;
const MENU_H = PAD * 2 + ROW_H * 5 + SEP_H;
/** Opening downward would cross the page's bottom edge, so it flips up (clamped). */
const MENU: Rect = { x: POINTER.x, y: POINTER.y - MENU_H, w: MENU_W, h: MENU_H };
const rowTop = (i: number) => PAD + i * ROW_H + (i >= 3 ? SEP_H : 0);
const rowRect = (i: number): Rect => ({ x: MENU.x + 4, y: MENU.y + rowTop(i), w: MENU_W - 8, h: ROW_H });
/** The name line of the tile, which turns into an inline edit field after "Rename". */
const NAME: Rect = { x: TILE.x + 9, y: TILE.y + 40, w: 96, h: 20 };

/** Cursor rest point (stage px): on the hero copy, left. */
const REST = { x: 150, y: 212 };

/*
 * Choreography: idle on the hero; the cursor curves down to the file tile and right-clicks; the
 * tile shows its selection ring and the menu fades and scales up from its bottom-left corner. The
 * cursor climbs through the rows to Rename and clicks it; the menu fades out and the tile's name
 * turns into a selected inline edit field for a beat, then settles back as the cursor returns.
 */
const b = script({
  cursor: REST,
  tracks: { open: 0, select: 0, pressTile: 0, pressRename: 0, edit: 0 },
})
  .wait(800)
  .moveTo(target(TILE, { fx: 56 / TILE.w, fy: 40 / TILE.h }), 760, { curve: 0.18 })
  .wait(160)
  .press({ key: "pressTile", anchor: "ctx-target" });

const opened = b.lastClick;
b.tween("open", 1, MENU_MS.enter, { at: opened, ease: "out" })
  .tween("select", 1, DURATION.fast, { at: opened, ease: "out" })
  .wait(200)
  .moveTo(target(rowRect(1), { fx: 0.42, fy: 0.55 }), 520, { curve: -0.24 })
  .wait(140)
  .mark("rename")
  .press({ key: "pressRename", anchor: "ctx-rename" });

const picked = b.lastClick;
b.tween("open", 0, MENU_MS.exit, { at: picked, ease: "in" })
  .tween("edit", 1, DURATION.fast, { at: picked + MENU_MS.exit, ease: "out" })
  .wait(MENU_MS.exit + 260)
  .moveTo(REST, 680, { curve: 0.16 })
  .tween("edit", 0, DURATION.exit, { ease: "in" })
  .tween("select", 0, DURATION.exit, { ease: "in" })
  .wait(DURATION.exit);

export const timeline = b.build();

/** Menu open with the cursor on Rename: shown under reduced motion. */
export const poster = timeline.marks.rename ?? 0;

export default function ContextMenuScene({ frame }: SceneProps) {
  const { open, select, edit } = frame.v as Record<"open" | "select" | "pressTile" | "pressRename" | "edit", number>;
  const cursor = { x: frame.cursor.x, y: frame.cursor.y - STAGE.chromeH };
  const hovered = open > 0.5 ? [0, 1, 2, 3, 4].find((i) => contains(rowRect(i), cursor)) : undefined;
  const scale = lerp(0.98, 1, open);
  return (
    <>
      <LANDING.Page />
      <div
        data-anchor="ctx-target"
        style={{
          position: "absolute",
          left: TILE.x,
          top: TILE.y,
          width: TILE.w,
          height: TILE.h,
          borderRadius: 10,
          boxShadow: `inset 0 0 0 ${2 * select}px var(--mk-accent)`,
        }}
      />
      {edit > 0 ? (
        <div style={{ position: "absolute", left: NAME.x, top: NAME.y, width: NAME.w, height: NAME.h, opacity: edit }}>
          <Block x={0} y={0} w={NAME.w} h={NAME.h} r={6} tone="surface" style={{ boxShadow: "inset 0 0 0 1.5px var(--mk-accent)" }} />
          <Block x={5} y={5} w={70} h={10} r={2} tone="base" />
          <Bar x={5} y={6} w={64} h={8} tone="strong" />
          <Block x={77} y={4} w={2} h={12} r={1} tone="accent" />
        </div>
      ) : null}
      {open > 0 ? (
        <div
          style={{
            position: "absolute",
            left: MENU.x,
            top: MENU.y,
            width: MENU.w,
            height: MENU.h,
            borderRadius: 10,
            background: "var(--mk-surface)",
            boxShadow: "var(--mk-shadow-overlay)",
            opacity: open,
            transform: `scale(${scale})`,
            transformOrigin: "0 100%",
          }}
        >
          {ROWS.map((r, i) => {
            if (r === -1) return <Block key={i} x={10} y={rowTop(3) - SEP_H / 2 - 0.5} w={MENU_W - 20} h={1} r={0} tone="base" />;
            const top = rowTop(r);
            const on = hovered === r;
            return (
              <div key={i} data-anchor={r === 1 ? "ctx-rename" : undefined} style={{ position: "absolute", left: 4, top, width: MENU_W - 8, height: ROW_H }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: `color-mix(in srgb, var(--mk-panel) ${pct(on ? 1 : 0)}%, transparent)` }} />
                <Block x={8} y={7} w={12} h={12} r={3} tone={on ? "strong" : "title"} />
                <Bar x={28} y={10} w={LABEL_W[r]} h={6} tone={on ? "strong" : "title"} />
                {KEY_W[r] ? <Bar x={MENU_W - 8 - 10 - KEY_W[r]!} y={10} w={KEY_W[r]} h={6} tone="base" /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

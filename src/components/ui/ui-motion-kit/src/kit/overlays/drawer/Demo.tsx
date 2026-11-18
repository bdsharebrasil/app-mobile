import { target, type Rect } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { DURATION } from "@/engine/tokens";
import { Avatar, Bar, Block, MOBILE, PHONE, type SceneProps } from "@/wireframe";
import { DRAWER_MS, SETTLE_MS, springEase } from "./timing";

/**
 * "Share" bottom drawer inside the phone of the mobile template: grab handle, title, a row of four
 * round share targets and two option rows. It floats 10 px inside the phone edges with the overlay
 * radius, so it sits within the phone's rounded corners without a clip that copies them. Like the
 * real component, the scrim dims the whole page area.
 */
const INSET = 10;
/** Drawer box in phone px: from DRAWER_TOP down to INSET above the bottom edge. */
const DRAWER_TOP = 148;
const DRAWER_W = PHONE.w - INSET * 2;
const DRAWER_H = PHONE.h - INSET - DRAWER_TOP;
/**
 * A dragged or leaving drawer slides into a clip 6 px inside the phone with the overlay radius on
 * its bottom corners: that shape lies within the phone's rounded corners, and 4 px around the
 * drawer leave room for its shadow.
 */
const CLIP = 6;
const HANDLE = { x: DRAWER_W / 2 - 20, y: 8, w: 40, h: 5 };
/** The handle as a page-area box (padded to a touch target) for the cursor. */
const HANDLE_HIT: Rect = { x: PHONE.x + PHONE.w / 2 - 40, y: PHONE.y + DRAWER_TOP, w: 80, h: 22 };
/** A short tug that is let go (springs back), then a long pull that dismisses. */
const TUG_PX = 34;
const PULL_PX = 104;

/** Cursor rest point (stage px): on the page left of the phone, low. */
const REST = { x: 122, y: 296 };

/*
 * Choreography: idle beside the phone; the cursor sweeps right and up onto the floating action
 * button and presses it; the drawer rises from the bottom of the phone. The cursor climbs to the
 * handle and tugs it down a little: released short of the threshold, the drawer springs back
 * (critically damped, no bounce). It grabs the handle again and pulls further: past the
 * threshold, the drawer leaves downward and the cursor drifts back to rest.
 */
const b = script({
  cursor: REST,
  tracks: { open: 0, hoverFab: 0, pressFab: 0, tug: 0, pull: 0 },
})
  .wait(700)
  .moveTo(target(MOBILE.targets.fab, { fx: 0.5, fy: 0.55 }), 640, { curve: 0.24 })
  .tween("hoverFab", 1, DURATION.fast)
  .wait(120)
  .press({ key: "pressFab", anchor: "drawer-open" });

const opened = b.lastClick;
b.tween("open", 1, DRAWER_MS.enter, { at: opened, ease: "out" })
  .tween("hoverFab", 0, DURATION.fast, { at: opened })
  .wait(140)
  .moveTo(target(HANDLE_HIT, { fx: 0.5, fy: 0.45 }), 420, { curve: -0.2 })
  .wait(80)
  .mark("tug")
  .drag(target(HANDLE_HIT, { fx: 0.52, fy: 0.45 + TUG_PX / HANDLE_HIT.h }), 260, { key: "tug", ease: "out" });

// Let go short of the threshold: the drawer springs back while the pointer stays where it was.
const tugReleased = b.now - 130;
b.tween("tug", 0, SETTLE_MS, { at: tugReleased, ease: springEase })
  .wait(160)
  .moveTo(target(HANDLE_HIT, { fx: 0.5, fy: 0.45 }), 220, { curve: 0.3 })
  .wait(60)
  .mark("settled")
  .drag(target(HANDLE_HIT, { fx: 0.46, fy: 0.45 + PULL_PX / HANDLE_HIT.h }), 300, { key: "pull", ease: "out" });

// Released past the threshold: the drawer continues down and out.
const pullReleased = b.now - 130;
b.tween("open", 0, DRAWER_MS.exit, { at: pullReleased, ease: "in" })
  .wait(DRAWER_MS.exit)
  .set("pull", 0)
  .moveTo(REST, 620, { curve: 0.2 });

export const timeline = b.build();

/** Drawer open and settled after the canceled tug, cursor back on the handle: shown under reduced motion. */
export const poster = timeline.marks.settled ?? 0;

export default function DrawerScene({ frame }: SceneProps) {
  const { open, hoverFab, pressFab, tug, pull } = frame.v as Record<"open" | "hoverFab" | "pressFab" | "tug" | "pull", number>;
  // Open: rise from below the phone. Dragged: follow the pointer. Dismissed from a pull: continue
  // from the dragged offset to fully hidden.
  const dragged = tug * TUG_PX + pull * PULL_PX;
  const offset = dragged * open + (1 - open) * (DRAWER_H + 12);
  const dim = open * (1 - (pull * PULL_PX) / DRAWER_H);
  return (
    <>
      <MOBILE.Page state={{ fab: { hover: hoverFab, press: pressFab, anchor: "drawer-open" } }} />
      {open > 0 ? (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: 560, height: 344, background: "var(--mk-scrim)", opacity: Math.max(0, dim) }} />
          <div
            style={{
              position: "absolute",
              left: PHONE.x + CLIP,
              top: PHONE.y,
              width: PHONE.w - CLIP * 2,
              height: PHONE.h - CLIP,
              borderRadius: "0 0 var(--mk-r-overlay) var(--mk-r-overlay)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: INSET - CLIP,
                top: DRAWER_TOP,
                width: DRAWER_W,
                height: DRAWER_H,
                borderRadius: "var(--mk-r-overlay)",
                background: "var(--mk-surface)",
                boxShadow: "var(--mk-shadow-overlay)",
                transform: `translateY(${offset}px)`,
              }}
            >
              <div data-anchor="drawer-handle" style={{ position: "absolute", left: DRAWER_W / 2 - 40, top: 0, width: 80, height: 22 }} />
              <Bar {...HANDLE} r={3} tone="strong" />
              <Bar x={12} y={26} w={60} h={9} tone="strong" />
              <Bar x={12} y={41} w={96} h={5} tone="base" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Avatar x={12 + i * 34} y={58} size={28} tone={i === 0 ? "strong" : "title"} />
                  <Bar x={14 + i * 34} y={91} w={24} h={4} tone="base" />
                </div>
              ))}
              <Block x={12} y={104} w={DRAWER_W - 24} h={1} r={0} tone="base" />
              {[0, 1].map((i) => (
                <div key={i}>
                  <Block x={12} y={114 + i * 18} w={12} h={12} r={4} tone="base" />
                  <Bar x={32} y={118 + i * 18} w={[72, 56][i]} h={5} tone="title" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

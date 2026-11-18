import type { Rect } from "@/engine/geometry";
import { pageToStage, target } from "@/engine/geometry";
import { timeline as script } from "@/engine/timeline";
import { EASING, STAGE } from "@/engine/tokens";
import { Bar, Block, MOBILE, PHONE, pct, type SceneProps } from "@/wireframe";

/**
 * The mobile template's phone with a hamburger button in place of its avatar. A tap opens the
 * navigation panel, which drops from under the header while its three link groups arrive 20 ms
 * apart and the icon's strokes turn into an X; the cursor drifts down over a link, then taps the X
 * and the panel lifts away. A long rising arc from outside the phone, unlike the rail hops of
 * collapsible-sidebar.
 */
const ENTER = 240;
const EXIT = 180;
const STAGGER = 20;
const ICON = 200;
/** Linear span of the `links` track: the last group starts 2 x 20 ms after the first. */
const LINKS_SPAN = ENTER + 2 * STAGGER;

/** Header button and panel, in phone-local px. */
const BTN = { x: 130, y: 28, w: 28, h: 28 } as const;
const PANEL = { y: 58, h: 240 } as const;
const inPhone = (r: Rect): Rect => ({ x: PHONE.x + r.x, y: PHONE.y + r.y, w: r.w, h: r.h });
/** The link the cursor rests on while the menu is open (second group, first row). */
const HOVERED: Rect = { x: 8, y: PANEL.y + 124, w: 156, h: 32 };

/** Cursor rest point (stage px): left of the phone, low. */
const REST = pageToStage({ x: 132, y: 286 });

/*
 * Choreography: 1 s idle, a long rising arc to the hamburger and a tap (panel in 240 ms ease-out,
 * groups 20 ms apart, icon morph 200 ms), a short drop onto a link that highlights on hover, back
 * up to the X and a tap (panel out in 180 ms ease-in, icon back to three strokes), then the arc
 * back to rest.
 */
const b = script({ cursor: REST, tracks: { panel: 0, links: 0, icon: 0, hover: 0, press: 0 } })
  .wait(1000)
  .moveTo(target(inPhone(BTN), { fx: 0.5, fy: 0.55 }), 680, { curve: -0.22 })
  .wait(80)
  .press({ key: "press", anchor: "menu" });
b.tween("panel", 1, ENTER, { at: b.lastClick, ease: "out" });
b.tween("links", 1, LINKS_SPAN, { at: b.lastClick, ease: "linear" });
b.tween("icon", 1, ICON, { at: b.lastClick, ease: "out" });
b.mark("open")
  .wait(260)
  .moveTo(target(inPhone(HOVERED), { fx: 0.32, fy: 0.5 }), 400, { curve: 0.12 })
  .tween("hover", 1, 120, { ease: "out" });
b.wait(520)
  .tween("hover", 0, 120, { ease: "in" })
  .moveTo(target(inPhone(BTN), { fx: 0.5, fy: 0.5 }), 420, { curve: 0.1 })
  .wait(80)
  .press({ key: "press", anchor: "menu" });
b.tween("panel", 0, EXIT, { at: b.lastClick, ease: "in" });
b.tween("links", 0, EXIT, { at: b.lastClick, ease: "linear" });
b.tween("icon", 0, ICON, { at: b.lastClick, ease: "in" });
b.wait(200).moveTo(REST, 560, { curve: 0.2 });

export const timeline = b.build();
/** Static preview: menu open with a link highlighted. */
export const poster = timeline.marks.open! + 1000;

/** Progress of link group `i` (0..2) for a `links` track value: the same 240 ms ease-out, 20 ms apart. */
export function groupProgress(links: number, i: number) {
  const t = (links * LINKS_SPAN - i * STAGGER) / ENTER;
  return EASING.out(Math.min(1, Math.max(0, t)));
}

/** Three strokes that turn into an X: outer strokes rotate 45 degrees onto the centre, the middle one fades. */
function MenuIcon({ k }: { k: number }) {
  const line = (y: number, rot: number, opacity = 1) => (
    <div
      style={{
        position: "absolute",
        left: 7,
        top: y,
        width: 14,
        height: 2,
        borderRadius: 1,
        background: "var(--mk-wire-strong)",
        opacity,
        transform: `translateY(${(13 - y) * k}px) rotate(${rot * k}deg)`,
      }}
    />
  );
  return (
    <>
      {line(8, 45)}
      {line(13, 0, 1 - k)}
      {line(18, -45)}
    </>
  );
}

const GROUP0 = [64, 80, 56] as const;
const GROUP1 = [72, 48] as const;

export default function HamburgerMenuScene({ frame }: SceneProps) {
  const { panel = 0, links = 0, icon = 0, hover = 0, press = 0 } = frame.v;
  const g = [0, 1, 2].map((i) => groupProgress(links, i));
  const group = (i: number) => ({ opacity: g[i], transform: `translateY(${-8 * (1 - g[i]!)}px)` });
  return (
    <>
      <MOBILE.Page />
      {/* Scrim over the whole page area, as the live backdrop covers its whole frame. The panel and the
          button are drawn above it, so the phone needs no rounded clip of its own. */}
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.pageW, height: STAGE.pageH, background: "var(--mk-scrim)", opacity: panel }} />
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, width: PHONE.w, height: PHONE.h }}>
        {/* The panel drops from under the header; its bottom corners stay inside the phone's. */}
        <div style={{ position: "absolute", left: 0, top: PANEL.y, right: 0, height: PANEL.h + 16, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: PHONE.w,
              height: PANEL.h,
              background: "var(--mk-surface)",
              borderRadius: "0 0 var(--mk-r-overlay) var(--mk-r-overlay)",
              boxShadow: "inset 0 1px 0 var(--mk-wire), 0 10px 18px -10px rgb(10 12 16 / 0.35)",
              opacity: panel,
              transform: `translateY(${-12 * (1 - panel)}px)`,
            }}
          >
            <div style={{ position: "absolute", left: 0, top: 16, width: PHONE.w, height: 96, ...group(0) }}>
              {GROUP0.map((w, i) => (
                <div key={i} style={{ position: "absolute", left: 8, top: i * 32, width: 156, height: 32, borderRadius: 8, background: i === 0 ? "var(--mk-panel)" : undefined }}>
                  <Block x={12} y={10} w={12} h={12} r={3} tone={i === 0 ? "strong" : "title"} />
                  <Bar x={34} y={12} w={w} h={8} tone={i === 0 ? "strong" : "title"} />
                </div>
              ))}
            </div>
            <Block x={16} y={118} w={140} h={1} r={0} tone="base" style={{ opacity: g[1] }} />
            <div style={{ position: "absolute", left: 0, top: 124, width: PHONE.w, height: 64, ...group(1) }}>
              {GROUP1.map((w, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: i * 32,
                    width: 156,
                    height: 32,
                    borderRadius: 8,
                    background: i === 0 ? `color-mix(in srgb, var(--mk-panel) ${pct(hover)}%, transparent)` : undefined,
                  }}
                >
                  <Bar x={12} y={13} w={w} h={6} tone="title" />
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", left: 16, top: 196, width: 140, height: 28, borderRadius: 8, background: "var(--mk-accent)", ...group(2) }}>
              <Bar x={46} y={11} w={48} h={6} tone="surface" />
            </div>
          </div>
        </div>
        {/* Hamburger button over the template's avatar. */}
        <div
          data-anchor="menu"
          style={{
            position: "absolute",
            left: BTN.x,
            top: BTN.y,
            width: BTN.w,
            height: BTN.h,
            borderRadius: 8,
            background: "var(--mk-surface)",
            boxShadow: "inset 0 0 0 1px var(--mk-wire)",
            transform: press ? `scale(${1 - 0.06 * press})` : undefined,
          }}
        >
          <MenuIcon k={icon} />
        </div>
      </div>
    </>
  );
}

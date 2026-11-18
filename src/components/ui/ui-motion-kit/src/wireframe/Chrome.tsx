import type { CSSProperties, ReactNode } from "react";
import { STAGE } from "@/engine/tokens";

/** Chrome layout in stage px: three small dots, a left-aligned address field, two tool squares. */
const CHROME = {
  dots: [18, 31, 44],
  dot: 8,
  url: { x: 64, y: 8, w: 216, h: 20, r: 6 },
  tools: [512, 530],
  tool: 12,
} as const;

const abs = (left: number, top: number, w: number, h: number, extra: CSSProperties): CSSProperties => ({
  position: "absolute",
  left,
  top,
  width: w,
  height: h,
  ...extra,
});

/** Mini browser title bar, drawn on our own 4 px grid. */
export function Chrome() {
  const mid = STAGE.chromeH / 2;
  return (
    <div
      style={{
        position: "relative",
        height: STAGE.chromeH,
        borderBottom: "1px solid var(--mk-chrome-divider)",
        boxSizing: "border-box",
        background: "var(--mk-chrome)",
      }}
    >
      {CHROME.dots.map((cx) => (
        <span key={cx} style={abs(cx - CHROME.dot / 2, mid - CHROME.dot / 2, CHROME.dot, CHROME.dot, { borderRadius: "50%", background: "var(--mk-chrome-dot)" })} />
      ))}
      <span style={abs(CHROME.url.x, CHROME.url.y, CHROME.url.w, CHROME.url.h, { borderRadius: CHROME.url.r, background: "var(--mk-url)" })}>
        <span style={abs(9, (CHROME.url.h - 6) / 2, 6, 6, { borderRadius: "50%", background: "var(--mk-url-mark)" })} />
      </span>
      {CHROME.tools.map((x) => (
        <span key={x} style={abs(x, mid - CHROME.tool / 2, CHROME.tool, CHROME.tool, { borderRadius: 3, background: "var(--mk-chrome-dot)", opacity: 0.7 })} />
      ))}
    </div>
  );
}

/** The window: border, radius, shadow, chrome on top and a clipped page area below. */
export function Window({ children }: { children?: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: STAGE.w,
        height: STAGE.windowH,
        borderRadius: "var(--mk-r-window)",
        background: "var(--mk-window)",
        boxShadow: "var(--mk-shadow-window), 0 0 0 1px var(--mk-window-border)",
        overflow: "hidden",
      }}
    >
      <Chrome />
      <div data-page style={{ position: "relative", width: STAGE.pageW, height: STAGE.pageH, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

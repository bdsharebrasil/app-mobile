import type { CursorState } from "@/engine/timeline";

/** Hotspot (arrow tip) inside the SVG, in px. */
export const CURSOR_HOTSPOT = { x: 2, y: 2 } as const;

/**
 * Our own pointer artwork: a slim arrow with a rounded, separated tail, dark fill and a white
 * outline (about 25 px tip to tail). Positioned so the tip sits exactly on (x, y) in stage space;
 * press scaling happens around the tip.
 */
const ARROW =
  "M2 2 L2 21.5 L6.9 17.3 L10.4 25.4 C10.7 26.1 11.5 26.4 12.2 26.1 L13.6 25.5 C14.3 25.2 14.6 24.4 14.3 23.7 L10.9 15.8 L17.4 15.8 Z";

export function Cursor({ cursor }: { cursor: CursorState }) {
  return (
    <svg
      data-cursor
      width={22}
      height={30}
      viewBox="0 0 22 30"
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate(${cursor.x - CURSOR_HOTSPOT.x}px, ${cursor.y - CURSOR_HOTSPOT.y}px) scale(${cursor.scale})`,
        transformOrigin: `${CURSOR_HOTSPOT.x}px ${CURSOR_HOTSPOT.y}px`,
        overflow: "visible",
        pointerEvents: "none",
        filter: "drop-shadow(0 1.5px 2px rgb(10 12 16 / 0.26))",
        zIndex: 10,
      }}
    >
      <path d={ARROW} fill="var(--mk-cursor-fill)" stroke="var(--mk-cursor-stroke)" strokeWidth={2.4} strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

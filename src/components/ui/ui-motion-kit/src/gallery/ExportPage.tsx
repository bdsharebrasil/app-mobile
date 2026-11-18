import type { Piece } from "@/kit/registry";
import { DemoPlayer } from "./DemoPlayer";

/**
 * Export canvas: 1280 x 800 viewport, the card at 1.5x (`?scale=1` gives native stage size), driven only
 * by window.__motionKit.seek().
 */
export const EXPORT = { width: 1280, height: 800, scale: 1.5 } as const;

function scaleFromUrl() {
  const raw = Number(new URLSearchParams(window.location.search).get("scale"));
  return Number.isFinite(raw) && raw > 0 && raw <= 3 ? raw : EXPORT.scale;
}

export function ExportPage({ piece }: { piece: Piece }) {
  const scale = scaleFromUrl();
  return (
    <main
      data-export={piece.meta.slug}
      style={{
        width: EXPORT.width,
        height: EXPORT.height,
        display: "grid",
        placeItems: "center",
        background: "var(--mk-canvas)",
        overflow: "hidden",
      }}
    >
      <h1 className="sr-only-kit">{piece.meta.name} demo export</h1>
      <DemoPlayer piece={piece} scale={scale} paused expose />
    </main>
  );
}

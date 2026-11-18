import { STAGE } from "./tokens";
import type { Point } from "./timeline";

/** Axis-aligned box in px. Page boxes are relative to the page area (below the chrome). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Convert a page-area point to stage coordinates (the cursor lives in stage space). */
export function pageToStage(p: Point): Point {
  return { x: p.x, y: p.y + STAGE.chromeH };
}

/** Center of a box. */
export function centerOf(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/**
 * Stage-space cursor target inside a page-area box. Defaults to the center; `fy` biases the
 * point down the box (a real pointer usually lands a little below the middle of a button).
 */
export function target(r: Rect, { fx = 0.5, fy = 0.5 }: { fx?: number; fy?: number } = {}): Point {
  return pageToStage({ x: r.x + r.w * fx, y: r.y + r.h * fy });
}

/** Box centered inside the page area. */
export function centeredInPage(w: number, h: number): Rect {
  return { x: (STAGE.pageW - w) / 2, y: (STAGE.pageH - h) / 2, w, h };
}

/** True when `p` lies inside `r` (edges inclusive). */
export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

import type { ComponentType } from "react";
import type { Rect } from "@/engine/geometry";

/** Live state of one named target, driven by a piece's timeline tracks (numbers are 0..1). */
export interface TargetState {
  hover?: number;
  press?: number;
  /** Toggles, tabs, selected rows: how "on" the target is. */
  on?: number;
  /** data-anchor name, so the e2e suite can check the cursor lands on it. */
  anchor?: string;
}

export type TemplateState<K extends string> = Partial<Record<K, TargetState>>;

/**
 * A shared page wireframe that pieces draw on. `targets` are the named, interactive boxes (in
 * page-area px) a piece can aim the cursor at, animate, or attach an overlay to; `Page` draws the
 * whole page and applies `state` to those targets.
 */
export interface PageTemplate<K extends string = string> {
  id: string;
  name: string;
  /** Which kinds of pieces it suits. Shown on /templates and in CONTRIBUTING.md. */
  use: string;
  targets: Readonly<Record<K, Rect>>;
  Page: ComponentType<{ state?: TemplateState<K> }>;
}

export function defineTemplate<K extends string>(template: PageTemplate<K>): PageTemplate<K> {
  return template;
}

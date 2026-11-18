import type { ComponentType } from "react";
import type { Timeline } from "@/engine/timeline";
import type { SceneProps } from "@/wireframe";

export const FAMILIES = [
  "overlays",
  "feedback",
  "navigation",
  "inputs",
  "content",
  "micro-interactions",
  "transitions",
] as const;

export type Family = (typeof FAMILIES)[number];

export interface TimingPhase {
  /** e.g. "enter", "exit", "press". */
  phase: string;
  ms: number;
  /** CSS easing string. */
  easing: string;
}

/** The meta sheet of a piece (meta.ts). Shown on /kit/<slug>. */
export interface PieceMeta {
  /** URL id, must equal the folder name. */
  slug: string;
  /** Display name, sentence case. Also the card label. */
  name: string;
  /** Must equal the parent folder name. */
  family: Family;
  /** One sentence: what it is. */
  summary: string;
  whenToUse: string[];
  avoidWhen: string[];
  /** The exact term to say to Claude/Codex to get this pattern. */
  promptTerm: string;
  /** A ready-to-paste instruction using the term. */
  promptExample: string;
  /** Other names people use for it. */
  aliases: string[];
  timing: TimingPhase[];
  /** Loop length of the demo in ms. */
  loopMs: number;
  /** Keyboard and screen-reader behavior of the real component. */
  a11y: string[];
  /** Third-party primitives the real component relies on (with license). */
  primitives: string[];
  status: "draft" | "ready";
}

export function defineMeta(meta: PieceMeta): PieceMeta {
  return meta;
}

/** Demo.tsx contract: a built timeline plus a pure scene. */
export interface DemoModule {
  timeline: Timeline;
  /** Time shown when motion is reduced and in static previews (the pattern's key state). */
  poster?: number;
  default: ComponentType<SceneProps>;
}

/** Component.tsx contract: the real component plus a playground for the kit page. */
export interface ComponentModule {
  Playground: ComponentType;
}

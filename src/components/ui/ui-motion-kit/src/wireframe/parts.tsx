import type { CSSProperties, ReactNode } from "react";
import type { Rect } from "@/engine/geometry";

/**
 * Wireframe building blocks for demo scenes. Everything is decorative (scenes are aria-hidden),
 * sized in stage px and colored only through tokens. Pass a `Rect` to place a part absolutely
 * inside the page area; omit it to use the part in normal flow (inside Row, for example).
 */

export type Tone = "strong" | "title" | "base" | "panel" | "accent" | "secondary" | "surface";

export const TONE: Record<Tone, string> = {
  strong: "var(--mk-wire-strong)",
  title: "var(--mk-wire-title)",
  base: "var(--mk-wire)",
  panel: "var(--mk-panel)",
  accent: "var(--mk-accent)",
  secondary: "var(--mk-secondary)",
  surface: "var(--mk-surface)",
};

type Place = Partial<Rect>;

function place(p: Place, style?: CSSProperties): CSSProperties {
  const absolute = p.x !== undefined || p.y !== undefined;
  return {
    position: absolute ? "absolute" : "relative",
    left: p.x,
    top: p.y,
    width: p.w,
    height: p.h,
    flex: "none",
    ...style,
  };
}

/** Rounded text placeholder. Radius defaults to half the height, capped at 4 px (kit spec). */
export function Bar({ tone = "base", r, style, ...p }: Place & { tone?: Tone; r?: number; style?: CSSProperties }) {
  const radius = r ?? Math.min((p.h ?? 8) / 2, 4);
  return <div style={place(p, { background: TONE[tone], borderRadius: radius, ...style })} />;
}

/** Panel / card placeholder. */
export function Block({
  tone = "panel",
  r = 10,
  style,
  children,
  ...p
}: Place & { tone?: Tone; r?: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={place(p, { background: TONE[tone], borderRadius: r, ...style })}>{children}</div>;
}

/** Circle placeholder. */
export function Avatar({
  size = 28,
  tone = "title",
  style,
  children,
  ...p
}: Omit<Place, "w" | "h"> & { size?: number; tone?: Tone; style?: CSSProperties; children?: ReactNode }) {
  return <div style={place({ ...p, w: size, h: size }, { background: TONE[tone], borderRadius: "50%", ...style })}>{children}</div>;
}

/** Horizontal group with a gap. */
export function Row({
  gap = 10,
  align = "center",
  style,
  children,
  ...p
}: Place & { gap?: number; align?: CSSProperties["alignItems"]; style?: CSSProperties; children?: ReactNode }) {
  return <div style={place(p, { display: "flex", gap, alignItems: align, ...style })}>{children}</div>;
}

/** 0..1 track value as a rounded percentage for color-mix(). */
export function pct(v: number): number {
  return Math.round(Math.min(Math.max(v, 0), 1) * 1000) / 10;
}

/** Switch placeholder. `on` (0..1) slides the knob and fills the track with the accent. */
export function Toggle({ on = 0, anchor, style, ...p }: Place & { on?: number; anchor?: string; style?: CSSProperties }) {
  const w = p.w ?? 36;
  const h = p.h ?? 20;
  const knob = h - 4;
  return (
    <div
      data-anchor={anchor}
      style={place({ ...p, w, h }, {
        borderRadius: h / 2,
        background: `color-mix(in srgb, var(--mk-accent) ${pct(on)}%, var(--mk-wire-strong))`,
        ...style,
      })}
    >
      <div
        style={{
          position: "absolute",
          left: 2 + Math.min(Math.max(on, 0), 1) * (w - h),
          top: 2,
          width: knob,
          height: knob,
          borderRadius: "50%",
          background: "var(--mk-surface)",
          boxShadow: "0 1px 2px rgb(10 12 16 / 0.18)",
        }}
      />
    </div>
  );
}

/**
 * Outlined input placeholder. `focus` (0..1) darkens the outline and grows a soft ring, the way the
 * real inputs show focus. Children are drawn inside (placeholder bars, typed text, caret).
 */
export function Field({
  focus = 0,
  anchor,
  r = 8,
  style,
  children,
  ...p
}: Place & { focus?: number; anchor?: string; r?: number; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div
      data-anchor={anchor}
      style={place(p, {
        borderRadius: r,
        background: "var(--mk-surface)",
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, var(--mk-accent) ${pct(focus)}%, var(--mk-wire-strong)), 0 0 0 ${3 * Math.min(Math.max(focus, 0), 1)}px color-mix(in srgb, var(--mk-accent) 14%, transparent)`,
        ...style,
      })}
    >
      {children}
    </div>
  );
}

/**
 * Wireframe button with hover and press states driven by timeline tracks (0..1).
 * `anchor` sets data-anchor so tests can check the cursor lands on it.
 */
export function Button({
  variant = "primary",
  hover = 0,
  press = 0,
  anchor,
  r = 8,
  style,
  children,
  ...p
}: Place & {
  variant?: "primary" | "secondary";
  hover?: number;
  press?: number;
  anchor?: string;
  r?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const base = variant === "primary" ? "var(--mk-accent)" : "var(--mk-secondary)";
  const over = variant === "primary" ? "var(--mk-wf-accent-hover)" : "var(--mk-secondary-hover)";
  const mix = pct(hover);
  return (
    <div
      data-anchor={anchor}
      style={place(p, {
        background: mix > 0 ? `color-mix(in srgb, ${over} ${mix}%, ${base})` : base,
        borderRadius: r,
        transform: press > 0 ? `scale(${1 - 0.04 * press})` : undefined,
        ...style,
      })}
    >
      {children}
    </div>
  );
}

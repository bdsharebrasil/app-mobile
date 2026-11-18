import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type Ref } from "react";
import type { Frame } from "@/engine/timeline";
import { STAGE, STAGE_H } from "@/engine/tokens";
import { Window } from "./Chrome";
import { Cursor } from "./Cursor";

export interface SceneProps {
  frame: Frame;
}

export interface DemoFrameProps {
  Scene: ComponentType<SceneProps>;
  frame: Frame;
  label: string;
  /** Render the label pill (cards) or not (kit page shows the name as a heading). */
  showLabel?: boolean;
}

/**
 * One frame of a demo card in stage px (STAGE.w x STAGE_H): window with the scene, the cursor, and
 * the label pill. Pure: same frame in, same markup out (the seamless-loop test relies on it).
 */
export function DemoFrame({ Scene, frame, label, showLabel = true }: DemoFrameProps) {
  return (
    <div style={{ position: "relative", width: STAGE.w, height: showLabel ? STAGE_H : STAGE.windowH }}>
      <div aria-hidden="true">
        <Window>
          <Scene frame={frame} />
        </Window>
        <Cursor cursor={frame.cursor} />
      </div>
      {showLabel ? <LabelPill>{label}</LabelPill> : null}
    </div>
  );
}

export function LabelPill({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: STAGE.windowH + STAGE.labelGap, display: "flex", justifyContent: "center" }}>
      <span
        data-label
        style={{
          display: "inline-flex",
          alignItems: "center",
          height: STAGE.labelH,
          padding: "0 22px",
          borderRadius: "var(--mk-r-pill)",
          background: "var(--mk-label-bg)",
          color: "var(--mk-label-fg)",
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * Scales stage-px content to the available width. `scale` fixes the factor (export, SSR);
 * otherwise a ResizeObserver fits it to the container.
 */
export function Stage({
  children,
  scale: fixed,
  height = STAGE_H,
  ref: outerRef,
}: {
  children: ReactNode;
  scale?: number;
  height?: number;
  ref?: Ref<HTMLDivElement>;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (fixed !== undefined || !box.current) return;
    const el = box.current;
    const update = () => setMeasured(el.clientWidth / STAGE.w);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixed]);
  const scale = fixed ?? measured ?? 1;
  return (
    <div
      data-stage
      data-stage-width={STAGE.w}
      ref={(el) => {
        box.current = el;
        if (typeof outerRef === "function") outerRef(el);
        else if (outerRef) outerRef.current = el;
      }}
      style={{
        position: "relative",
        width: fixed !== undefined ? STAGE.w * fixed : "100%",
        aspectRatio: `${STAGE.w} / ${height}`,
        visibility: fixed === undefined && measured === null ? "hidden" : undefined,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 0, width: STAGE.w, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
}

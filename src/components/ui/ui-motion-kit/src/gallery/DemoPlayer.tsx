import { useRef, type ReactNode } from "react";
import { usePlayback, usePlayhead, type Playhead } from "@/engine/playhead";
import { STAGE, STAGE_H } from "@/engine/tokens";
import { DemoFrame, Stage } from "@/wireframe";
import type { Piece } from "@/kit/registry";

export interface DemoPlayerProps {
  piece: Piece;
  /** Fixed stage scale (export); otherwise fits the container width. */
  scale?: number;
  showLabel?: boolean;
  /** Local pause (kit page control). */
  paused?: boolean;
  /** Publish window.__motionKit for automation. */
  expose?: boolean;
  /** Receives the playhead so a parent can render controls. */
  children?: (playhead: Playhead) => ReactNode;
}

/** A demo card that plays its timeline in a seamless loop. */
export function DemoPlayer({ piece, scale, showLabel = true, paused, expose, children }: DemoPlayerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { reduced } = usePlayback();
  const { timeline, poster, default: Scene } = piece.demo;
  const playhead = usePlayhead({
    duration: timeline.duration,
    viewRef: ref,
    poster,
    paused,
    expose: expose ? piece.meta.slug : undefined,
    presses: timeline.presses,
  });
  const frame = timeline.evaluate(playhead.t, { reduced });
  return (
    <>
      <Stage ref={ref} scale={scale} height={showLabel ? STAGE_H : STAGE.windowH}>
        <DemoFrame Scene={Scene} frame={frame} label={piece.meta.name} showLabel={showLabel} />
      </Stage>
      {children?.(playhead)}
    </>
  );
}

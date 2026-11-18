import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "motion/react";
import type { PressEvent } from "./timeline";

/**
 * Playback for demo cards.
 *
 * - Every card owns a playhead in ms. It advances with requestAnimationFrame only while the card is
 *   on screen and playback is not paused, and wraps at the loop length.
 * - One global Pause/Play control (WCAG 2.2.2: loops longer than 5 s need a pause mechanism).
 * - Under prefers-reduced-motion nothing autoplays; cards show their poster frame instead.
 * - URL options: `?t=<ms>` freezes every card at that time; `?paused` starts paused.
 * - Automation: a card mounted with `expose` publishes `window.__motionKit` so the recorder and
 *   tests can seek to any time synchronously.
 */

export interface MotionKitHandle {
  slug: string;
  duration: number;
  /** Render the card at `t` ms. `wrap: false` keeps t = duration (used by the seamless-loop check). */
  seek(t: number, options?: { wrap?: boolean }): void;
  /** Scripted clicks, so tests can check the cursor lands on its anchor. */
  presses: readonly PressEvent[];
  /** Current playhead in ms. */
  now(): number;
  /** The demo's key-state frame (shown under reduced motion). */
  poster: number;
  ready: boolean;
}

declare global {
  interface Window {
    __motionKit?: MotionKitHandle;
  }
}

interface Playback {
  paused: boolean;
  setPaused(paused: boolean): void;
  /** Time from `?t=`, or null. */
  frozenT: number | null;
  reduced: boolean;
}

const PlaybackContext = createContext<Playback>({
  paused: false,
  setPaused: () => {},
  frozenT: null,
  reduced: false,
});

function readUrl() {
  if (typeof window === "undefined") return { t: null as number | null, paused: false };
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("t");
  const t = raw !== null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
  return { t, paused: params.has("paused") };
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion() ?? false;
  const [url] = useState(readUrl);
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const paused = userPaused ?? (reduced || url.paused || url.t !== null);
  const value = useMemo<Playback>(
    () => ({ paused, setPaused: setUserPaused, frozenT: url.t, reduced }),
    [paused, url.t, reduced],
  );
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback() {
  return useContext(PlaybackContext);
}

/** True while the element is at least partly in the viewport. */
export function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setInView(e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

export interface PlayheadOptions {
  duration: number;
  /** Element whose visibility gates playback. */
  viewRef: RefObject<Element | null>;
  /** Frame shown when playback is paused under reduced motion (usually the pattern's open state). */
  poster?: number;
  /** Local play/pause. When set it overrides the global control for this card. */
  paused?: boolean;
  /** Publish window.__motionKit for this card. */
  expose?: string;
  presses?: readonly PressEvent[];
}

const NO_PRESSES: readonly PressEvent[] = [];

export interface Playhead {
  t: number;
  playing: boolean;
  seek(t: number, options?: { wrap?: boolean }): void;
}

export function usePlayhead({ duration, viewRef, poster = 0, paused: localPaused, expose, presses = NO_PRESSES }: PlayheadOptions): Playhead {
  const playback = usePlayback();
  const inView = useInView(viewRef);
  const start = playback.frozenT ?? (playback.reduced ? poster : 0);
  const [t, setT] = useState(start);
  const tRef = useRef(start);
  const playing = !(localPaused ?? playback.paused) && inView;

  // When the reduced-motion preference resolves after mount, jump to the poster frame.
  useEffect(() => {
    if (playback.frozenT !== null || !playback.reduced) return;
    tRef.current = poster;
    setT(poster);
  }, [playback.reduced, playback.frozenT, poster]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        tRef.current = (tRef.current + (now - last)) % duration;
        setT(tRef.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);

  const seek = useCallback(
    (next: number, options: { wrap?: boolean } = {}) => {
      const wrap = options.wrap ?? true;
      const value = wrap ? ((next % duration) + duration) % duration : Math.min(Math.max(next, 0), duration);
      tRef.current = value;
      flushSync(() => setT(value));
    },
    [duration],
  );

  useEffect(() => {
    if (!expose) return;
    const handle: MotionKitHandle = { slug: expose, duration, seek, presses, poster, now: () => tRef.current, ready: true };
    window.__motionKit = handle;
    return () => {
      if (window.__motionKit === handle) delete window.__motionKit;
    };
  }, [expose, duration, seek, presses, poster]);

  return { t, playing, seek };
}

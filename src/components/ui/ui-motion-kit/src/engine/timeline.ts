import { DURATION, EASING, type EasingName } from "./tokens";

/**
 * Declarative demo timeline.
 *
 * A demo describes what the cursor does (wait, moveTo, hover, press, drag, type) and how named
 * numeric tracks change (tween, set). `build()` compiles the script into a pure function
 * `evaluate(t)` that returns the whole frame at time t. Nothing depends on wall-clock time, so any
 * frame can be rendered exactly (export, tests, scrubbing).
 *
 * Cursor steps advance the script head. Track steps (tween, set) start at the head and do not
 * advance it unless `advance: true`, so a cursor move and an overlay animation can overlap.
 *
 * Seamless loop rule: `build()` throws unless every track and the cursor end where they started,
 * which makes evaluate(0) and evaluate(duration) identical.
 */

export type Point = { x: number; y: number };
export type Ease = EasingName | ((p: number) => number);

export interface CursorState {
  x: number;
  y: number;
  /** 1 at rest, ~0.86 at the bottom of a press. */
  scale: number;
  /** True while the button is held (press or drag). */
  pressed: boolean;
}

export interface Frame {
  /** Time in ms the frame was evaluated at. */
  t: number;
  cursor: CursorState;
  /** Numeric tracks, e.g. `open` 0..1. Every track declared in `tracks` is always present. */
  v: Record<string, number>;
  /** Typed text per text track. */
  text: Record<string, string>;
}

export interface PressEvent {
  /** Time the button goes down. */
  at: number;
  /** Time the click fires (button released). */
  click: number;
  /** Stage point the cursor tip is on. */
  point: Point;
  /** `data-anchor` name of the element the press must land on (checked by the e2e suite). */
  anchor?: string;
}

export interface Timeline {
  duration: number;
  /** Pure frame at time t. `t` is clamped to [0, duration], never wrapped. */
  evaluate(t: number, options?: { reduced?: boolean }): Frame;
  presses: readonly PressEvent[];
  marks: Readonly<Record<string, number>>;
}

interface TrackSeg {
  start: number;
  end: number;
  from: number;
  to: number;
  ease: (p: number) => number;
}

interface MoveSeg {
  start: number;
  end: number;
  from: Point;
  to: Point;
  control: Point;
  ease: (p: number) => number;
}

interface PressSeg {
  start: number;
  down: number;
  hold: number;
  up: number;
}

/** Press anatomy in ms. The click fires at down + hold (button released). */
export const PRESS = { down: 90, hold: 50, up: 130, depth: 0.86 } as const;
const HOVER_FADE = DURATION.fast;

function resolveEase(e: Ease | undefined, fallback: EasingName): (p: number) => number {
  if (!e) return EASING[fallback];
  return typeof e === "function" ? e : EASING[e];
}

function clamp01(p: number) {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

function quad(a: number, c: number, b: number, p: number) {
  const q = 1 - p;
  return q * q * a + 2 * q * p * c + p * p * b;
}

/** Control point for a gentle arc: offset perpendicular to the segment by `curve * length`. */
function arcControl(from: Point, to: Point, curve: number): Point {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Perpendicular (rotated -90deg) so positive curve bows the path "up and over" for left-to-right moves.
  return { x: mx + dy * curve, y: my - dx * curve };
}

export interface TimelineOptions {
  /** Loop length in ms. Default 5000. */
  duration?: number;
  /** Cursor rest point (stage coordinates). The loop must end here. */
  cursor: Point;
  /** Numeric tracks and their initial (= final) values. */
  tracks?: Record<string, number>;
  /** Text tracks (typed strings) start empty. */
  textTracks?: string[];
}

export class TimelineBuilder {
  private head = 0;
  private cursorAt: Point;
  private readonly duration: number;
  private readonly start: Point;
  private readonly initial: Record<string, number>;
  private readonly segs: Record<string, TrackSeg[]> = {};
  private readonly moves: MoveSeg[] = [];
  private readonly pressSegs: PressSeg[] = [];
  private readonly pressEvents: PressEvent[] = [];
  private readonly markTimes: Record<string, number> = {};
  private readonly texts: Record<string, string> = {};

  constructor(options: TimelineOptions) {
    this.duration = options.duration ?? DURATION.loop;
    this.start = { ...options.cursor };
    this.cursorAt = { ...options.cursor };
    this.initial = { ...(options.tracks ?? {}) };
    for (const key of options.textTracks ?? []) {
      this.initial[`text:${key}`] = 0;
      this.texts[key] = "";
    }
    for (const key of Object.keys(this.initial)) this.segs[key] = [];
  }

  /** Current script time in ms. */
  get now() {
    return this.head;
  }

  /** Time the most recent press() fired its click (button released), for syncing the reaction. */
  get lastClick() {
    const last = this.pressEvents[this.pressEvents.length - 1];
    if (!last) throw new Error("lastClick read before any press()");
    return last.click;
  }

  /** Idle for `ms`. */
  wait(ms: number) {
    this.head += ms;
    return this;
  }

  /** Move the cursor tip to `to` along a curved path. `curve` 0 = straight, default 0.16. */
  moveTo(to: Point, ms: number, options: { curve?: number; ease?: Ease } = {}) {
    const from = { ...this.cursorAt };
    this.moves.push({
      start: this.head,
      end: this.head + ms,
      from,
      to: { ...to },
      control: arcControl(from, to, options.curve ?? 0.16),
      ease: resolveEase(options.ease, "cursor"),
    });
    this.cursorAt = { ...to };
    this.head += ms;
    return this;
  }

  /**
   * Click at the current cursor point. The click fires when the button is released
   * (head + 140 ms); the head advances 270 ms. If `key` is given, that track pulses 0 -> 1 -> 0
   * with the press so the pressed element can react. `anchor` names the `data-anchor` element the
   * press must land on.
   */
  press(options: { key?: string; anchor?: string } = {}) {
    const at = this.head;
    this.pressSegs.push({ start: at, down: PRESS.down, hold: PRESS.hold, up: PRESS.up });
    this.pressEvents.push({
      at,
      click: at + PRESS.down + PRESS.hold,
      point: { ...this.cursorAt },
      anchor: options.anchor,
    });
    if (options.key) {
      this.tween(options.key, 1, PRESS.down, { ease: "out" });
      this.tween(options.key, 0, PRESS.up, { ease: "out", at: at + PRESS.down + PRESS.hold });
    }
    this.head += PRESS.down + PRESS.hold + PRESS.up;
    return this;
  }

  /** Hover state on track `key` (0 -> 1), held for `ms`, then released (1 -> 0). */
  hover(key: string, ms: number) {
    this.tween(key, 1, HOVER_FADE, { ease: "out" });
    this.head += ms;
    this.tween(key, 0, HOVER_FADE, { ease: "out" });
    return this;
  }

  /**
   * Press, move to `to` while held, release. Track `key` (if given) goes 0 -> 1 with the drag
   * progress, so a dragged element can follow `frame.cursor` or interpolate on its own.
   */
  drag(to: Point, ms: number, options: { key?: string; curve?: number; ease?: Ease } = {}) {
    const at = this.head;
    const moveStart = at + PRESS.down;
    const from = { ...this.cursorAt };
    this.moves.push({
      start: moveStart,
      end: moveStart + ms,
      from,
      to: { ...to },
      control: arcControl(from, to, options.curve ?? 0),
      ease: resolveEase(options.ease, "inOut"),
    });
    if (options.key) this.tween(options.key, 1, ms, { ease: options.ease ?? "inOut", at: moveStart });
    this.pressSegs.push({ start: at, down: PRESS.down, hold: ms, up: PRESS.up });
    this.cursorAt = { ...to };
    this.head = moveStart + ms + PRESS.up;
    return this;
  }

  /** Type `text` into text track `key` over `ms` (linear, one character at a time). */
  type(key: string, text: string, ms: number) {
    const k = `text:${key}`;
    if (!(k in this.segs)) throw new Error(`Text track "${key}" is not declared in textTracks`);
    this.texts[key] = text;
    this.tween(k, text.length, ms, { ease: "linear", advance: true });
    return this;
  }

  /** Delete the typed text of `key` over `ms`. */
  erase(key: string, ms: number) {
    this.tween(`text:${key}`, 0, ms, { ease: "linear", advance: true });
    return this;
  }

  /** Animate track `key` to `to` over `ms`. Starts at the head (or `at`); does not advance unless `advance`. */
  tween(key: string, to: number, ms: number, options: { ease?: Ease; at?: number; advance?: boolean } = {}) {
    const list = this.segs[key];
    if (!list) throw new Error(`Track "${key}" is not declared in tracks`);
    const start = options.at ?? this.head;
    const last = list[list.length - 1];
    if (last && start < last.end) {
      throw new Error(`Track "${key}": tween at ${start} ms overlaps the previous one ending at ${last.end} ms`);
    }
    const from = last ? last.to : (this.initial[key] ?? 0);
    list.push({ start, end: start + ms, from, to, ease: resolveEase(options.ease, "out") });
    if (options.advance) this.head = start + ms;
    return this;
  }

  /** Jump track `key` to `value` at the head. */
  set(key: string, value: number) {
    return this.tween(key, value, 0);
  }

  /** Record the head time under `name` (exposed as `timeline.marks`). */
  mark(name: string) {
    this.markTimes[name] = this.head;
    return this;
  }

  build(): Timeline {
    const { duration, start, initial, segs, moves, pressSegs, texts } = this;
    const lastTrackEnd = Math.max(0, ...Object.values(segs).flatMap((l) => l.map((s) => s.end)));
    const lastMoveEnd = Math.max(0, ...moves.map((m) => m.end));
    const end = Math.max(this.head, lastTrackEnd, lastMoveEnd);
    if (end > duration) throw new Error(`Timeline runs to ${end} ms, longer than its ${duration} ms loop`);

    const problems: string[] = [];
    if (Math.hypot(this.cursorAt.x - start.x, this.cursorAt.y - start.y) > 0.001) {
      problems.push(`cursor ends at (${this.cursorAt.x}, ${this.cursorAt.y}), starts at (${start.x}, ${start.y})`);
    }
    for (const [key, list] of Object.entries(segs)) {
      const final = list.length ? list[list.length - 1]!.to : initial[key];
      if (final !== initial[key]) problems.push(`track "${key}" ends at ${final}, starts at ${initial[key]}`);
    }
    if (problems.length) throw new Error(`Timeline is not seamless: ${problems.join("; ")}`);

    const trackValue = (key: string, t: number, reduced: boolean) => {
      let value = initial[key] ?? 0;
      for (const s of segs[key] ?? []) {
        if (t < s.start) break;
        if (t >= s.end) {
          value = s.to;
          continue;
        }
        if (reduced) {
          // Reduced motion: state change only, switched at the segment midpoint.
          value = t >= (s.start + s.end) / 2 ? s.to : s.from;
        } else {
          const p = s.ease(clamp01((t - s.start) / (s.end - s.start)));
          value = s.from + (s.to - s.from) * p;
        }
        break;
      }
      return value;
    };

    const cursorPoint = (t: number, reduced: boolean): Point => {
      let p: Point = start;
      for (const m of moves) {
        if (t < m.start) break;
        if (t >= m.end) {
          p = m.to;
          continue;
        }
        if (reduced) {
          p = m.from; // jump at the end of the move, no travel
        } else {
          const k = m.ease(clamp01((t - m.start) / (m.end - m.start)));
          p = { x: quad(m.from.x, m.control.x, m.to.x, k), y: quad(m.from.y, m.control.y, m.to.y, k) };
        }
        break;
      }
      return p;
    };

    const cursorPress = (t: number, reduced: boolean) => {
      for (const s of pressSegs) {
        const downEnd = s.start + s.down;
        const holdEnd = downEnd + s.hold;
        const upEnd = holdEnd + s.up;
        if (t < s.start || t >= upEnd) continue;
        const pressed = t < holdEnd;
        if (reduced) return { scale: 1, pressed };
        if (t < downEnd) {
          const p = EASING.out((t - s.start) / s.down);
          return { scale: 1 + (PRESS.depth - 1) * p, pressed };
        }
        if (t < holdEnd) return { scale: PRESS.depth, pressed };
        const p = EASING.out((t - holdEnd) / s.up);
        return { scale: PRESS.depth + (1 - PRESS.depth) * p, pressed };
      }
      return { scale: 1, pressed: false };
    };

    const evaluate = (rawT: number, options: { reduced?: boolean } = {}): Frame => {
      const t = rawT < 0 ? 0 : rawT > duration ? duration : rawT;
      const reduced = options.reduced ?? false;
      const v: Record<string, number> = {};
      const text: Record<string, string> = {};
      for (const key of Object.keys(initial)) {
        const value = trackValue(key, t, reduced);
        if (key.startsWith("text:")) {
          const name = key.slice(5);
          text[name] = (texts[name] ?? "").slice(0, Math.floor(value + 1e-9));
        } else {
          v[key] = value;
        }
      }
      const point = cursorPoint(t, reduced);
      const press = cursorPress(t, reduced);
      return { t, cursor: { x: point.x, y: point.y, scale: press.scale, pressed: press.pressed }, v, text };
    };

    return {
      duration,
      evaluate,
      presses: this.pressEvents.map((p) => ({ ...p, point: { ...p.point } })),
      marks: { ...this.markTimes },
    };
  }
}

/** Start a demo script. See CONTRIBUTING.md "Timeline API". */
export function timeline(options: TimelineOptions) {
  return new TimelineBuilder(options);
}

/** Interpolate `from -> to` by a 0..1 track value. */
export function lerp(from: number, to: number, p: number) {
  return from + (to - from) * p;
}

/**
 * Slider timings: the value bubble fades in 180 ms ease-out and out
 * 120 ms ease-in; keyboard value changes ease over 180 ms; pointer drags follow the pointer directly.
 * 180 ms sits between the shared tokens (fast 120, enter 220), so it lives here as a named constant,
 * like toggle-switch/timing.ts.
 */
export const SLIDER_MS = { enter: 180, exit: 120 } as const;

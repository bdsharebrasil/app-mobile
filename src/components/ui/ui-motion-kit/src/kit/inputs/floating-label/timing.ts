/**
 * Floating-label timings: the label rises and shrinks (and the
 * border darkens) in 180 ms ease-out, and returns in 120 ms ease-in.
 * 180 ms sits between the shared tokens (fast 120, enter 220), so it lives here as a named constant.
 */
export const FLOAT_MS = { enter: 180, exit: 120 } as const;

/** Floated label scale: 16 px text becomes 12 px, the smallest size the kit allows. */
export const FLOAT_SCALE = 0.75;

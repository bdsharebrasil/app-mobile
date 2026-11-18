/**
 * Command palette timings: enter 220 ms ease-out (fade with
 * 12 px travel from above), exit 150 ms ease-in. Enter matches DURATION.enter; exit 150 has no
 * shared token (exit is 160), so both live here as named constants for one source.
 */
export const PALETTE_MS = { enter: 220, exit: 150 } as const;
/** Travel from above on enter and exit. */
export const PALETTE_TRAVEL = 12;

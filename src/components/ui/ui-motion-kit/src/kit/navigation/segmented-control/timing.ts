/**
 * Segmented control timings: the thumb and the checked
 * label move 200 ms ease-out, deselected emphasis fades 120 ms ease-in, no spring (a click-driven
 * control; springs are kept for drag). The content below re-scopes with the same pair: the old
 * content fades out 120 ms ease-in and the new one fades in 200 ms ease-out, 40 ms later so the two
 * barely overlap. 200 sits between the shared tokens (fast 120, enter 220), so it lives here.
 */
export const THUMB_MS = 200;
export const LABEL_EXIT_MS = 120;
export const CONTENT_EXIT_MS = 120;
export const CONTENT_ENTER_MS = 200;
export const CONTENT_ENTER_DELAY = 40;

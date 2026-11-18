import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "like-burst",
  "name": "Like burst",
  "family": "micro-interactions",
  "summary": "A toggle reaction with restrained celebratory decoration and a synchronized count.",
  "whenToUse": [
    "Like or favorite an item with immediate reversible feedback.",
    "Visually emphasize a positive reaction; use button-press for non-toggle actions."
  ],
  "avoidWhen": [
    "High-impact confirmation: use alert-dialog.",
    "An unrelated completion result: use success-check."
  ],
  "promptTerm": "like toggle with particle burst",
  "promptExample": "Use the \u201clike toggle with particle burst\u201d pattern to build a heart toggle button with aria-pressed, a restrained fill-and-scale emphasis, a small clipped particle burst, and a correctly synchronized count announcement.",
  "aliases": [
    "Like burst",
    "Favorite animation",
    "Reaction burst"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 220,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 140,
      "easing": "cubic-bezier(0.4,0,1,1)"
    },
    {
      "phase": "reduced-motion",
      "ms": 0,
      "easing": "linear"
    }
  ],
  "loopMs": 5000,
  "a11y": [
    "Use a named button with aria-pressed for the actual liked state; Enter/Space activate.",
    "Keep the label stable and make the current count readable; announce meaningful count/state changes politely, not particle frames.",
    "Decorative particles are aria-hidden, nonfocusable, and cannot intercept pointer events.",
    "Reconcile optimistic counts with server results and expose failures without silently retaining a false state.",
    "Reduced motion: Set heart fill and count in 0 ms; omit particle movement, scaling, and rolling digits."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

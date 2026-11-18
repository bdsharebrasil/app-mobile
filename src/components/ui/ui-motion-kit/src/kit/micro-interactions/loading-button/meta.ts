import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "loading-button",
  "name": "Loading button",
  "family": "micro-interactions",
  "summary": "An action button that communicates pending work and its eventual result.",
  "whenToUse": [
    "Show that a submitted action is running and prevent duplicate submissions.",
    "Display spinner then success in the same control; use spinner for passive standalone loading."
  ],
  "avoidWhen": [
    "Long jobs requiring measured completion: use progress-bar.",
    "A persistent on/off setting: use toggle-switch."
  ],
  "promptTerm": "asynchronous loading button",
  "promptExample": "Use the \u201casynchronous loading button\u201d pattern to build a submit button that fades its label to a spinner, smoothly adjusts width, blocks repeat activation while busy, shows a success check, and restores its label with announced status.",
  "aliases": [
    "Loading button",
    "Pending button",
    "Async action button"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 200,
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
    "Maintain a stable accessible action name and expose aria-busy while work runs.",
    "Disable repeat activation while loading; if using aria-disabled to preserve focus, guard pointer, keyboard, and submit handlers.",
    "Announce pending/success/error through a separate polite status region that is not suppressed by the busy button.",
    "Keep focus stable; on failure restore activation and provide a persistent, actionable error.",
    "Reduced motion: Swap label/spinner/check and final width in 0 ms; static loading mark instead of rotation."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

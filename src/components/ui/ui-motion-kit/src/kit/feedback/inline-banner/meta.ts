import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "inline-banner",
  "name": "Inline banner",
  "family": "feedback",
  "summary": "A persistent contextual message that occupies space within the page.",
  "whenToUse": [
    "Explain a page-wide warning, error, or informational state.",
    "Keep a message visible until dismissed; use toast for transient confirmation."
  ],
  "avoidWhen": [
    "A single field's validation error: use validation-shake with linked text.",
    "A blocking decision: use alert-dialog."
  ],
  "promptTerm": "dismissible inline status banner",
  "promptExample": "Use the \u201cdismissible inline status banner\u201d pattern to build an inline info/success/warning/error banner that expands above the content, pushes layout down, and collapses through a named dismiss button.",
  "aliases": [
    "Inline banner",
    "Inline alert"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 220,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 160,
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
    "Choose role=status for advisory updates and role=alert only for genuinely urgent messages, not solely from the color variant.",
    "Keep a clear heading/message and a named dismiss button; do not move focus on appearance.",
    "If dismiss removes the focused button, move focus to a sensible nearby control.",
    "Do not convey severity through color alone; include text or a labeled icon.",
    "Reduced motion: Insert/remove at full height immediately (0 ms); no layout tween or fade."
  ],
  "primitives": [
    "Native status/alert region + button",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

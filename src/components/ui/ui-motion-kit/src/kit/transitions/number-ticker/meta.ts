import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "number-ticker",
  "name": "Number ticker",
  "family": "transitions",
  "summary": "A numeric value that counts or rolls visually while exposing one stable accessible result.",
  "whenToUse": [
    "Emphasize a real KPI update without hiding its final value.",
    "Compare successive totals with tabular digits; use progress-bar for completion percentage of a task."
  ],
  "avoidWhen": [
    "Rapid financial/operational values where animation obscures reading: update directly.",
    "A user's exact numeric input: use slider or a normal field."
  ],
  "promptTerm": "accessible animated number ticker",
  "promptExample": "Use the \u201caccessible animated number ticker\u201d pattern to build a tabular-digit KPI ticker that counts up or rolls digits on genuine value changes, exposes the final formatted value to screen readers, and jumps directly under reduced motion.",
  "aliases": [
    "Number ticker",
    "Count-up animation",
    "Rolling-digit counter"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 240,
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
    "Keep one final formatted value in the accessibility tree; mark animated intermediate digit layers aria-hidden.",
    "Use tabular numerals and reserve enough width to prevent layout jumps.",
    "Include the metric name and units; do not communicate sign or direction through color alone.",
    "Do not make a passive KPI focusable; announce only important changes with a throttled polite status, never every counting frame.",
    "Reduced motion: Render the final formatted value immediately (0 ms); no counting, rolling, or fading."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

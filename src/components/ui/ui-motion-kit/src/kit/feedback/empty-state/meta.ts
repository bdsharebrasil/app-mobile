import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "empty-state",
  "name": "Empty state",
  "family": "feedback",
  "summary": "A clear explanation and next action when a content region has no items.",
  "whenToUse": [
    "Explain a newly empty list after deletion.",
    "Guide a first-use or no-results state; use skeleton while loading is not yet finished."
  ],
  "avoidWhen": [
    "An ongoing request with no result yet: use spinner or skeleton.",
    "An urgent page error: use inline-banner."
  ],
  "promptTerm": "empty state with call to action",
  "promptExample": "Use the \u201cempty state with call to action\u201d pattern to build an empty-list state with an original wireframe icon, a title, explanatory text, and a primary action entering in a calm stagger.",
  "aliases": [
    "Empty state",
    "No-results state",
    "Empty"
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
    "Use a real heading, explanatory paragraph, and clearly named action; no special widget role is needed.",
    "Decorative wireframe artwork is aria-hidden.",
    "Announce a dynamic no-results change politely without reading the whole layout repeatedly.",
    "If deletion removed the focused row, move focus to a surviving control or the empty-state action.",
    "Reduced motion: Show/hide all elements immediately (0 ms); no travel, floating, or stagger."
  ],
  "primitives": [
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "spinner",
  "name": "Spinner",
  "family": "feedback",
  "summary": "A compact activity indicator for work whose completion percentage is unknown.",
  "whenToUse": [
    "Indicate a pending button action or a small standalone loading region.",
    "Communicate activity when no numeric estimate exists; use progress-bar for measured work."
  ],
  "avoidWhen": [
    "Loading a layout whose shape can be reserved: use skeleton.",
    "An operation that needs its full disabled/status lifecycle: use loading-button."
  ],
  "promptTerm": "loading spinner",
  "promptExample": "Use the \u201cloading spinner\u201d pattern to build a reusable SVG ring spinner in several sizes with an accessible Loading label, a button variant, and a static reduced-motion state.",
  "aliases": [
    "Spinner",
    "Loading indicator"
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
    "Provide one role=status/aria-live=polite message or accessible Loading label, not duplicate announcements.",
    "Hide the decorative SVG from assistive technology when equivalent status text exists.",
    "Keep keyboard focus stable; a spinner itself is not focusable.",
    "Reserve icon space and retain an understandable action name when used inside a button.",
    "Reduced motion: Static ring and \u201cLoading\u2026\u201d text, 0 ms transitions; no rotation or pulse."
  ],
  "primitives": [
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "pull-to-refresh",
  "name": "Pull to refresh",
  "family": "transitions",
  "summary": "A top-of-list drag gesture that requests fresh content after a threshold.",
  "whenToUse": [
    "Refresh a mobile collection while retaining its browsing context.",
    "Provide direct resistance and release feedback; use infinite-scroll to append older items rather than replace data."
  ],
  "avoidWhen": [
    "The only refresh route for keyboard or assistive-technology users: include a visible button.",
    "Gestures that dismiss an overlay: use drawer."
  ],
  "promptTerm": "pull-to-refresh with button fallback",
  "promptExample": "Use the \u201cpull-to-refresh with button fallback\u201d pattern to build an original pull-to-refresh list with top-edge detection, drag resistance, a configurable release threshold, pending indicator, visible Refresh button, and polite completion/error announcements.",
  "aliases": [
    "Pull to refresh",
    "Pull-down refresh",
    "Refresh gesture"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 240,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 180,
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
    "Provide a named keyboard-operable Refresh button; do not require a drag or special ARIA gesture role.",
    "Only arm at the scroll container's top and avoid stealing ordinary vertical scrolling or browser gestures.",
    "Mark the list busy while refreshing; politely announce refresh completion, unchanged data, or retryable failure.",
    "Preserve focus and scroll context; prevent overlapping refresh requests and always offer recovery from failure.",
    "Reduced motion: Use static pending text; finish/retract in 0 ms. Direct user gesture tracking remains optional; Refresh button provides a movement-free route."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

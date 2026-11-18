import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "scroll-reveal",
  "name": "Scroll reveal",
  "family": "transitions",
  "summary": "A nonessential entrance effect for content entering the viewport.",
  "whenToUse": [
    "Introduce a section with restrained fade-and-rise emphasis.",
    "Coordinate a few related blocks; use shared-element for continuity between distinct views."
  ],
  "avoidWhen": [
    "Hiding important content until an observer runs: render it normally first.",
    "Turning scrolling into navigation movement: use shrinking-header for header behavior."
  ],
  "promptTerm": "progressively enhanced scroll reveal",
  "promptExample": "Use the \u201cprogressively enhanced scroll reveal\u201d pattern to build an IntersectionObserver scroll reveal with a small upward fade, capped stagger, once/repeat options, visible content without JavaScript, and an immediate reduced-motion state.",
  "aliases": [
    "Scroll reveal",
    "Viewport entrance",
    "Scroll-triggered reveal"
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
    "Keep semantic headings/content in DOM and visible if JavaScript or observation fails.",
    "Do not add widget roles or live regions to decorative reveals.",
    "Never leave a focused element invisible; bypass/reset the effect when focus enters its section.",
    "Honor prefers-reduced-motion before hiding any content and avoid visual/reading-order mismatches.",
    "Reduced motion: All content visible in final positions at 0 ms; no fade, travel, stagger, or repeat reset."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "shared-element",
  "name": "Shared element",
  "family": "transitions",
  "summary": "A route transition that visually connects the same object across two views.",
  "whenToUse": [
    "Connect a list thumbnail to its detail-page header.",
    "Preserve orientation during navigation; use card-expand when details remain in a modal on the same route."
  ],
  "avoidWhen": [
    "Unrelated sections with no shared object: use scroll-reveal or a simple state change.",
    "Image-only overlay inspection: use image-lightbox."
  ],
  "promptTerm": "route-level shared-element transition",
  "promptExample": "Use the \u201croute-level shared-element transition\u201d pattern to build a list-to-detail shared-element route transition where a thumbnail grows into the page header and reverses on Back, with an immediate no-animation fallback.",
  "aliases": [
    "Shared-element transition",
    "Shared-layout route transition",
    "Hero transition"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 260,
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
    "Keep real navigable links and meaningful document/page headings; navigation must work without the effect.",
    "After forward navigation focus the new heading; on Back restore a sensible source focus and scroll position.",
    "Only one meaningful copy of the shared object belongs in the accessibility tree; animated duplicates are decorative.",
    "Never delay readable content, browser Back, or keyboard operation while waiting for animation.",
    "Reduced motion: Navigate and display the final destination in 0 ms; disable geometric and crossfade effects."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

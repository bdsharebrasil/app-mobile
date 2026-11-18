import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { SLIDER_MS } from "./timing";

export default defineMeta({
  slug: "slider",
  name: "Slider",
  family: "inputs",
  summary: "A draggable numeric input with a value thumb and filled track.",
  whenToUse: [
    "Adjust a continuous or stepped value while seeing immediate feedback.",
    "Offer a bounded range; use floating-label with an exact numeric input when typing precision matters.",
  ],
  avoidWhen: [
    "A binary setting: use toggle-switch.",
    "Progress that the user cannot control: use progress-bar.",
  ],
  promptTerm: "accessible value slider",
  promptExample:
    "Use the “accessible value slider” pattern to build a labeled slider with a thumb-following value bubble, a filled track, arrow/PageUp/PageDown/Home/End keys, and optional two-thumb range selection. Pointer drags move the thumb directly; keyboard steps ease the thumb and fill over 180 ms ease-out; the bubble fades in 180 ms ease-out on hover, drag or focus and out 120 ms ease-in; reduced motion changes everything at once.",
  aliases: ["Slider", "Range slider"],
  timing: [
    { phase: "enter (bubble fades in; keyboard step eases thumb and fill)", ms: SLIDER_MS.enter, easing: easingCss("out") },
    { phase: "exit (bubble fades out)", ms: SLIDER_MS.exit, easing: easingCss("in") },
    { phase: "pointer drag (thumb follows the pointer directly)", ms: 0, easing: "linear" },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Each thumb has role=slider, a meaningful label, min/max/current values, and readable aria-valuetext when units need explanation.",
    "Arrows change one step; PageUp/PageDown larger steps; Home/End reach allowed bounds.",
    "Keep a visible focus indicator; distinguish and name both endpoints in range mode.",
    "Do not announce every animation frame; preserve valid bounds and usable touch targets.",
    "Reduced motion: Update value and geometry directly (0 ms); no eased thumb travel or bubble fade.",
  ],
  primitives: ["@base-ui/react 1.9.0 Slider (MIT), behind src/primitives/slider.tsx; CSS transitions in slider.css"],
  status: "ready",
});

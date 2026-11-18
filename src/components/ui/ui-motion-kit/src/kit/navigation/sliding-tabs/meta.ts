import { DURATION, easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "sliding-tabs",
  name: "Sliding tabs",
  family: "navigation",
  summary: "A tabbed view whose active indicator moves while the associated panel changes.",
  whenToUse: [
    "Switch related panels within the same page context.",
    "Give each panel a meaningful tab label; use segmented-control for a single setting rather than panels.",
  ],
  avoidWhen: [
    "Separate page destinations needing URL navigation: use pagination or collapsible-sidebar.",
    "Sections that should remain independently open: use accordion.",
  ],
  promptTerm: "tabs with sliding active indicator",
  promptExample:
    "Use the “tabs with sliding active indicator” pattern to build accessible tabs with a shared-layout active pill moving from tab one to three, crossfading panels, arrow-key focus, and configurable manual or automatic activation. Move the pill in 220 ms ease-out, fade the leaving panel out in 160 ms ease-in and the entering panel in over 220 ms; under reduced motion the pill jumps and the panels swap with no fade.",
  aliases: ["Sliding tabs", "Animated tabs", "Tabs"],
  timing: [
    { phase: "enter (pill slides to the new tab, entering panel fades in)", ms: DURATION.enter, easing: easingCss("out") },
    { phase: "exit (leaving panel fades out)", ms: DURATION.exit, easing: easingCss("in") },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Use tablist, tab, and tabpanel roles with selected state and linked IDs.",
    "Roving tabindex: arrows move focus; Home/End reach first/last tab.",
    "Manual mode uses Enter/Space to activate; automatic mode is suitable only when panels appear without noticeable delay.",
    "Hide inactive panels from interaction and keep a visible focus indicator separate from selection.",
    "Reduced motion: Place indicator and switch panels immediately (0 ms); no travel or crossfade.",
  ],
  primitives: [
    "@base-ui/react 1.9.0 Tabs (MIT), through src/primitives/tabs.tsx",
    "motion 14.8.0 shared layout, layoutId (MIT)",
  ],
  status: "ready",
});

import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "accordion",
  name: "Accordion",
  family: "navigation",
  summary: "A stack of disclosure headings that expand and collapse associated sections.",
  whenToUse: [
    "Reveal secondary explanations without showing every paragraph at once.",
    "Support single or multiple open sections; use sliding-tabs for mutually exclusive peer panels.",
  ],
  avoidWhen: [
    "Content that people must compare simultaneously: keep it visible or use sortable-table.",
    "A temporary contextual overlay: use popover.",
  ],
  promptTerm: "animated accordion",
  promptExample:
    "Use the “animated accordion” pattern to build a single/multiple accordion with heading buttons, animated auto-height panels, rotating chevrons, and accessible expanded-state relationships.",
  aliases: ["Accordion", "Grouped disclosures"],
  timing: [
    { phase: "enter", ms: 240, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
    { phase: "exit", ms: 180, easing: "cubic-bezier(0.4,0,1,1)" },
    { phase: "reduced-motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Use a button inside each heading with aria-expanded and aria-controls.",
    "Enter/Space toggles the focused heading; keep normal Tab navigation through visible controls.",
    "Use labeled regions when useful, avoiding an excessive number of landmarks.",
    "Collapsed content must not remain focusable; if programmatic collapse hides focus, return it to that section's heading.",
    "Reduced motion: Expand/collapse to final height in 0 ms; chevron changes position without rotation animation.",
  ],
  primitives: ["@base-ui/react 1.9.0 Accordion (MIT)"],
  status: "ready",
});

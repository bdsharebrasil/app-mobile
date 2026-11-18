import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "collapsible-sidebar",
  name: "Collapsible sidebar",
  family: "navigation",
  summary: "A persistent navigation panel that contracts into an icon rail.",
  whenToUse: ["Keep primary application destinations within reach on desktop.", "Save horizontal room without losing navigation; use hamburger-menu for a temporary mobile overlay."],
  avoidWhen: ["A modal filter/edit task: use sheet.", "A small set of contextual commands: use dropdown-menu."],
  promptTerm: "collapsible navigation sidebar",
  promptExample: "Use the “collapsible navigation sidebar” pattern to build a persistent sidebar that collapses to an icon rail, fades labels, shows tooltips on hover/focus, stores the preference, and supports a configurable keyboard shortcut.",
  aliases: ["Collapsible sidebar", "Icon-rail sidebar", "Sidebar"],
  timing: [{"phase": "enter", "ms": 240, "easing": "cubic-bezier(0.2,0.8,0.2,1)"}, {"phase": "exit", "ms": 180, "easing": "cubic-bezier(0.4,0,1,1)"}, {"phase": "reduced-motion", "ms": 0, "easing": "linear"}],
  loopMs: 5000,
  a11y: ["Use a named nav landmark with real destination links; preserve accessible names when visible labels disappear.", "The collapse button exposes aria-expanded and aria-controls; collapsed rail links remain keyboard reachable.", "Show explanatory tooltips on focus as well as hover, without making them the only link names.", "Document the shortcut and avoid firing it while typing; restore saved state without moving focus.", "Reduced motion: Change width and labels in 0 ms; tooltips reveal without travel."],
  primitives: ["@base-ui/react 1.9.0 Tooltip (MIT)", "motion 14.8.0 (MIT)"],
  status: "ready",
});

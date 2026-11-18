import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "hamburger-menu",
  name: "Hamburger menu",
  family: "navigation",
  summary: "A compact navigation trigger that opens a temporary full mobile menu.",
  whenToUse: ["Present primary navigation when a mobile viewport cannot fit a sidebar.", "Keep the page available after dismissal; use collapsible-sidebar for persistent desktop navigation."],
  avoidWhen: ["A small contextual command list: use dropdown-menu.", "A filter or edit task rather than navigation: use sheet."],
  promptTerm: "modal mobile navigation menu",
  promptExample: "Use the “modal mobile navigation menu” pattern to build a mobile hamburger button that morphs into a close icon and opens a modal navigation panel with staggered links, focus trapping, Escape, and scroll lock.",
  aliases: ["Hamburger menu", "Mobile navigation overlay", "Off-canvas navigation"],
  timing: [{"phase": "enter", "ms": 240, "easing": "cubic-bezier(0.2,0.8,0.2,1)"}, {"phase": "exit", "ms": 180, "easing": "cubic-bezier(0.4,0,1,1)"}, {"phase": "reduced-motion", "ms": 0, "easing": "linear"}],
  loopMs: 5000,
  a11y: ["Use a named dialog containing a named nav landmark and ordinary links, not role=menu.", "Name the toggle Open navigation/Close navigation and expose aria-expanded plus the controlled panel.", "Move focus inside, trap Tab, make background inert, and lock body scroll.", "Escape closes and returns focus; after destination navigation, focus the new page heading instead.", "Reduced motion: Open/close panel and swap icons in 0 ms; show links together without stagger."],
  primitives: ["@base-ui/react 1.9.0 Dialog (MIT)", "motion 14.8.0 (MIT)"],
  status: "ready",
});

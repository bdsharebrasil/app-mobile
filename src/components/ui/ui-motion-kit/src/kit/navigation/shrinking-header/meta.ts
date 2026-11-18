import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "shrinking-header",
  name: "Shrinking header",
  family: "navigation",
  summary: "A page header that becomes more compact after a scroll threshold.",
  whenToUse: ["Recover reading space while retaining important navigation.", "Optionally hide on downward scroll and reveal on upward scroll; use collapsible-sidebar for lateral navigation."],
  avoidWhen: ["A purely decorative entrance unrelated to scroll state: use scroll-reveal.", "Repeatedly relocating essential actions during a task: use a stable hamburger-menu or sidebar."],
  promptTerm: "scroll-responsive shrinking header",
  promptExample: "Use the “scroll-responsive shrinking header” pattern to build a threshold-based shrinking header that scales its logo, adds a shadow, optionally hides down/reveals up, and reserves layout space to avoid jumps.",
  aliases: ["Shrinking header", "Compact sticky header", "Auto-hiding header"],
  timing: [{"phase": "enter", "ms": 220, "easing": "cubic-bezier(0.2,0.8,0.2,1)"}, {"phase": "exit", "ms": 160, "easing": "cubic-bezier(0.4,0,1,1)"}, {"phase": "reduced-motion", "ms": 0, "easing": "linear"}],
  loopMs: 5000,
  a11y: ["Retain header/nav landmarks, link names, visible focus, and a skip-to-content link.", "Never hide the header while it contains keyboard focus; reveal it before focusing a contained target.", "Reserve layout height and account for the sticky offset when scrolling headings into view.", "No focus movement or live announcements on every scroll threshold crossing.", "Reduced motion: Switch size/shadow immediately (0 ms); disable optional hide/show travel and keep navigation visible."],
  primitives: ["motion 14.8.0 (MIT)"],
  status: "ready",
});

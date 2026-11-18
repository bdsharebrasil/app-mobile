import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { SHEET_MS } from "./timing";

export default defineMeta({
  slug: "sheet",
  name: "Sheet",
  family: "overlays",
  summary: "A modal side panel that keeps the originating page visible behind a backdrop.",
  whenToUse: [
    "Edit filters or inspect details that need a taller workspace.",
    "Retain visual context during a focused task; use modal for a compact centered prompt.",
  ],
  avoidWhen: [
    "Persistent navigation alongside usable page content: use collapsible-sidebar.",
    "A bottom panel with drag-to-dismiss: use drawer.",
  ],
  promptTerm: "side sheet",
  promptExample:
    "Use the “side sheet” pattern to build a right-side modal sheet with a dimmed backdrop, filter checkboxes, focus trapping, Escape/outside-click dismissal, and configurable left/right/top/bottom placement.",
  aliases: ["Side sheet", "Side panel", "Sheet"],
  timing: [
    { phase: "enter (slide from the edge, backdrop fade)", ms: SHEET_MS.enter, easing: easingCss("out") },
    { phase: "exit (slide back to the edge)", ms: SHEET_MS.exit, easing: easingCss("in") },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Named role=dialog with aria-modal=true; move focus inside and trap Tab/Shift+Tab.",
    "Make the background inert, lock its scroll, and retain a visible close control.",
    "Escape or backdrop click closes; restore focus to the filter trigger.",
    "Keep labels associated with controls and ensure the entire panel remains reachable at narrow sizes.",
    "Reduced motion: Open/close at the final edge position in 0 ms; no slide or animated backdrop.",
  ],
  primitives: ["@base-ui/react 1.9.0 Dialog (MIT), behind src/primitives/dialog.tsx", "motion 14.8.0 (MIT)"],
  status: "ready",
});

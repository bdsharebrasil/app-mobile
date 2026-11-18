import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "toast",
  name: "Toast",
  family: "feedback",
  summary: "A short, nonblocking notification that appears separately from the page content.",
  whenToUse: [
    "Confirm a save or another completed background action.",
    "Offer a brief Undo alongside feedback; use inline-banner for information that must remain visible."
  ],
  avoidWhen: [
    "Critical errors requiring immediate resolution: use alert-dialog.",
    "Field-specific errors: use validation-shake with persistent error text."
  ],
  promptTerm: "stacking toast notification",
  promptExample: "Use the “stacking toast notification” pattern to confirm saved preferences in a top-left notification queue, with Undo, auto-dismiss progress, pause on hover/focus, and swipe-to-dismiss. Enter in 220 ms and exit in 160 ms; remove movement for reduced motion.",
  aliases: [
    "Toast",
    "Notification toast"
  ],
  timing: [
    {
      phase: "enter",
      ms: 220,
      easing: "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      phase: "exit",
      ms: 160,
      easing: "cubic-bezier(0.4,0,1,1)"
    },
    {
      phase: "reduced-motion",
      ms: 0,
      easing: "linear"
    }
  ],
  loopMs: 5000,
  "a11y": [
    "Announce ordinary notifications through one polite live region; do not steal focus.",
    "Action and dismiss controls need clear names and normal keyboard access.",
    "Pause dismissal on hover/focus; never remove the focused action; allow adequate time to act.",
    "Keep essential recovery available elsewhere after dismissal; swipe is an optional shortcut.",
    "Reduced motion: Show/remove/reposition in 0 ms; no slide, stack travel, or animated countdown."
  ],
  primitives: [
    "@base-ui/react 1.9.0 Toast (MIT)",
    "motion 14.8.0 (MIT)"
  ],
  status: "ready"
});

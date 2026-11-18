import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "stepper",
  name: "Stepper",
  family: "navigation",
  summary: "An ordered progress indicator for a multi-step task.",
  whenToUse: [
    "Show current and completed stages in a guided form.",
    "Pair Back/Next with clear progress; use progress-bar for numeric task completion without steps.",
  ],
  avoidWhen: [
    "Unrelated page destinations: use collapsible-sidebar.",
    "Independent content panels with no task order: use sliding-tabs.",
  ],
  promptTerm: "multi-step progress stepper",
  promptExample:
    "Use the “multi-step progress stepper” pattern to build a horizontal/vertical stepper with Back and Next buttons, a completed-step check, and a connector line animating toward the current step.",
  aliases: ["Stepper", "Step indicator", "Wizard progress"],
  timing: [
    { phase: "enter", ms: 240, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
    { phase: "exit", ms: 150, easing: "cubic-bezier(0.4,0,1,1)" },
    { phase: "reduced-motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Use an ordered list with meaningful step names and aria-current=step on the current item.",
    "Back/Next are named buttons; only make step headings buttons when direct navigation is actually allowed.",
    "On stage change, move focus to the new stage heading or first field and announce progress.",
    "Expose validation before advancing; do not encode completion only with a colored connector.",
    "Reduced motion: Update current stage, connector, and check in 0 ms.",
  ],
  primitives: ["motion 14.8.0 (MIT)"],
  status: "ready",
});

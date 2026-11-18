import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "segmented-control",
  name: "Segmented control",
  family: "navigation",
  summary: "A compact mutually exclusive choice shown as adjacent segments.",
  whenToUse: [
    "Choose one view mode, sort mode, or other small single-value setting.",
    "Keep all options visible; use sliding-tabs if each option controls its own tabpanel.",
  ],
  avoidWhen: [
    "Independent on/off choices: use toggle-switch or checkbox-radio.",
    "A long or searchable list of choices: use combobox.",
  ],
  promptTerm: "single-select segmented control",
  promptExample:
    "Use the “single-select segmented control” pattern to build a controlled/uncontrolled radio-group segmented control (Day / Week / Month above a chart) whose selected thumb is one shared-layout element that slides 200 ms ease-out (no spring), with arrow-key selection and a visible keyboard focus ring; the deselected label fades in 120 ms, the content below crossfades (out 120 ms ease-in, in 200 ms ease-out), and reduced motion moves the thumb and swaps the content instantly.",
  aliases: ["Segmented control", "Segmented single-choice group", "Radio group"],
  timing: [
    { phase: "enter", ms: 200, easing: "cubic-bezier(0.2,0.8,0.2,1)" },
    { phase: "exit", ms: 120, easing: "cubic-bezier(0.4,0,1,1)" },
    { phase: "reduced-motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Name the radiogroup and each radio option; expose aria-checked through the primitive.",
    "Use one tab stop for the group; arrows move/select and Space selects the focused option.",
    "Do not use tab roles unless real tabpanels exist.",
    "Support controlled and uncontrolled state without losing focus on rerender.",
    "Reduced motion: Select and relocate the thumb in 0 ms and swap the content without a fade; keep focus indication and checked state.",
  ],
  primitives: ["@base-ui/react 1.9.0 Radio Group and Radio (MIT), through src/primitives/radio-group.tsx", "motion 14.8.0 (MIT): layoutId thumb and AnimatePresence crossfade"],
  status: "ready",
});

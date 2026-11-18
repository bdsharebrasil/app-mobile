import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { PALETTE_MS, PALETTE_TRAVEL } from "./timing";

export default defineMeta({
  slug: "command-palette",
  name: "Command palette",
  family: "overlays",
  summary: "A searchable command launcher presented in a modal dialog.",
  whenToUse: [
    "Find actions or destinations across a large application.",
    "Offer keyboard-first command discovery; use dropdown-menu for a short local action list.",
  ],
  avoidWhen: [
    "A form field selecting a value: use combobox.",
    "Primary navigation that must remain visible: use collapsible-sidebar.",
  ],
  promptTerm: "command palette",
  promptExample:
    "Build a modal command palette toggled by Cmd+K/Ctrl+K with grouped fuzzy-search results, combobox/listbox semantics, arrow navigation, Enter execution, and an empty state.",
  aliases: ["Command palette", "Command launcher", "Command"],
  timing: [
    { phase: `enter (fade, ${PALETTE_TRAVEL} px travel from above)`, ms: PALETTE_MS.enter, easing: easingCss("out") },
    { phase: "exit (fade, back up)", ms: PALETTE_MS.exit, easing: easingCss("in") },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Use a named modal dialog around a labeled combobox input and grouped listbox options; do not put role=combobox on the dialog.",
    "Cmd+K/Ctrl+K toggles; focus the input, trap Tab, and restore focus after Escape/close.",
    "Keep DOM focus on the input; aria-activedescendant identifies the highlighted result; arrows navigate and Enter executes.",
    "Announce result/empty states politely; do not make group headings selectable.",
    "Reduced motion: Open/close and update results immediately (0 ms); no travel or stagger.",
  ],
  primitives: [
    "@base-ui/react 1.9.0 Dialog + Combobox (MIT), behind src/primitives/dialog.tsx and src/primitives/combobox.ts",
    "motion 14.8.0 (MIT)",
  ],
  status: "ready",
});

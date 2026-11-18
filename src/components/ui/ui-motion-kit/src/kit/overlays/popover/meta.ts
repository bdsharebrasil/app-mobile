import { defineMeta } from "@/kit/types";

export default defineMeta({
  "slug": "popover",
  "name": "Popover",
  "family": "overlays",
  "summary": "A small anchored panel for contextual information or controls.",
  "whenToUse": [
    "Show a compact set of controls close to the activating button.",
    "Keep page context available; use sheet if the controls need more room."
  ],
  "avoidWhen": [
    "A value picker with selection semantics: use combobox.",
    "A list of commands with menu keyboard behavior: use dropdown-menu."
  ],
  "promptTerm": "anchored popover",
  "promptExample": "Build a click-triggered anchored popover with four action buttons, viewport flipping, focus entering the panel, and Escape or outside-click dismissal.",
  "aliases": [
    "Popover",
    "Anchored panel"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 220,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 160,
      "easing": "cubic-bezier(0.4,0,1,1)"
    },
    {
      "phase": "reduced-motion",
      "ms": 0,
      "easing": "linear"
    }
  ],
  "loopMs": 5000,
  "a11y": [
    "Name the trigger and panel; expose trigger expanded state and its panel relationship.",
    "For this interactive demo, use a named nonmodal dialog panel; move focus to its first control.",
    "Tab reaches panel controls without trapping the whole page; Escape closes and returns focus.",
    "Outside click closes; keep the clicked destination usable and clamp/flip the panel inside the viewport.",
    "Reduced motion: Place and show/hide immediately (0 ms); no travel."
  ],
  "primitives": [
    "Base UI Popover (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

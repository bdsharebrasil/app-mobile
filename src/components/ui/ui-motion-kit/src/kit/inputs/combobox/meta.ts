import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "combobox",
  "name": "Combobox",
  "family": "inputs",
  "summary": "A text input with a navigable popup of matching choices.",
  "whenToUse": [
    "Search a longer set of allowed values by typing.",
    "Handle async suggestions with explicit loading/no-results feedback; use segmented-control for just a few visible choices."
  ],
  "avoidWhen": [
    "Running application commands: use command-palette.",
    "A contextual panel of buttons rather than selectable values: use popover."
  ],
  "promptTerm": "editable combobox with listbox",
  "promptExample": "Use the \u201ceditable combobox with listbox\u201d pattern to build a labeled editable combobox that filters suggestions for typed text, highlights matches, selects with arrows and Enter, and exposes async loading and no-results states.",
  "aliases": [
    "Combobox",
    "Autocomplete select"
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
    "Label the input; expose role=combobox, aria-expanded, aria-controls, and the listbox/option relationships.",
    "Keep DOM focus in the input and identify the highlighted option via aria-activedescendant.",
    "Arrows navigate, Enter selects, and Escape closes without trapping Tab or breaking normal text-editing keys.",
    "Announce loading/no-results and selection politely; ignore stale async results.",
    "Reduced motion: Show/hide popup and replace results immediately (0 ms)."
  ],
  "primitives": [
    "Base UI Combobox (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

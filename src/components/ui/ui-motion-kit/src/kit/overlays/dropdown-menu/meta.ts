import { defineMeta } from "@/kit/types";

export default defineMeta({
  "slug": "dropdown-menu",
  "name": "Dropdown menu",
  "family": "overlays",
  "summary": "A button-triggered list of contextual commands, including optional submenus.",
  "whenToUse": [
    "Expose secondary commands behind an overflow button.",
    "Group related actions with separators; use context-menu for pointer-position invocation."
  ],
  "avoidWhen": [
    "Ordinary site navigation links: use hamburger-menu or collapsible-sidebar.",
    "Choosing an input value: use combobox."
  ],
  "promptTerm": "dropdown action menu",
  "promptExample": "Build an overflow-button dropdown action menu with icons, separators, typeahead, and a keyboard-accessible submenu that opens with ArrowRight.",
  "aliases": [
    "Dropdown menu",
    "Action menu",
    "Menu"
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
    "Named trigger with expanded state; popup role=menu and items use menuitem semantics.",
    "ArrowUp/Down move roving focus; Home/End and typeahead find items.",
    "ArrowRight opens a submenu; ArrowLeft closes it; Escape closes and restores focus.",
    "Enter/Space activate commands; keep separators nonfocusable and disabled actions unavailable.",
    "Reduced motion: Open/close each menu in 0 ms; no scale or travel."
  ],
  "primitives": [
    "Base UI Menu (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

import { defineMeta } from "@/kit/types";

export default defineMeta({
  "slug": "alert-dialog",
  "name": "Alert dialog",
  "family": "overlays",
  "summary": "A blocking prompt for an important decision, with a safe cancel action.",
  "whenToUse": [
    "Confirm an irreversible delete or other high-impact action.",
    "Require an explicit response to an important message; use modal for ordinary editing."
  ],
  "avoidWhen": [
    "Routine success feedback: use toast.",
    "Low-risk contextual actions: use dropdown-menu."
  ],
  "promptTerm": "alert dialog",
  "promptExample": "Build a compact destructive-action alert dialog with a named message, Cancel initially focused, an explicit Delete action, and Escape mapped to cancel.",
  "aliases": [
    "Alert dialog",
    "Confirmation dialog"
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
    "Named role=alertdialog, aria-modal=true, and a description of the consequence.",
    "Initially focus Cancel; trap Tab/Shift+Tab and make the background inert.",
    "Escape cancels without running the destructive action; do not treat backdrop clicks as confirmation.",
    "Return focus to the trigger, or a logical surviving target if deletion removes it.",
    "Reduced motion: Open/close immediately (0 ms), preserving the cancel-first behavior."
  ],
  "primitives": [
    "Base UI Alert Dialog (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

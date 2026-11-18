import { defineMeta } from "@/kit/types";

export default defineMeta({
  "slug": "tooltip",
  "name": "Tooltip",
  "family": "overlays",
  "summary": "A brief noninteractive description attached to a control.",
  "whenToUse": [
    "Explain an unfamiliar toolbar icon without adding layout clutter.",
    "Add supplementary wording; use hover-card for a richer entity preview."
  ],
  "avoidWhen": [
    "Required instructions or error recovery: use inline-banner or validation-shake with persistent text.",
    "Links, buttons, or other interactive content: use popover."
  ],
  "promptTerm": "tooltip",
  "promptExample": "Build a toolbar-icon tooltip with a 300 ms hover/focus delay, a small arrow, aria-describedby, Escape dismissal, and no interactive content.",
  "aliases": [
    "Tooltip",
    "Help bubble"
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
    "Give the icon button its own accessible name; the tooltip is a description, not its only label.",
    "Use role=tooltip and aria-describedby on the trigger; open for keyboard focus as well as hover.",
    "Never put focusable content inside or move focus into the bubble.",
    "Escape dismisses; allow pointer travel over the bubble without prematurely hiding it.",
    "Reduced motion: Keep the 300 ms discovery delay; reveal/hide in 0 ms without travel or fade."
  ],
  "primitives": [
    "Base UI Tooltip (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

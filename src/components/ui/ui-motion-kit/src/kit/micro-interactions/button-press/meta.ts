import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "button-press",
  "name": "Button press",
  "family": "micro-interactions",
  "summary": "A brief pressed-state response that makes an action feel directly activated.",
  "whenToUse": [
    "Confirm pointer or keyboard activation of an ordinary button.",
    "Add a subtle highlight without changing meaning; use loading-button for an asynchronous lifecycle."
  ],
  "avoidWhen": [
    "Communicating a persistent selection: use toggle-switch or like-burst.",
    "Replacing success/error messages: use success-check or validation-shake."
  ],
  "promptTerm": "button press micro-interaction",
  "promptExample": "Use the \u201cbutton press micro-interaction\u201d pattern to build a native action button that scales to 0.97 while pressed, shows a restrained click-origin highlight, and gives equivalent Enter/Space feedback without a reduced-motion ripple.",
  "aliases": [
    "Button press",
    "Pressed-state feedback",
    "Tap feedback"
  ],
  "timing": [
    {
      "phase": "enter",
      "ms": 180,
      "easing": "cubic-bezier(0.2,0.8,0.2,1)"
    },
    {
      "phase": "exit",
      "ms": 120,
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
    "Use a named native button with Enter/Space operation and a visible focus indicator.",
    "Apply pressed visuals for keyboard and pointer without firing the action twice.",
    "Do not add aria-pressed to a momentary action; reserve it for actual toggles.",
    "Honor disabled state and retain an adequate hit area throughout the visual scale.",
    "Reduced motion: Use an immediate (0 ms) static fill/border change; no scale or expanding ripple."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

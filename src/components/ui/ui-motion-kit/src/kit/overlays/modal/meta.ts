import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "modal",
  name: "Modal",
  family: "overlays",
  summary: "A centered form dialog over a dimmed page: a title, one labeled field and a primary action, with the rest of the page blocked until the user submits or closes it.",
  whenToUse: [
    "Creating or naming one thing without leaving the page (new report, rename, invite by email).",
    "A short, focused form that should not lose the page context behind it.",
    "A step that needs one answer before the user can continue.",
  ],
  avoidWhen: [
    "The content is long or needs scrolling: use a full page or a side drawer.",
    "The message is informational and needs no answer: use a toast or an inline banner.",
    "The user needs to compare with content behind it: use a popover or a sheet that leaves the page visible.",
    "It only asks to confirm or cancel an action, with no input: use the alert dialog.",
  ],
  promptTerm: "modal form dialog (centered, dimmed backdrop, focus on the field)",
  promptExample:
    "Add a modal form dialog 'New report': centered card over a dimmed backdrop with an icon, title and one-line hint, a close button top right, one labeled 'Report name' input, a full-width primary 'Create report' button and a quiet Cancel under it. Focus the input on open, Enter submits, an empty name shows an inline error and keeps the dialog open. Fade + scale from 0.96 in 220 ms ease-out, out in 160 ms ease-in, no transform under reduced motion. Trap focus; Esc, the close button and a press outside close it; focus returns to the trigger.",
  aliases: ["dialog", "form dialog", "popup", "create dialog"],
  timing: [
    { phase: "enter (backdrop fade, card fade + scale 0.96 to 1)", ms: 220, easing: easingCss("out") },
    { phase: "exit (fade + scale to 0.96)", ms: 160, easing: easingCss("in") },
    { phase: "button hover", ms: 120, easing: easingCss("out") },
    { phase: "reduced motion", ms: 0, easing: "none: state change only" },
  ],
  loopMs: 5000,
  a11y: [
    "role=\"dialog\" with aria-modal=\"true\", aria-labelledby on the title and aria-describedby on the hint.",
    "Focus moves to the name field on open and is trapped in the dialog; Tab and Shift+Tab cycle its controls.",
    "The field has a visible <label>; an empty submit sets aria-invalid and links the error text with aria-describedby.",
    "The icon-only close button is named \"Close\". Esc, Close, Cancel and a press outside all close it; focus returns to the element that opened it.",
    "Page behind is inert and does not scroll while open.",
    "prefers-reduced-motion: appears and disappears without movement.",
  ],
  primitives: ["@base-ui/react 1.9.0 Dialog (MIT), behind src/primitives/dialog.tsx", "motion 14.8.0 (MIT)"],
  status: "ready",
});

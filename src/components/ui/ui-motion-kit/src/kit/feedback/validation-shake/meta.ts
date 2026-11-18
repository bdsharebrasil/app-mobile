import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "validation-shake",
  "name": "Validation shake",
  "family": "feedback",
  "summary": "A brief field emphasis accompanying a persistent, specific validation error.",
  "whenToUse": [
    "Draw attention to a newly invalid field after submission.",
    "Reinforce linked error text; use inline-banner for a page-level problem."
  ],
  "avoidWhen": [
    "Feedback on every keystroke or repeated punishment: keep the field error static.",
    "A successful save or pending operation: use success-check or spinner."
  ],
  "promptTerm": "field validation shake",
  "promptExample": "Use the \u201cfield validation shake\u201d pattern to build a field validation state with three small horizontal shakes on failed submit, a darkened border, and persistent linked error text that remains usable without motion.",
  "aliases": [
    "Validation shake",
    "Invalid-field shake",
    "Error nudge"
  ],
  "timing": [{"phase":"shake","ms":240,"easing":"cubic-bezier(0.2,0.8,0.2,1)"},
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
    "Set aria-invalid=true and associate the error via aria-describedby.",
    "Keep a persistent, specific correction message rather than relying on motion or border color.",
    "On failed form submit, focus the first invalid field or an error summary; do not refocus on every edit.",
    "Use a real associated label and preserve entered data when validation fails.",
    "Reduced motion: Set error text, border, and invalid state in 0 ms; no shake or fade."
  ],
  "primitives": [
    "@base-ui/react 1.9.0 Field (MIT)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

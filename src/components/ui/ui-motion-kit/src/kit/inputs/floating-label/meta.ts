import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { FLOAT_MS } from "./timing";

export default defineMeta({
  slug: "floating-label",
  name: "Floating label",
  family: "inputs",
  summary: "An input whose persistent label moves above its value when focused or filled.",
  whenToUse: [
    "Maintain a visible field name in a compact form layout.",
    "Support empty, focused, prefilled, and autofilled states; use combobox if suggestions are required.",
  ],
  avoidWhen: [
    "Using placeholder text as the only field name: keep a permanent label.",
    "Long or complex hints that need their own space: use a normal labeled field, with inline-banner for broader guidance.",
  ],
  promptTerm: "floating-label input",
  promptExample:
    "Use the “floating-label input” pattern to build a floating-label text field whose associated label rises and shrinks to 12 px on focus or a nonempty value, including autofill and prefilled values, without overlapping text. The label and a 2 px border rise in 180 ms ease-out; they return in 120 ms ease-in only when the field is empty and blurred; reduced motion places the label at once.",
  aliases: ["Floating-label field", "Floating-label input"],
  timing: [
    { phase: "enter (label rises and shrinks, border thickens)", ms: FLOAT_MS.enter, easing: easingCss("out") },
    { phase: "exit (label returns, only when empty and blurred)", ms: FLOAT_MS.exit, easing: easingCss("in") },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Use a real label associated with the input; placeholder text is optional supplementary guidance.",
    "Keep the label legible and nonoverlapping in autofill, initial values, zoom, and error states.",
    "Use normal input keyboard behavior and a visible focus indicator.",
    "Associate help/error text with aria-describedby and set aria-invalid when needed.",
    "Reduced motion: Place the label in its correct state immediately (0 ms); no travel or scaling.",
  ],
  primitives: ["@base-ui/react 1.9.0 Field (MIT), behind src/primitives/field.tsx; CSS transitions in floating-label.css"],
  status: "ready",
});

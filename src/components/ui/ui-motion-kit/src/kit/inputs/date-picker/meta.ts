import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "date-picker",
  "name": "Date picker",
  "family": "inputs",
  "summary": "A localized date field with a calendar popup for selecting an allowed date.",
  "whenToUse": [
    "Let people enter or visually select a date.",
    "Constrain booking or scheduling dates with min/max; use floating-label for non-date text input."
  ],
  "avoidWhen": [
    "Selecting a generic category: use combobox.",
    "Showing stages in a schedule workflow: use stepper rather than making the calendar a progress control."
  ],
  "promptTerm": "accessible date picker",
  "promptExample": "Use the \u201caccessible date picker\u201d pattern to build a localized date picker with a segmented date field, calendar popup, keyboard grid navigation, min/max dates, animated month changes, and a selected-day circle.",
  "aliases": [
    "Date picker",
    "Calendar picker",
    "DatePicker"
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
    "Label the date field and calendar dialog; expose format instructions and errors.",
    "Support date-segment editing and calendar arrow/Home/End/PageUp/PageDown navigation through the primitive.",
    "Manage focus into the popup and back on close; Escape dismisses without losing the entered value.",
    "Expose selected/current/unavailable dates, localized month names, and min/max limits without relying on color.",
    "Reduced motion: Open/close, switch month, and update the selected day in 0 ms without scale."
  ],
  "primitives": [
    "React Aria DatePicker / DateField / Calendar / Dialog / Popover (Apache-2.0)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

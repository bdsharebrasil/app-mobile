import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "otp-input",
  "name": "One-time code input",
  "family": "inputs",
  "summary": "A short verification-code field visually divided into individual character slots.",
  "whenToUse": [
    "Enter a fixed-length verification code.",
    "Support full-code paste and mobile autofill; use floating-label for ordinary unrestricted text."
  ],
  "avoidWhen": [
    "Passwords or general long-form input: use a labeled field.",
    "Numeric adjustment rather than code entry: use slider or a numeric field."
  ],
  "promptTerm": "one-time code input",
  "promptExample": "Use the \u201cone-time code input\u201d pattern to build a six-slot numeric one-time-code input with full-code paste, Backspace navigation, one-time-code autocomplete, mobile numeric keyboard, and a nonblocking completion cue.",
  "aliases": [
    "OTP input",
    "Verification-code input",
    "OTP Field",
    "Input OTP"
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
    "Give the code and individual positions meaningful labels and associate any instructions/errors.",
    "Allow pasting the whole code, correcting digits, and Backspace navigation without trapping Tab.",
    "Use autocomplete=one-time-code and inputmode=numeric for this numeric code; do not treat codes as arithmetic numbers.",
    "Announce completion once; completion is not proof of server verification, and must not unexpectedly move focus.",
    "Reduced motion: Update active slot and completion state in 0 ms; no pulse, travel, or scale."
  ],
  "primitives": [
    "Base UI OTP Field (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

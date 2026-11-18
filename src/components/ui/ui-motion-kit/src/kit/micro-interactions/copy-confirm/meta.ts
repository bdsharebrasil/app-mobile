import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "copy-confirm",
  "name": "Copy confirm",
  "family": "micro-interactions",
  "summary": "A copy action that briefly confirms successful clipboard writing.",
  "whenToUse": [
    "Copy a code, URL, or other concise value.",
    "Provide nearby confirmation; use toast for feedback that needs a separate action or longer explanation."
  ],
  "avoidWhen": [
    "Treating an attempted copy as success without checking it: retain an error/retry state.",
    "A permanent on/off state: use toggle-switch."
  ],
  "promptTerm": "copy-to-clipboard confirmation",
  "promptExample": "Use the \u201ccopy-to-clipboard confirmation\u201d pattern to build a Copy button that awaits clipboard success, morphs to a check with a brief Copied bubble for 1.5 seconds, announces the result, and offers manual selection if clipboard access fails.",
  "aliases": [
    "Copy confirm",
    "Copy-to-clipboard feedback",
    "Copied state"
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
    "Give the icon button an explicit Copy label and retain keyboard focus after activation.",
    "Announce Copied once through a polite live region only after the write succeeds.",
    "Keep essential feedback in status text, not solely in a tooltip; errors must remain actionable.",
    "Clipboard writes can reject and require a secure context; offer selectable text/manual copy instead of assuming success.",
    "Reduced motion: Swap icon/text in 0 ms; keep the 1500 ms confirmation hold with no morph or fade."
  ],
  "primitives": [
    "Custom, built from scratch (native HTML and browser APIs)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

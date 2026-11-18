import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "progress-bar",
  "name": "Progress bar",
  "family": "feedback",
  "summary": "A bar that communicates measured completion or an ongoing task with unknown progress.",
  "whenToUse": [
    "Show upload completion when a real numeric value is available.",
    "Show an indeterminate track for unknown duration; use spinner when compact space matters."
  ],
  "avoidWhen": [
    "Static KPI values unrelated to task completion: use number-ticker.",
    "Placeholder page structure: use skeleton."
  ],
  "promptTerm": "determinate and indeterminate progress bar",
  "promptExample": "Use the \u201cdeterminate and indeterminate progress bar\u201d pattern to build an upload progress bar with truthful eased determinate steps, an indeterminate mode, an accessible label, and a completion check.",
  "aliases": [
    "Progress bar",
    "Progress indicator"
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
    "Use a named role=progressbar; determinate mode exposes min/max and aria-valuenow.",
    "Omit aria-valuenow when indeterminate; do not present a fabricated percentage.",
    "Keep focus on the initiating control; mark the affected region busy while work runs.",
    "Announce completion once politely rather than announcing every visual interpolation.",
    "Reduced motion: Show and update in 0 ms; replace the sweep with a static track plus \u201cUploading\u2026\u201d text."
  ],
  "primitives": [
    "@base-ui/react 1.9.0 Progress (MIT)",
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

import { defineMeta } from "@/kit/types";

export default defineMeta({
  slug: "pagination",
  name: "Pagination",
  family: "navigation",
  summary: "Discrete controls for moving through numbered pages of content.",
  whenToUse: ["Provide stable result pages that can be revisited.", "Give explicit previous/next controls; use infinite-scroll for a continuous browsing stream."],
  avoidWhen: ["Switching local peer panels without page numbers: use sliding-tabs.", "Tracking an ordered form workflow: use stepper."],
  promptTerm: "numbered pagination",
  promptExample: "Build accessible numbered pagination with previous/next, noninteractive ellipses, aria-current=page, a sliding active marker, and a leftward content transition.",
  aliases: ["Pagination", "Pager"],
  timing: [{"phase": "enter", "ms": 220, "easing": "cubic-bezier(0.2,0.8,0.2,1)"}, {"phase": "exit", "ms": 150, "easing": "cubic-bezier(0.4,0,1,1)"}, {"phase": "reduced-motion", "ms": 0, "easing": "linear"}],
  loopMs: 5000,
  a11y: ["Use a named navigation landmark and aria-current=page on the active page control.", "Use links for navigable URLs or buttons for in-place paging; supply meaningful page and previous/next names.", "Keep ellipses noninteractive and unavailable controls genuinely unavailable.", "Preserve a logical focus destination and announce updated results without rereading every row.", "Reduced motion: Change page and marker immediately (0 ms); preserve logical focus and scroll context."],
  primitives: ["motion 14.8.0 (MIT)"],
  status: "ready",
});

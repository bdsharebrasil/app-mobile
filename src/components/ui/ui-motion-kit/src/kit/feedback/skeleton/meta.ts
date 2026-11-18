import { defineMeta } from "@/kit/types";
export default defineMeta({
  "slug": "skeleton",
  "name": "Skeleton",
  "family": "feedback",
  "summary": "A layout-shaped placeholder that reserves space while actual content loads.",
  "whenToUse": [
    "Reserve a card or list layout to prevent loading shifts.",
    "Show an initial content fetch with predictable structure; use spinner for a small action."
  ],
  "avoidWhen": [
    "Empty results after a completed fetch: use empty-state.",
    "A measurable upload or long-running job: use progress-bar."
  ],
  "promptTerm": "skeleton loading placeholder",
  "promptExample": "Use the \u201cskeleton loading placeholder\u201d pattern to build card-list skeleton placeholders with configurable shimmer, stable content dimensions, aria-busy on the container, and a crossfade to the real content.",
  "aliases": [
    "Skeleton",
    "Loading placeholder"
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
    "Set aria-busy=true on the loading content region, then clear it on completion.",
    "Hide placeholder shapes from assistive technology; provide a concise Loading message separately.",
    "Never put skeleton elements in the tab order or show fake interactive controls.",
    "Reserve final dimensions and keep user focus stable during replacement.",
    "Reduced motion: Static placeholder blocks; replace with content in 0 ms without shimmer or crossfade."
  ],
  "primitives": [
    "motion 14.8.0 (MIT)"
  ],
  "status": "ready"
});

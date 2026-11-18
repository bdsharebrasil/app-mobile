import { defineMeta } from "@/kit/types";

export default defineMeta({
  "slug": "hover-card",
  "name": "Hover card",
  "family": "overlays",
  "summary": "A richer, supplementary preview of the person or destination behind a link.",
  "whenToUse": [
    "Preview an avatar/name link with a portrait, summary, and stats.",
    "Let the pointer cross into the preview; use tooltip for a single short description."
  ],
  "avoidWhen": [
    "Essential information available only on hover: use popover with an explicit trigger.",
    "A multi-control or touch-first task: use sheet."
  ],
  "promptTerm": "hover preview card",
  "promptExample": "Use the \u201chover preview card\u201d pattern to build a nonmodal avatar-link preview card that opens after a 300 ms hover/focus delay, stays open across the pointer gap, and closes with Escape.",
  "aliases": [
    "Hover card",
    "Preview card"
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
    "Keep the avatar/name as a real, named link; essential preview information must also exist at its destination.",
    "Open on trigger focus without stealing focus; do not force a dialog role on a decorative summary.",
    "Support Escape and pointer travel into the card; close when focus/pointer leave the combined region.",
    "If controls are added, provide explicit click/keyboard opening and named nonmodal dialog semantics instead of hover-only access.",
    "Reduced motion: Keep discovery/grace delays; show/hide immediately (0 ms) without movement."
  ],
  "primitives": [
    "Base UI Popover (MIT)",
    "Motion runtime (MIT)"
  ],
  "status": "ready"
});

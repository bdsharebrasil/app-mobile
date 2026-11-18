import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { DRAWER_MS, DRAWER_SPRING } from "./timing";

export default defineMeta({
  slug: "drawer",
  name: "Drawer",
  family: "overlays",
  summary: "A bottom panel with a grab handle and physical drag-to-dismiss interaction.",
  whenToUse: [
    "Offer compact mobile actions or details within thumb reach.",
    "Let someone directly drag a panel closed; use sheet for a nondraggable side workspace.",
  ],
  avoidWhen: [
    "A long task needing generous stable space: use modal or sheet.",
    "Persistent desktop navigation: use collapsible-sidebar.",
  ],
  promptTerm: "bottom drawer with drag handle",
  promptExample:
    "Use the “bottom drawer with drag handle” pattern to build a modal bottom drawer with a grab handle, distance-and-velocity swipe-down dismissal, optional snap points, Escape support, and a visible close button.",
  aliases: ["Bottom drawer", "Bottom sheet", "Drawer"],
  timing: [
    { phase: "enter (rise from the bottom, backdrop fade)", ms: DRAWER_MS.enter, easing: easingCss("out") },
    { phase: "exit (down and out)", ms: DRAWER_MS.exit, easing: easingCss("in") },
    {
      phase: `canceled drag settle (spring: stiffness ${DRAWER_SPRING.stiffness}, damping ${DRAWER_SPRING.damping}, mass ${DRAWER_SPRING.mass})`,
      ms: 400,
      easing: "spring, critically damped",
    },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Named role=dialog with aria-modal=true; trap focus, make background inert, and lock background scroll.",
    "Escape and a visible close button dismiss; return focus to the trigger.",
    "Do not make dragging the only way to close or change an optional snap point.",
    "Separate panel scrolling from handle dragging; keep controls reachable above the on-screen keyboard.",
    "Reduced motion: Open/close/snap in 0 ms; direct gesture tracking only, no inertial settling; preserve a close-button alternative.",
  ],
  primitives: ["@base-ui/react 1.9.0 Drawer (MIT), behind src/primitives/drawer.tsx", "motion 14.8.0 (MIT)"],
  status: "ready",
});

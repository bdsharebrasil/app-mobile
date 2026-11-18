import { easingCss } from "@/engine/tokens";
import { defineMeta } from "@/kit/types";
import { MENU_MS } from "./timing";

export default defineMeta({
  slug: "context-menu",
  name: "Context menu",
  family: "overlays",
  summary: "A command menu opened at a pointer location or from the focused target.",
  whenToUse: [
    "Provide object-specific actions on a file or list row.",
    "Support familiar right-click workflows; use dropdown-menu as the visible discoverable equivalent.",
  ],
  avoidWhen: [
    "The only route to an essential command: include dropdown-menu access.",
    "Input suggestions or choices: use combobox.",
  ],
  promptTerm: "context menu",
  promptExample:
    "Build a file-card context menu that opens at right-click or Shift+F10/Menu-key invocation, stays within the viewport, and provides keyboard command navigation.",
  aliases: ["Context menu", "Right-click menu"],
  timing: [
    { phase: "enter (fade + scale 0.98 to 1 around the pointer)", ms: MENU_MS.enter, easing: easingCss("out") },
    { phase: "exit (fade)", ms: MENU_MS.exit, easing: easingCss("in") },
    { phase: "reduced motion", ms: 0, easing: "linear" },
  ],
  loopMs: 5000,
  a11y: [
    "Give the target a keyboard focus route; Shift+F10 and the Menu key open at that target, not a stale pointer coordinate.",
    "Use role=menu/menuitem with arrow navigation, typeahead, and Enter/Space activation.",
    "Escape closes and restores focus to the invoking target.",
    "Also expose important actions through a named visible button; keep the menu within the viewport.",
    "Reduced motion: Open/close immediately (0 ms); preserve the correct anchor and keyboard behavior.",
  ],
  primitives: ["@base-ui/react 1.9.0 Context Menu (MIT), behind src/primitives/context-menu.tsx", "motion 14.8.0 (MIT)"],
  status: "ready",
});

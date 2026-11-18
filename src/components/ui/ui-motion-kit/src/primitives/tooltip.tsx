/**
 * Tooltip primitive adapter.
 *
 * The kit's components import tooltip behavior (open on hover and keyboard focus, Esc to close,
 * shared open delay across a group, aria-describedby wiring, collision-aware positioning, portal)
 * only from this file. Today it is Base UI Tooltip (@base-ui/react, MIT). To move to another
 * headless library, reimplement this export with the same parts.
 *
 * See https://base-ui.com/react/components/tooltip.
 */
export { Tooltip } from "@base-ui/react/tooltip";

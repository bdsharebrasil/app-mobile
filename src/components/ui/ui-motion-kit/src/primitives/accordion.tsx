/**
 * Accordion primitive adapter.
 *
 * The kit's components import accordion behavior (heading + button per item, aria-expanded and
 * aria-controls, region panels, single or multiple open items, Enter/Space, collapsed content kept
 * out of the tab order, the --accordion-panel-height variable for animating to auto height) only
 * from this file. Today it is Base UI Accordion (@base-ui/react, MIT). To move to another headless
 * library, reimplement this export with the same parts.
 *
 * See https://base-ui.com/react/components/accordion.
 */
export { Accordion } from "@base-ui/react/accordion";

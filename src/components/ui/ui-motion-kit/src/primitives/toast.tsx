/**
 * Toast primitive adapter.
 *
 * The kit's components import toast behavior (queue, live-region announcements, pause on hover and
 * focus, swipe to dismiss, timers) only from this file. Today it is Base UI Toast (@base-ui/react,
 * MIT). To move to another headless library, reimplement this export with the same parts.
 *
 * Animate the parts with Motion through the `render` prop, as in src/primitives/dialog.tsx.
 * See https://base-ui.com/react/components/toast.
 */
export { Toast } from "@base-ui/react/toast";

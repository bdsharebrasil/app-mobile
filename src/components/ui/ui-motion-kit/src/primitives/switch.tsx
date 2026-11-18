/**
 * Switch primitive adapter.
 *
 * The kit's components import switch behavior (role="switch", aria-checked, Space toggles, a hidden
 * native checkbox for forms, label association, disabled state) only from this file. Today it is
 * Base UI Switch (@base-ui/react, MIT). To move to another headless library, reimplement this
 * export with the same parts (Root, Thumb).
 *
 * See https://base-ui.com/react/components/switch.
 */
export { Switch } from "@base-ui/react/switch";

/**
 * Slider primitive adapter.
 *
 * The kit's components import slider behavior (role="slider" on a native range input per thumb,
 * arrow keys, PageUp/PageDown, Home/End, pointer drag and track press, one or two thumbs, aria
 * value wiring, form submission) only from this file. Today it is Base UI Slider (@base-ui/react,
 * MIT). To move to another headless library, reimplement this export with the same parts (Root,
 * Label, Value, Control, Track, Indicator, Thumb).
 *
 * See https://base-ui.com/react/components/slider.
 */
export { Slider } from "@base-ui/react/slider";

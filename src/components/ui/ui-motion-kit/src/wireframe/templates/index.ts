import { DASHBOARD } from "./dashboard";
import { FEED } from "./feed";
import { LANDING } from "./landing";
import { MOBILE, PHONE } from "./mobile";
import { SETTINGS } from "./settings";
import type { PageTemplate } from "./types";

export { DASHBOARD, FEED, LANDING, MOBILE, PHONE, SETTINGS };
export { defineTemplate, type PageTemplate, type TargetState, type TemplateState } from "./types";

/** Every shared page template, in the order /templates shows them. Pieces must draw on one of these. */
export const TEMPLATES: readonly PageTemplate[] = [LANDING, DASHBOARD, SETTINGS, FEED, MOBILE];

import { Bar, Block, Button, Field, Toggle } from "../parts";
import { defineTemplate, type TemplateState } from "./types";

const ROW_Y = [108, 152, 196, 240, 284] as const;
const LABEL_W = [104, 88, 120, 96, 112] as const;
const DESC_W = [180, 156, 200, 168, 148] as const;
const TAB_X = [28, 92, 156, 220] as const;
const TAB_W = [40, 48, 44, 52] as const;
const tab = (i: number) => ({ x: TAB_X[i]! - 4, y: 62, w: TAB_W[i]! + 8, h: 24 });

const T = {
  save: { x: 452, y: 20, w: 80, h: 30 },
  tab0: tab(0),
  tab1: tab(1),
  tab2: tab(2),
  tab3: tab(3),
  toggle0: { x: 496, y: ROW_Y[0] + 11, w: 36, h: 20 },
  select1: { x: 420, y: ROW_Y[1] + 9, w: 112, h: 24 },
  toggle2: { x: 496, y: ROW_Y[2] + 11, w: 36, h: 20 },
  toggle3: { x: 496, y: ROW_Y[3] + 11, w: 36, h: 20 },
  action4: { x: 452, y: ROW_Y[4] + 8, w: 80, h: 28 },
};
type Key = keyof typeof T;
const TABS = ["tab0", "tab1", "tab2", "tab3"] as const;
/** Default switch positions when a piece does not drive them. */
const TOGGLE_DEFAULT = { toggle0: 0, toggle2: 1, toggle3: 0 } as const;

/**
 * Settings page: title and a save action, a tab strip, then five labeled rows separated by
 * hairlines, each ending in a control (switches, a select, a secondary button).
 */
function SettingsPage({ state = {} }: { state?: TemplateState<Key> }) {
  const activeTab = TABS.findIndex((k) => (state[k]?.on ?? 0) > 0.5);
  const current = activeTab < 0 ? 0 : activeTab;
  return (
    <>
      <Bar x={28} y={24} w={112} h={14} tone="title" />
      <Bar x={28} y={44} w={196} h={8} tone="base" />
      <Button {...T.save} hover={state.save?.hover} press={state.save?.press} anchor={state.save?.anchor} />
      {TABS.map((k) => (
        <Block key={k} {...T[k]} r={6} tone="panel" style={{ opacity: state[k]?.hover ?? 0 }} />
      ))}
      {TABS.map((k, i) => (
        <Bar key={`${k}-label`} x={TAB_X[i]} y={70} w={TAB_W[i]} h={8} tone={i === current ? "strong" : "title"} />
      ))}
      <Block x={TAB_X[current]} y={92} w={TAB_W[current]} h={2} r={1} tone="accent" />
      <Block x={28} y={95} w={504} h={1} r={0} tone="base" />
      {ROW_Y.map((y, i) => (
        <div key={y}>
          <Bar x={28} y={y + 12} w={LABEL_W[i]} h={8} tone="title" />
          <Bar x={28} y={y + 26} w={DESC_W[i]} h={6} tone="base" />
          {i < ROW_Y.length - 1 ? <Block x={28} y={y + 43} w={504} h={1} r={0} tone="base" /> : null}
        </div>
      ))}
      <Toggle {...T.toggle0} on={state.toggle0?.on ?? TOGGLE_DEFAULT.toggle0} anchor={state.toggle0?.anchor} />
      <Field {...T.select1} focus={state.select1?.on ?? 0} anchor={state.select1?.anchor}>
        <Bar x={10} y={8} w={56} h={8} tone="title" />
        <Bar x={92} y={10} w={10} h={4} r={2} tone="strong" />
      </Field>
      <Toggle {...T.toggle2} on={state.toggle2?.on ?? TOGGLE_DEFAULT.toggle2} anchor={state.toggle2?.anchor} />
      <Toggle {...T.toggle3} on={state.toggle3?.on ?? TOGGLE_DEFAULT.toggle3} anchor={state.toggle3?.anchor} />
      <Button {...T.action4} variant="secondary" hover={state.action4?.hover} press={state.action4?.press} anchor={state.action4?.anchor} />
    </>
  );
}

export const SETTINGS = defineTemplate<Key>({
  id: "settings",
  name: "Settings",
  use: "Form and control patterns: switches, selects, segmented tabs, inline validation, save confirmations.",
  targets: T,
  Page: SettingsPage,
});

import { Avatar, Bar, Block, Button, pct } from "../parts";
import { defineTemplate, type TemplateState } from "./types";

/** Content column right of the rail. */
const X0 = 152;
const CW = 380;
const NAV_W = [56, 44, 60, 40, 52] as const;
const navRow = (i: number) => ({ x: 12, y: 60 + i * 32, w: 104, h: 28 });
const kpi = (i: number) => ({ x: X0 + i * 130, y: 72, w: 120, h: 64 });

const T = {
  filter: { x: 396, y: 20, w: 30, h: 30 },
  create: { x: 436, y: 20, w: 96, h: 30 },
  nav0: navRow(0),
  nav1: navRow(1),
  nav2: navRow(2),
  nav3: navRow(3),
  nav4: navRow(4),
  kpi0: kpi(0),
  kpi1: kpi(1),
  kpi2: kpi(2),
  chart: { x: X0, y: 152, w: CW, h: 168 },
};
type Key = keyof typeof T;
const NAV = ["nav0", "nav1", "nav2", "nav3", "nav4"] as const;
const KPI = ["kpi0", "kpi1", "kpi2"] as const;

/** Line chart samples (chart px, 13 points across 348 px). */
const LINE = [78, 70, 74, 58, 62, 48, 54, 40, 46, 30, 36, 24, 28] as const;
const line = LINE.map((y, i) => `${i * 29},${y}`).join(" ");

/**
 * App dashboard: a left navigation rail, a header with a filter and a primary action, three KPI
 * tiles and a line chart. The first nav item is active unless `state.navN.on` says otherwise.
 */
function DashboardPage({ state = {} }: { state?: TemplateState<Key> }) {
  return (
    <>
      <Block x={0} y={0} w={128} h={344} r={0} tone="panel" />
      <Avatar x={20} y={20} size={18} tone="strong" />
      <Bar x={44} y={25} w={52} h={8} tone="strong" />
      {NAV.map((k, i) => {
        const s = state[k];
        const on = s?.on ?? (i === 0 ? 1 : 0);
        const lift = Math.max(on, s?.hover ?? 0);
        return (
          <Block key={k} {...T[k]} r={8} tone="surface" style={{ background: `color-mix(in srgb, var(--mk-surface) ${pct(lift)}%, transparent)` }}>
            <Block x={10} y={8} w={12} h={12} r={3} tone={on > 0.5 ? "strong" : "title"} />
            <Bar x={30} y={10} w={NAV_W[i]} h={8} tone={on > 0.5 ? "strong" : "title"} />
          </Block>
        );
      })}
      <Avatar x={20} y={300} size={24} tone="title" />
      <Bar x={52} y={308} w={48} h={8} tone="base" />

      <Bar x={X0} y={22} w={132} h={14} tone="title" />
      <Bar x={X0} y={42} w={88} h={8} tone="base" />
      <Button {...T.filter} variant="secondary" hover={state.filter?.hover} press={state.filter?.press} anchor={state.filter?.anchor} />
      <Button {...T.create} hover={state.create?.hover} press={state.create?.press} anchor={state.create?.anchor}>
        <Block x={14} y={11} w={8} h={8} r={2} tone="surface" />
        <Bar x={30} y={12} w={50} h={6} tone="surface" />
      </Button>

      {KPI.map((k) => (
        <Block key={k} {...T[k]} r={10}>
          <Bar x={14} y={14} w={44} h={6} tone="base" />
          <Bar x={14} y={30} w={68} h={14} tone="title" />
          <Bar x={14} y={50} w={36} h={6} tone="strong" />
          <Avatar x={94} y={12} size={12} tone="title" />
        </Block>
      ))}

      <Block {...T.chart} r={12}>
        <Bar x={16} y={16} w={88} h={8} tone="title" />
        <Avatar x={300} y={16} size={8} tone="strong" />
        <Bar x={312} y={17} w={20} h={6} tone="base" />
        <Avatar x={340} y={16} size={8} tone="title" />
        <Bar x={352} y={17} w={12} h={6} tone="base" />
        <svg width={348} height={108} viewBox="0 0 348 108" style={{ position: "absolute", left: 16, top: 44, overflow: "visible" }}>
          {[0, 36, 72, 108].map((y) => (
            <line key={y} x1={0} x2={348} y1={y} y2={y} stroke="var(--mk-wire)" strokeWidth={1} />
          ))}
          <polygon points={`0,108 ${line} 348,108`} fill="var(--mk-wire-title)" opacity={0.45} />
          <polyline points={line} fill="none" stroke="var(--mk-wire-strong)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </Block>
    </>
  );
}

export const DASHBOARD = defineTemplate<Key>({
  id: "dashboard",
  name: "Dashboard",
  use: "App and data patterns: dialogs and popovers from a toolbar, toasts after an action, tabs, tables, charts, side navigation.",
  targets: T,
  Page: DashboardPage,
});

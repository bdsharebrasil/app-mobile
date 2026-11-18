import { Avatar, Bar, Block, Button, Field, pct } from "../parts";
import { defineTemplate, type TemplateState } from "./types";

const ROW_Y = [98, 144, 190, 236, 282] as const;
const NAME_W = [96, 72, 108, 84, 64] as const;
const PREVIEW_W = [248, 212, 260, 196, 232] as const;
const UNREAD = [true, false, true, false, false] as const;
const row = (i: number) => ({ x: 28, y: ROW_Y[i]!, w: 504, h: 46 });

const T = {
  search: { x: 300, y: 18, w: 176, h: 28 },
  filter: { x: 488, y: 18, w: 44, h: 28 },
  chip0: { x: 28, y: 62, w: 56, h: 22 },
  chip1: { x: 92, y: 62, w: 64, h: 22 },
  chip2: { x: 164, y: 62, w: 48, h: 22 },
  row0: row(0),
  row1: row(1),
  row2: row(2),
  row3: row(3),
  row4: row(4),
};
type Key = keyof typeof T;
const CHIPS = ["chip0", "chip1", "chip2"] as const;
const ROWS = ["row0", "row1", "row2", "row3", "row4"] as const;

/**
 * Feed or inbox: title, a search field and a filter button, filter chips, then five list rows
 * (avatar, name, preview, time, unread dot). Rows highlight on `hover` or `on` (selected).
 */
function FeedPage({ state = {} }: { state?: TemplateState<Key> }) {
  return (
    <>
      <Bar x={28} y={26} w={96} h={14} tone="title" />
      <Field {...T.search} focus={state.search?.on ?? 0} anchor={state.search?.anchor}>
        <Avatar x={10} y={9} size={10} tone="strong" />
        <Bar x={28} y={10} w={72} h={8} tone="base" />
      </Field>
      <Button {...T.filter} variant="secondary" hover={state.filter?.hover} press={state.filter?.press} anchor={state.filter?.anchor} />
      {CHIPS.map((k, i) => (
        <Block key={k} {...T[k]} r={11} tone={i === 0 ? "title" : "secondary"} />
      ))}
      {ROWS.map((k, i) => {
        const r = T[k];
        const s = state[k];
        const lift = Math.max(s?.hover ?? 0, s?.on ?? 0);
        return (
          <Block
            key={k}
            {...r}
            r={10}
            tone="panel"
            style={{ background: `color-mix(in srgb, var(--mk-panel) ${pct(lift)}%, transparent)`, transform: s?.press ? `scale(${1 - 0.01 * s.press})` : undefined }}
          >
            <div data-anchor={s?.anchor} style={{ position: "absolute", inset: 0 }} />
            <Avatar x={10} y={9} size={28} tone="title" />
            <Bar x={50} y={12} w={NAME_W[i]} h={8} tone={UNREAD[i] ? "strong" : "title"} />
            <Bar x={50} y={26} w={PREVIEW_W[i]} h={6} tone="base" />
            <Bar x={452} y={12} w={40} h={6} tone="base" />
            {UNREAD[i] ? <Avatar x={484} y={26} size={8} tone="strong" /> : null}
            {i < ROWS.length - 1 ? <Block x={50} y={45} w={454} h={1} r={0} tone="base" /> : null}
          </Block>
        );
      })}
    </>
  );
}

export const FEED = defineTemplate<Key>({
  id: "feed",
  name: "Feed",
  use: "List patterns: search and command palettes, filters, swipe or reorder rows, skeleton loading, infinite scroll, selection.",
  targets: T,
  Page: FeedPage,
});

import { STAGE } from "@/engine/tokens";
import { Avatar, Bar, Block, Button } from "../parts";
import { defineTemplate, type TemplateState } from "./types";

const pad = STAGE.pad;
const tileGap = 12;
const tileW = (STAGE.pageW - pad * 2 - tileGap * 3) / 4;
const MEDIA_BARS = [28, 44, 36, 60, 52] as const;

const T = {
  signIn: { x: 460, y: 18, w: 72, h: 20 },
  primary: { x: pad, y: 178, w: 104, h: 34 },
  secondary: { x: pad + 114, y: 178, w: 84, h: 34 },
  media: { x: 300, y: 62, w: 232, h: 150 },
  tile0: { x: pad, y: 240, w: tileW, h: 76 },
  tile1: { x: pad + (tileW + tileGap), y: 240, w: tileW, h: 76 },
  tile2: { x: pad + (tileW + tileGap) * 2, y: 240, w: tileW, h: 76 },
  tile3: { x: pad + (tileW + tileGap) * 3, y: 240, w: tileW, h: 76 },
};
type Key = keyof typeof T;
const TILES = ["tile0", "tile1", "tile2", "tile3"] as const;

/**
 * Product landing: split hero (copy and two buttons left, a chart panel right) over four stat
 * tiles. Page-area px (560 x 344) on a 4 px grid.
 */
function LandingPage({ state = {} }: { state?: TemplateState<Key> }) {
  return (
    <>
      <Avatar x={pad} y={20} size={16} tone="strong" />
      <Bar x={pad + 22} y={24} w={46} h={8} tone="strong" />
      <Bar x={372} y={24} w={32} h={8} tone="base" />
      <Bar x={414} y={24} w={32} h={8} tone="base" />
      <Button {...T.signIn} variant="secondary" r={10} hover={state.signIn?.hover} press={state.signIn?.press} anchor={state.signIn?.anchor} />
      <Bar x={pad} y={66} w={60} h={8} tone="strong" />
      <Bar x={pad} y={84} w={224} h={16} tone="title" />
      <Bar x={pad} y={106} w={168} h={16} tone="title" />
      <Bar x={pad} y={136} w={232} h={8} tone="base" />
      <Bar x={pad} y={152} w={196} h={8} tone="base" />
      <Button {...T.primary} hover={state.primary?.hover} press={state.primary?.press} anchor={state.primary?.anchor} />
      <Button {...T.secondary} variant="secondary" hover={state.secondary?.hover} press={state.secondary?.press} anchor={state.secondary?.anchor} />
      <Block {...T.media} r={12}>
        <Avatar x={18} y={18} size={28} tone="title" />
        <Bar x={56} y={24} w={72} h={8} tone="title" />
        <Bar x={56} y={38} w={44} h={6} tone="base" />
        {MEDIA_BARS.map((h, i) => (
          <Bar key={i} x={18 + i * 22} y={132 - h} w={12} h={h} r={3} tone={i === 3 ? "strong" : "title"} />
        ))}
      </Block>
      {TILES.map((k) => (
        <Block key={k} {...T[k]} r={10}>
          <Avatar x={14} y={14} size={20} tone="title" />
          <Bar x={14} y={46} w={64} h={8} tone="title" />
          <Bar x={14} y={60} w={44} h={6} tone="base" />
        </Block>
      ))}
    </>
  );
}

export const LANDING = defineTemplate<Key>({
  id: "landing",
  name: "Landing",
  use: "Marketing and hero patterns: modals from a call to action, tooltips, scroll reveals, sticky headers.",
  targets: T,
  Page: LandingPage,
});

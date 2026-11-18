import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { SETTINGS, Bar, Block, Button, type SceneProps } from "@/wireframe";
const REST={x:302,y:132};const BOX={x:412,y:286,w:120,h:34};
const b=script({cursor:REST,tracks:{press:0,copied:0}}).wait(1000).moveTo(target(BOX,{fx:.78,fy:.5}),600,{curve:.32}).press({key:'press',anchor:'copy-confirm-action'});
b.tween('copied',1,180,{at:b.lastClick}).moveTo({x:372,y:258},450,{curve:-.25}).mark('copied').wait(920).tween('copied',0,120,{advance:true,ease:'in'}).moveTo(REST,800,{curve:.28});
export const timeline=b.build();export const poster=timeline.marks.copied!;
export default function Scene({frame}:SceneProps){const {press=0,copied=0}=frame.v;return <><SETTINGS.Page/><Block x={400} y={280} w={136} h={44} tone="surface"/><Button {...BOX} variant="secondary" press={press} anchor="copy-confirm-action"><Bar x={16} y={14} w={48} h={6} tone="strong"/><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mk-accent)" strokeWidth="2" style={{position:'absolute',left:84,top:7}}><g opacity={1-copied}><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></g><path d="m4 12 5 5L20 6" opacity={copied}/></svg></Button><Block x={436} y={246} w={96} h={30} tone="surface" style={{opacity:copied,transform:`translateY(${4*(1-copied)}px)`,boxShadow:'var(--mk-shadow-overlay)'}}><Bar x={16} y={12} w={64} h={6} tone="strong"/></Block></>;}

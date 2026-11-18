import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { LANDING, Bar, Button, type SceneProps } from "@/wireframe";
const REST={x:270,y:290};
const b=script({cursor:REST,tracks:{press:0,highlight:0}}).wait(1000).moveTo(target(LANDING.targets.primary,{fx:.3,fy:.6}),620,{curve:-.26}).press({key:'press',anchor:'button-press-action'});
b.tween('highlight',1,220,{at:b.lastClick}).wait(700).tween('highlight',0,120,{advance:true,ease:'in'}).moveTo({x:244,y:202},450,{curve:.2}).wait(800).moveTo(REST,700,{curve:.3});
export const timeline=b.build();export const poster=1700;
export default function Scene({frame}:SceneProps){const {press=0,highlight=0}=frame.v;return <><LANDING.Page/><Button {...LANDING.targets.primary} anchor="button-press-action" style={{overflow:'hidden',transform:`scale(${1-.03*press})`}}><div style={{position:'absolute',left:31,top:20,width:150,height:150,borderRadius:'50%',background:'var(--mk-surface)',opacity:.22*(1-highlight),transform:`translate(-50%,-50%) scale(${highlight})`}}/><Bar x={22} y={14} w={60} h={6} tone="surface"/></Button></>;}

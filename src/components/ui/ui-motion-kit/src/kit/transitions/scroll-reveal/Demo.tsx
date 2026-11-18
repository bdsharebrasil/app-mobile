import { timeline as script } from "@/engine/timeline";
import { LANDING, Bar, Block, type SceneProps } from "@/wireframe";
const REST={x:206,y:178};
const b=script({cursor:REST,tracks:{scroll:0,a:0,b:0,c:0}}).wait(1000).moveTo({x:510,y:266},650,{curve:.3}).tween('scroll',1,650,{advance:true}).mark('scrolled');
b.tween('a',1,240,{at:1900}).tween('b',1,240,{at:1930}).tween('c',1,240,{at:1960}).moveTo({x:480,y:204},400,{curve:-.2}).wait(800).tween('scroll',0,650,{advance:true,ease:'inOut'}).set('a',0).set('b',0).set('c',0).moveTo(REST,600,{curve:-.25});
export const timeline=b.build();export const poster=2700;
export default function Scene({frame}:SceneProps){const {scroll=0,a=0,b=0,c=0}=frame.v;return <><div style={{position:'absolute',inset:0,transform:`translateY(${-160*scroll}px)`}}><LANDING.Page/>{[a,b,c].map((v,i)=><Block key={i} x={28+i*172} y={364+12*(1-v)} w={160} h={128} tone="panel" style={{opacity:v}}><Bar x={16} y={18} w={64+i*12} h={12} tone="title"/><Bar x={16} y={44} w={120} h={8}/><Bar x={16} y={60} w={96} h={8}/><Bar x={16} y={96} w={44} h={8} tone="strong"/></Block>)}</div><Block x={548} y={80+100*scroll} w={3} h={64} r={1} tone="strong"/></>;}

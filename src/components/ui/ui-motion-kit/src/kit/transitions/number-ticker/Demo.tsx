import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { DASHBOARD, Block, type SceneProps } from "@/wireframe";
const REST={x:192,y:294};const b=script({cursor:REST,tracks:{press:0,value:0}}).wait(1050).moveTo(target(DASHBOARD.targets.create),720,{curve:.22}).press({key:'press',anchor:'number-ticker-update'}).tween('value',1,240,{at:1910}).moveTo({x:352,y:178},520,{curve:-.3}).mark('updated').wait(1200).tween('value',0,160,{advance:true,ease:'in'}).moveTo(REST,750,{curve:.28});
export const timeline=b.build();export const poster=timeline.marks.updated!;
export default function Scene({frame}:SceneProps){const {press=0,value=0}=frame.v;return <><DASHBOARD.Page state={{create:{press,anchor:'number-ticker-update'}}}/>{[0,1].map(i=><Block key={i} x={166+i*130} y={98} w={92} h={34} tone="panel"><span style={{fontSize:26,lineHeight:'30px',fontWeight:600,color:'var(--mk-accent)',fontVariantNumeric:'tabular-nums'}}>{i?Math.round(86+8*value):Math.round(1248+37*value).toLocaleString('en-US')}</span></Block>)}</>;}

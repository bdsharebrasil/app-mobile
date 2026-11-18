import { timeline as script } from "@/engine/timeline";
import { target } from "@/engine/geometry";
import { FEED, LANDING, Block, type SceneProps } from "@/wireframe";
const REST={x:318,y:284};const BACK={x:20,y:16,w:104,h:30};
const b=script({cursor:REST,tracks:{press:0,open:0,back:0}}).wait(1000).moveTo(target(FEED.targets.row0,{fx:.05,fy:.5}),650,{curve:-.3}).press({key:'press',anchor:'shared-element-open'});
b.tween('open',1,260,{at:b.lastClick}).moveTo({x:218,y:278},500,{curve:.25}).mark('detail').wait(600).moveTo(target(BACK),500,{curve:-.22}).press({key:'back',anchor:'shared-element-back'}).tween('open',0,180,{at:b.lastClick,ease:'in'}).wait(200).moveTo(REST,700,{curve:.28});
export const timeline=b.build();export const poster=timeline.marks.detail!;
export default function Scene({frame}:SceneProps){const {open=0}=frame.v;return <><div style={{opacity:1-open}}><FEED.Page state={{row0:{anchor:'shared-element-open'}}}/></div><div style={{opacity:open}}><LANDING.Page/><div data-anchor="shared-element-back" style={{position:'absolute',left:20,top:16,width:104,height:30}}/></div><Block x={38+262*open} y={107-45*open} w={28+204*open} h={28+122*open} r={8} tone="panel"><Block x={0} y={0} w={(28+204*open)/3} h={28+122*open} r={8} tone="title"/></Block></>;}

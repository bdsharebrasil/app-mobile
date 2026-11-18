import {target} from '@/engine/geometry';
import {timeline as script,lerp} from '@/engine/timeline';
import {DURATION} from '@/engine/tokens';
import {LANDING,Avatar,Bar,Block,type SceneProps} from '@/wireframe';
// Frame: author link on a split landing-page hero; a portrait and statistics below it.
const LINK={x:316,y:76,w:160,h:40};const CARD={x:292,y:126,w:236,h:180};const REST={x:120,y:300};
const b=script({cursor:REST,tracks:{open:0,hover:0}}).wait(1000).moveTo(target(LINK),620,{curve:-0.18})
 .tween('hover',1,DURATION.fast).wait(300).tween('open',1,DURATION.enter,{ease:'out'})
 .wait(400).moveTo(target({x:312,y:190,w:192,h:48}),480,{curve:0.16}).mark('insideCard').wait(1120)
 .tween('open',0,DURATION.exit,{at:4040,ease:'in'}).tween('hover',0,DURATION.fast).moveTo(REST,680,{curve:0.26});
export const timeline=b.build();export const poster=timeline.marks.insideCard!;
export default function Scene({frame}:SceneProps){const {open=0,hover=0}=frame.v;
 return <><LANDING.Page/>
 <Block {...LINK} r={8} tone="panel" style={{background:`color-mix(in srgb,var(--mk-secondary-hover) ${hover*100}%,var(--mk-panel))`}}>
  <Avatar x={4} y={6} size={28} tone="strong"/><Bar x={40} y={12} w={92} h={8} tone="strong"/><Bar x={40} y={28} w={64} h={2} tone="title"/>
 </Block>
 {open>0&&<Block {...CARD} r={12} tone="surface" style={{opacity:open,transform:`translateY(${lerp(-6,0,open)}px)`,boxShadow:'var(--mk-shadow-overlay)'}}>
  <Avatar x={20} y={20} size={44} tone="title"/><Bar x={80} y={28} w={116} h={10} tone="strong"/><Bar x={80} y={46} w={84} h={6} tone="base"/>
  <Bar x={20} y={84} w={188} h={8} tone="title"/><Bar x={20} y={100} w={164} h={8} tone="base"/>
  <Block x={20} y={124} w={196} h={1} r={0} tone="base"/>
  {[20,128].map(x=><div key={x}><Bar x={x} y={140} w={36} h={12} tone="strong"/><Bar x={x} y={160} w={60} h={6} tone="base"/></div>)}
 </Block>}</>;
}

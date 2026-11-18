import { target } from '@/engine/geometry';
import { timeline as script,lerp } from '@/engine/timeline';
import { DURATION } from '@/engine/tokens';
import { DASHBOARD,Bar,Block,Button,type SceneProps } from '@/wireframe';
// Frame: dashboard chart becomes a compact annotation workspace. Toolbar is at its upper left.
const ICON={x:216,y:180,w:32,h:32};const REST={x:474,y:302};
const b=script({cursor:REST,tracks:{open:0,hover:0}}).wait(1000).moveTo(target(ICON),500,{curve:-0.28})
 .tween('hover',1,DURATION.fast).wait(300).tween('open',1,DURATION.enter,{ease:'out'})
 .wait(1200).mark('hint').wait(800).tween('open',0,DURATION.exit,{ease:'in'}).tween('hover',0,DURATION.fast)
 .moveTo(REST,700,{curve:0.2});
export const timeline=b.build();export const poster=timeline.marks.hint!;
export default function Scene({frame}:SceneProps){const {open=0,hover=0}=frame.v;
 return <><DASHBOARD.Page/>
 <Block {...DASHBOARD.targets.chart} r={12} tone="title">
  <Bar x={24} y={96} w={248} h={12} tone="surface"/><Bar x={24} y={120} w={312} h={8} tone="surface"/><Bar x={24} y={138} w={216} h={8} tone="surface"/>
 </Block>
 <Block x={168} y={172} w={220} h={48} r={10} tone="surface" style={{boxShadow:'var(--mk-shadow-window)'}}>
  {[0,1,2,3,4].map(i=><Button key={i} x={8+i*40} y={8} w={32} h={32} variant="secondary" hover={i===1?hover:0} anchor={i===1?'tooltip-icon':undefined}>
   <Block x={10} y={10} w={12} h={12} r={i%2?3:1} tone="strong"/>
  </Button>)}
 </Block>
 {open>0&&<Block x={176} y={132} w={116} h={30} r={8} tone="accent" style={{opacity:open,transform:`translateY(${lerp(4,0,open)}px)`}}>
  <Bar x={18} y={11} w={80} h={8} tone="surface"/><Block x={52} y={26} w={8} h={8} r={1} tone="accent" style={{transform:'rotate(45deg)'}}/>
 </Block>}</>;
}

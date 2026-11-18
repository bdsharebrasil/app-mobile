import { target } from '@/engine/geometry';
import { timeline as script } from '@/engine/timeline';
import { DURATION } from '@/engine/tokens';
import { DASHBOARD, Field, Bar, Block, Avatar, Button, type SceneProps } from '@/wireframe';
const REST={x:190,y:310};
const FIELD={x:356,y:18,w:176,h:34};
const NEXT={x:476,y:72,w:28,h:28};
const DAY={x:354,y:190,w:28,h:28};
const b=script({cursor:REST,tracks:{open:0,press:0,month:0,selected:0,focus:0}})
 .wait(900).moveTo(target(FIELD),450,{curve:.21}).press({key:'press',anchor:'date-picker-field'});
b.tween('open',1,DURATION.enter,{at:b.lastClick}).tween('focus',1,DURATION.fast,{at:b.lastClick})
 .moveTo(target(NEXT),260,{curve:-.2}).press({key:'press',anchor:'date-picker-next'});
b.tween('month',1,DURATION.enter,{at:b.lastClick}).wait(260).mark('monthChanged')
 .moveTo(target(DAY),360,{curve:.24}).press({key:'press',anchor:'date-picker-day'});
b.tween('selected',1,DURATION.enter,{at:b.lastClick}).wait(360).mark('selected')
 .tween('open',0,DURATION.exit).wait(300).set('month',0).tween('focus',0,DURATION.fast)
 .tween('selected',0,DURATION.exit).moveTo(REST,650,{curve:-.22});
export const timeline=b.build();
export const poster=timeline.marks.selected!;
export default function Scene({frame}:SceneProps){
 const {open=0,month=0,selected=0,focus=0}=frame.v;
 return <><DASHBOARD.Page/><Field {...FIELD} focus={focus} anchor="date-picker-field"><Bar x={12} y={13} w={selected?100:68} h={8} tone={selected?'strong':'title'}/><Block x={148} y={10} w={14} h={14} r={3} tone="strong"/></Field>
 {open>0&&<Block x={280} y={60} w={248} h={244} tone="surface" r={12} style={{opacity:open,boxShadow:'var(--mk-shadow-overlay)'}}>
 <Bar x={16} y={22} w={month>.5?100:80} h={10} tone="strong"/>
 <Button x={196} y={12} w={28} h={28} variant="secondary" anchor="date-picker-next"><Bar x={9} y={12} w={10} h={4} tone="strong"/></Button>
 <div style={{transform:`translateX(${month>0&&month<1?12*(1-month):0}px)`}}>
 {Array.from({length:35},(_,i)=>{const x=10+(i%7)*32;const y=66+Math.floor(i/7)*32;return <Block key={i} x={x} y={y} w={28} h={28} r={8} tone="surface"><div data-anchor={i===16?'date-picker-day':undefined} style={{position:'absolute',inset:0}}/>{i===16&&selected>0?<Avatar x={2} y={2} size={24} tone="accent" style={{transform:`scale(${.9+.1*selected})`}}/>:<Bar x={8} y={10} w={12} h={8} tone={i<2?'base':'title'}/>}</Block>;})}
 </div><Bar x={16} y={222} w={96} h={6} tone="base"/>
 </Block>}</>;
}

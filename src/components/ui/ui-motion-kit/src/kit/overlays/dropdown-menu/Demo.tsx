import {target} from '@/engine/geometry';
import {timeline as script,lerp} from '@/engine/timeline';
import {DURATION} from '@/engine/tokens';
import {MOBILE,Bar,Block,Button,type SceneProps} from '@/wireframe';
// Static frame: compact mobile document overflow; its submenu flips left into clear space.
const TRIGGER={x:324,y:112,w:28,h:28},ROOT={x:320,y:148,w:196,h:144};
const MOVE={x:328,y:244,w:180,h:36},SUB={x:132,y:232,w:180,h:88},ARCHIVE={x:140,y:276,w:164,h:36};
const REST={x:84,y:80};
const b=script({cursor:REST,tracks:{open:0,sub:0,press:0,row:0,choice:0,choose:0}}).wait(1000).moveTo(target(TRIGGER),480,{curve:0.2}).press({key:'press',anchor:'dropdown-menu-trigger'});
b.tween('open',1,DURATION.enter,{at:b.lastClick,ease:'out'}).wait(300).moveTo(target(MOVE),400,{curve:-0.2}).tween('row',1,DURATION.fast).wait(300).tween('sub',1,DURATION.enter,{ease:'out'})
 .wait(320).moveTo(target(ARCHIVE),440,{curve:-0.12}).tween('choice',1,DURATION.fast).wait(250).mark('submenu').press({key:'choose',anchor:'dropdown-menu-archive'});
b.tween('sub',0,DURATION.exit,{at:b.lastClick,ease:'in'}).tween('open',0,DURATION.exit,{at:b.lastClick,ease:'in'}).tween('row',0,DURATION.fast,{at:b.lastClick}).tween('choice',0,DURATION.fast,{at:b.lastClick}).moveTo(REST,640,{curve:0.2});
export const timeline=b.build();export const poster=timeline.marks.submenu!;
function Glyph({x,y,kind=0}:{x:number;y:number;kind?:number}){return <Block x={x} y={y} w={14} h={14} r={kind?2:4} tone="title"><Block x={4} y={4} w={6} h={6} r={1} tone="surface"/></Block>;}
export default function Scene({frame}:SceneProps){const {open=0,sub=0,press=0,row=0,choice=0,choose=0}=frame.v;
 return <><MOBILE.Page/>
 <Button {...TRIGGER} variant="secondary" press={press} anchor="dropdown-menu-trigger">{[6,12,18].map(x=><Block key={x} x={x} y={12} w={3} h={3} r={2} tone="strong"/>)}</Button>
 {open>0&&<Block {...ROOT} r={12} tone="surface" style={{opacity:open,transform:`translateY(${lerp(-6,0,open)}px)`,boxShadow:'var(--mk-shadow-overlay)'}}>
  {[0,1].map(i=><div key={i}><Glyph x={20} y={20+i*40} kind={i}/><Bar x={48} y={24+i*40} w={i?108:76} h={8} tone="title"/></div>)}
  <Block x={12} y={88} w={172} h={1} r={0} tone="base"/>
  <Button x={8} y={96} w={180} h={36} variant="secondary" hover={row} anchor="dropdown-menu-move" style={{background:`color-mix(in srgb,var(--mk-secondary-hover) ${row*100}%,var(--mk-surface))`}}><Glyph x={12} y={11}/><Bar x={40} y={14} w={72} h={8} tone="strong"/><svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" style={{position:'absolute',right:12,top:12,color:'var(--mk-muted)'}}><path d="m4 2 4 4-4 4" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg></Button>
 </Block>}
 {sub>0&&<Block {...SUB} r={12} tone="surface" style={{opacity:sub,transform:`translateX(${lerp(6,0,sub)}px)`,boxShadow:'var(--mk-shadow-overlay)'}}>
  {[0,1].map(i=><Button key={i} x={8} y={8+i*36} w={164} h={36} variant="secondary" hover={i?choice:0} press={i?choose:0} anchor={i?'dropdown-menu-archive':undefined} style={{background:i?`color-mix(in srgb,var(--mk-secondary-hover) ${choice*100}%,var(--mk-surface))`:'var(--mk-surface)'}}><Glyph x={12} y={11} kind={i}/><Bar x={40} y={14} w={i?64:92} h={8} tone={i?'strong':'title'}/></Button>)}
 </Block>}</>;
}

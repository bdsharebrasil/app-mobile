import {target} from '@/engine/geometry';
import {timeline as script} from '@/engine/timeline';
import {DURATION} from '@/engine/tokens';
import {SETTINGS,Bar,Block,Field,Avatar,type SceneProps} from '@/wireframe';
const REST={x:476,y:308};
const PANEL={x:116,y:122,w:328,h:156};
const FIRST={x:136,y:186,w:40,h:44};
const b=script({cursor:REST,tracks:{focus:0,press:0,complete:0,pulse:0},textTracks:['code']})
 .wait(1000).moveTo(target(FIRST),520,{curve:.27}).press({key:'press',anchor:'otp-input-first'});
b.tween('focus',1,DURATION.fast,{at:b.lastClick}).type('code','572904',1080)
 .tween('complete',1,DURATION.enter).tween('pulse',1,DURATION.fast).wait(DURATION.fast)
 .tween('pulse',0,DURATION.fast).wait(340).mark('complete').wait(500)
 .tween('focus',0,DURATION.fast).tween('complete',0,DURATION.exit).erase('code',0)
 .moveTo(REST,650,{curve:-.18});
export const timeline=b.build();export const poster=timeline.marks.complete!;
export default function Scene({frame}:SceneProps){
 const {focus=0,complete=0,pulse=0}=frame.v;const code=frame.text.code??'';
 return <><SETTINGS.Page/><Block {...PANEL} tone="surface" r={12} style={{boxShadow:'var(--mk-shadow-overlay)',transform:`scale(${1+.015*pulse})`}}>
 <Bar x={20} y={20} w={128} h={12} tone="strong"/><Bar x={20} y={40} w={208} h={6} tone="base"/>
 {Array.from({length:6},(_,i)=><Field key={i} x={20+i*48} y={64} w={40} h={44} focus={focus&&i===Math.min(code.length,5)?1:0} anchor={i===0?'otp-input-first':undefined}>
 {i<code.length?<Bar x={14} y={17} w={12} h={10} tone="strong"/>:focus&&i===code.length?<Block x={19} y={14} w={2} h={16} r={1} tone="accent"/>:null}
 </Field>)}
 <Bar x={20} y={128} w={112} h={6} tone="base"/>
 {complete>0&&<Avatar x={278} y={120} size={20} tone="accent" style={{opacity:complete}}><svg width="20" height="20" viewBox="0 0 20 20"><path d="m5 10 3 3 7-7" fill="none" stroke="var(--mk-accent-fg)" strokeWidth="2"/></svg></Avatar>}
 </Block></>;
}

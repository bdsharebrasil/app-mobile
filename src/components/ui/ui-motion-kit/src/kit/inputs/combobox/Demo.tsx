import { target } from '@/engine/geometry';
import { timeline as script } from '@/engine/timeline';
import { DURATION } from '@/engine/tokens';
import { FEED, Field, Bar, Block, type SceneProps } from '@/wireframe';
const REST = {x: 164, y: 294};
const INPUT = FEED.targets.search;
const b = script({cursor:REST, tracks:{open:0,focus:0,press:0,highlight:0,chosen:0},textTracks:['query','selection']})
  .wait(1000).moveTo(target(INPUT,{fx:.3}),480,{curve:-.22}).press({key:'press',anchor:'combobox-field'});
b.tween('focus',1,DURATION.fast,{at:b.lastClick}).tween('open',1,DURATION.enter,{at:b.lastClick})
  .type('query','ca',280).wait(300).set('highlight',1).mark('results').wait(650)
  .set('chosen',1).tween('open',0,DURATION.exit).erase('query',0).type('selection','Canberra',0)
  .wait(700).tween('focus',0,DURATION.fast).tween('chosen',0,DURATION.exit).set('highlight',0).erase('selection',0)
  .moveTo(REST,650,{curve:.26});
export const timeline=b.build();
export const poster=timeline.marks.results!;
export default function Scene({frame}:SceneProps) {
 const {open=0,focus=0,highlight=0}=frame.v;
 const query=frame.text.selection||frame.text.query||'';
 return <><FEED.Page/><Field {...INPUT} focus={focus} anchor="combobox-field">
   <Bar x={12} y={10} w={query.length?query.length*8:72} h={8} tone={query?'strong':'base'} />
   {focus>.5&&<Block x={14+query.length*8} y={7} w={2} h={14} r={1} tone="accent"/>}
 </Field>{open>0&&<div style={{position:'absolute',left:300,top:54,width:224,height:164,background:'var(--mk-surface)',borderRadius:'var(--mk-r-overlay)',boxShadow:'var(--mk-shadow-overlay)',opacity:open,transform:`translateY(${-6*(1-open)}px)`}}>
 {[0,1,2,3].map(i=><Block key={i} x={8} y={8+i*38} w={208} h={34} r={8} tone={highlight&&i===2?'secondary':'surface'}>
 <Bar x={12} y={12} w={16} h={8} tone="accent"/><Bar x={32} y={12} w={[48,64,56,40][i]} h={8} tone="title"/>
 {highlight>0&&i===2&&<Block x={186} y={12} w={8} h={8} r={4} tone="strong"/>}</Block>)}
 </div>}</>;
}

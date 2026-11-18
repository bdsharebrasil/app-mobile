import {target} from '@/engine/geometry';
import {timeline as script} from '@/engine/timeline';
import {DURATION,STAGE} from '@/engine/tokens';
import {LANDING,Bar,Block,type SceneProps} from '@/wireframe';
const REST={x:80,y:290};const FILE={x:48,y:224,w:100,h:68};const ZONE={x:280,y:176,w:232,h:132};
const b=script({cursor:REST,tracks:{drag:0,over:0,row:0,progress:0}})
 .wait(1000).moveTo(target(FILE),380,{curve:-.16}).mark('pickup').tween('over',1,DURATION.enter,{at:1760})
 .drag(target(ZONE),740,{key:'drag',curve:-.18}).tween('row',1,DURATION.enter).tween('over',0,DURATION.exit)
 .tween('progress',1,1000,{ease:'linear'}).wait(1100).mark('uploaded').wait(560)
 .tween('row',0,DURATION.exit).wait(DURATION.exit).set('progress',0).set('drag',0).moveTo(REST,650,{curve:.24});
export const timeline=b.build();export const poster=timeline.marks.uploaded!;
export default function Scene({frame}:SceneProps){
 const {drag=0,over=0,row=0,progress=0}=frame.v;
 const held=frame.cursor.pressed;const x=held?frame.cursor.x-50:FILE.x;const y=held?frame.cursor.y-STAGE.chromeH-34:FILE.y;
 return <><LANDING.Page/>
 <Block {...ZONE} tone={over>.5?'secondary':'surface'} r={12} style={{border:'2px dashed var(--mk-wire-strong)',transform:`scale(${1+.01*over})`}}>
 <div data-anchor="dropzone-upload-target" style={{position:'absolute',inset:0}}/>
 <Bar x={52} y={24} w={124} h={10} tone="strong"/><Bar x={36} y={44} w={156} h={6} tone="base"/>
 {row>0?<Block x={16} y={72} w={196} h={40} r={8} tone="panel" style={{opacity:row,transform:`translateY(${6*(1-row)}px)`}}><Block x={10} y={10} w={20} h={20} r={4} tone="title"/><Bar x={40} y={10} w={88} h={8} tone="strong"/><Bar x={40} y={26} w={140} h={4} tone="base"/><Bar x={40} y={26} w={140} h={4} tone="accent" style={{transformOrigin:'left',transform:`scaleX(${progress})`}}/></Block>:<Bar x={84} y={88} w={64} h={8} tone="title"/>}
 </Block>
 {drag<1&&row===0&&<Block x={x} y={y} w={FILE.w} h={FILE.h} r={10} tone="surface" style={{boxShadow:'var(--mk-shadow-overlay)'}}><Block x={12} y={12} w={20} h={24} r={4} tone="strong"/><Bar x={42} y={16} w={44} h={6} tone="title"/><Bar x={12} y={48} w={72} h={6} tone="base"/></Block>}
 </>;
}

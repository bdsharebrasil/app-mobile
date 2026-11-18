import { useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Tooltip } from '@/primitives/tooltip';
import { DURATION, EASING_POINTS } from '@/engine/tokens';
import { Button } from '@/ui/Button';

/** A description, never the control's only label. Discovery delay applies to focus too. */
export function Hint({children,text}:{children:ReactElement;text:string}){
 const [open,setOpen]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const reduced=useReducedMotion();const id=useId();
 const clear=()=>{clearTimeout(timer.current);timer.current=undefined;};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 return <Tooltip.Root open={open} onOpenChange={(next,details)=>{
  clear();if(next&&details.reason==='trigger-focus')timer.current=setTimeout(()=>setOpen(true),300);else setOpen(next);
 }}>
  <Tooltip.Trigger delay={300} closeDelay={0} aria-describedby={open?id:undefined} onBlur={()=>{clear();setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){clear();setOpen(false);}}} render={children}/>
  <AnimatePresence>{open&&<Tooltip.Portal keepMounted><Tooltip.Positioner side="top" sideOffset={8} collisionPadding={12} className="z-50">
   <Tooltip.Popup id={id} role="tooltip" data-testid="tooltip-panel" render={<motion.div className="max-w-[min(240px,calc(100vw-24px))] rounded-control bg-accent px-3 py-2 text-sm leading-normal text-accent-fg shadow-[var(--mk-shadow-overlay)]" initial={{opacity:0,y:reduced?0:4}} animate={{opacity:1,y:0,transition:{duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out]}}} exit={{opacity:0,y:reduced?0:4,transition:{duration:reduced?0:DURATION.exit/1000,ease:[...EASING_POINTS.in]}}}/>}>
    {text}<Tooltip.Arrow className="absolute size-2 rotate-45 bg-accent data-[side=top]:-bottom-1 data-[side=bottom]:-top-1"/>
   </Tooltip.Popup>
  </Tooltip.Positioner></Tooltip.Portal>}</AnimatePresence>
 </Tooltip.Root>;
}
const FORMATS=[
 {name:'Bold',hint:'Give this line more weight',path:'M6 3h5a4 4 0 010 8H6m0 0h6a3 3 0 010 6H6V3'},
 {name:'Italic',hint:'Emphasize this line',path:'M9 3h7M4 17h7M12 3L8 17'},
 {name:'Underline',hint:'Underline this line',path:'M5 3v6a5 5 0 0010 0V3M4 18h12'},
 {name:'Strikethrough',hint:'Mark this line as replaced',path:'M15 5c-1-3-10-3-10 1 0 2 3 3 5 4s5 2 5 4c0 4-9 4-10 1M3 10h14'},
 {name:'Code',hint:'Use a monospace line',path:'M7 5l-5 5 5 5M13 5l5 5-5 5'}
];
export function Playground(){
 const [active,setActive]=useState<boolean[]>([false,false,false,false,false]);
 return <div className="flex flex-col items-center gap-4">
  <div role="group" aria-label="Text formatting" className="flex flex-wrap justify-center gap-1 rounded-panel border border-line bg-surface p-2">
   {FORMATS.map((item,i)=><Hint key={item.name} text={item.hint}><Button data-testid={i===1?'tooltip-trigger':undefined} size="icon" variant={active[i]?'primary':'ghost'} aria-label={item.name} aria-pressed={active[i]} onClick={()=>setActive(values=>values.map((v,n)=>n===i?!v:v))}>
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.path}/></svg>
   </Button></Hint>)}
  </div>
  <p data-testid="tooltip-preview" className="m-0 text-[16px] text-ink" style={{fontWeight:active[0]?600:400,fontStyle:active[1]?'italic':'normal',textDecoration:[active[2]?'underline':'',active[3]?'line-through':''].join(' '),fontFamily:active[4]?'var(--mk-font-mono)':'var(--mk-font)'}}>Keep a record of what changed.</p>
 </div>;
}

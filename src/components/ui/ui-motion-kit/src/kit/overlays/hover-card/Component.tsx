import { useEffect, useRef, useState } from 'react';
import { AnimatePresence,motion,useReducedMotion } from 'motion/react';
import { Popover } from '@/primitives/popover';
import { DURATION,EASING_POINTS } from '@/engine/tokens';

export interface Profile {name:string;initials:string;bio:string;notes:number;readers:number;href:string}
export function ProfileSummary({profile}:{profile:Profile}){
 return <><div className="flex items-center gap-3"><span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-panel bg-secondary text-sm font-semibold text-ink">{profile.initials}</span><h3 className="m-0 text-[16px] font-semibold">{profile.name}</h3></div>
 <p className="my-3 text-[15px] leading-relaxed text-muted">{profile.bio}</p>
 <dl className="m-0 flex flex-wrap gap-6 text-sm"><div><dt className="text-muted">Notes</dt><dd className="m-0 font-semibold text-ink">{profile.notes}</dd></div><div><dt className="text-muted">Readers</dt><dd className="m-0 font-semibold text-ink">{profile.readers}</dd></div></dl></>;
}
/** Supplementary only. The real link works on touch and all preview content also lives at its destination. */
export function HoverProfile({profile}:{profile:Profile}){
 const [open,setOpen]=useState(false);const link=useRef<HTMLAnchorElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const inside=useRef({trigger:false,card:false,focus:false});const reduced=useReducedMotion();
 const clear=()=>{clearTimeout(timer.current);timer.current=undefined;};
 const enter=()=>{clear();if(!open)timer.current=setTimeout(()=>setOpen(true),300);};
 const leave=()=>{clear();if(!Object.values(inside.current).some(Boolean))timer.current=setTimeout(()=>setOpen(false),DURATION.fast);};
 const dismiss=()=>{clear();setOpen(false);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){clearTimeout(timer.current);setOpen(false);}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[open]);
 return <Popover.Root open={open} onOpenChange={next=>{clear();setOpen(next);}} modal={false}>
  <a ref={link} href={profile.href} data-testid="hover-card-trigger" className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-[16px] font-medium text-ink underline decoration-[var(--mk-control-border)] underline-offset-4"
   onMouseEnter={()=>{inside.current.trigger=true;enter();}} onMouseLeave={()=>{inside.current.trigger=false;leave();}}
   onFocus={()=>{inside.current.focus=true;enter();}} onBlur={()=>{inside.current.focus=false;leave();}}
   onKeyDown={e=>{if(e.key==='Escape')dismiss();}} onClick={dismiss}>
   <span aria-hidden="true" className="grid size-8 place-items-center rounded-control bg-secondary text-sm no-underline">{profile.initials}</span>{profile.name}
  </a>
  <AnimatePresence>{open&&<Popover.Portal keepMounted>
   {/* A supplementary region has no dialog focus manager. Base UI still owns anchor tracking,
       flipping and the portal; custom hover/focus grace owns visibility, as specified in the sheet. */}
   <Popover.Positioner anchor={link} side="bottom" align="start" sideOffset={0} collisionPadding={16} className={state=>`z-50 ${state.side==='top'?'pb-3':'pt-3'}`}
    onMouseEnter={()=>{inside.current.card=true;clear();}} onMouseLeave={()=>{inside.current.card=false;leave();}}
    render={(props,state)=><div {...props}>
     <motion.div role="region" aria-label={`About ${profile.name}`} data-testid="hover-card-panel" className="w-[280px] max-w-[calc(100vw-32px)] rounded-overlay border border-line bg-surface p-5 text-ink shadow-[var(--mk-shadow-overlay)]" initial={{opacity:0,y:reduced?0:state.side==='top'?6:-6}} animate={{opacity:1,y:0,transition:{duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out]}}} exit={{opacity:0,y:reduced?0:state.side==='top'?6:-6,transition:{duration:reduced?0:DURATION.exit/1000,ease:[...EASING_POINTS.in]}}}>
      <ProfileSummary profile={profile}/>
     </motion.div>
    </div>}/>

  </Popover.Portal>}</AnimatePresence>
 </Popover.Root>;
}
const PROFILE:Profile={name:'Mira Chen',initials:'MC',bio:'Writes field notes on urban gardens and the people who keep them growing.',notes:18,readers:246,href:'#hover-card-profile'};
export function Playground(){return <div className="flex w-full max-w-[340px] flex-col gap-5">
 <p className="m-0 text-[15px] text-muted">Latest field note by <HoverProfile profile={PROFILE}/></p>
 <section id="hover-card-profile" tabIndex={-1} aria-label="Mira Chen profile" className="rounded-panel border border-line bg-surface p-4"><ProfileSummary profile={PROFILE}/></section>
 </div>;}

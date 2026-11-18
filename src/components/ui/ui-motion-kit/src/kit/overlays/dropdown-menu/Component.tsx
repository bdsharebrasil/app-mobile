import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { Menu } from '@/primitives/menu';
import { DURATION, EASING_POINTS } from '@/engine/tokens';
import { Button } from '@/ui/Button';

type Command = 'duplicate' | 'favorite' | 'workspace' | 'archive';
function Icon({name}: {name: Command | 'more' | 'move' | 'chevron'}) {
 const paths = {duplicate:'M8 8h12v12H8z M4 16V4h12',favorite:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',workspace:'M3 5h18v15H3z M3 10h18 M9 10v10',archive:'M4 7h16v13H4z M3 3h18v4H3z M9 11h6',move:'M3 6h7l2 3h9v11H3z',chevron:'m9 5 7 7-7 7',more:'M5 12h.01 M12 12h.01 M19 12h.01'};
 return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name==='more'?3:1.6} strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d={paths[name]}/></svg>;
}
const ITEM='flex min-h-11 cursor-default items-center gap-3 rounded-control px-3 text-[15px] leading-6 text-ink outline-offset-[-2px] data-[highlighted]:bg-secondary';
const PANEL='w-[212px] max-w-[calc(100vw-32px)] rounded-overlay border border-line bg-surface p-1.5 text-ink shadow-[var(--mk-shadow-overlay)]';

export function DocumentMenu({name,onCommand}:{name:string;onCommand:(command:Command)=>void}) {
 const [open,setOpen]=useState(false);const [subOpen,setSubOpen]=useState(false);const reduced=useReducedMotion();
 const enter={duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out] as [number,number,number,number]};
 const exit={duration:reduced?0:DURATION.exit/1000,ease:[...EASING_POINTS.in] as [number,number,number,number]};
 return <Menu.Root open={open} onOpenChange={next=>{setOpen(next);if(!next)setSubOpen(false);}}>
  <Menu.Trigger render={<Button variant="secondary" aria-label={`Actions for ${name}`} data-testid="dropdown-menu-trigger" className="size-11 p-0"><Icon name="more"/></Button>}/>
  <AnimatePresence>{open&&<Menu.Portal keepMounted>
   <Menu.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={16} className="z-50">
    <Menu.Popup aria-label={`${name} actions`} render={(props,state)=><motion.div {...props as HTMLMotionProps<'div'>} data-testid="dropdown-menu-panel" className={PANEL} initial={{opacity:0,y:reduced?0:state.side==='top'?6:-6}} animate={{opacity:1,y:0,transition:enter}} exit={{opacity:0,y:reduced?0:state.side==='top'?6:-6,transition:exit}}/>}>
     <Menu.Item className={ITEM} onClick={()=>onCommand('duplicate')}><Icon name="duplicate"/>Duplicate</Menu.Item>
     <Menu.Item className={ITEM} onClick={()=>onCommand('favorite')}><Icon name="favorite"/>Add to favorites</Menu.Item>
     <Menu.Separator className="mx-2 my-1 h-px bg-line"/>
     <Menu.SubmenuRoot open={subOpen} onOpenChange={setSubOpen}>
      <Menu.SubmenuTrigger className={ITEM}><Icon name="move"/>Move to<span className="ml-auto"><Icon name="chevron"/></span></Menu.SubmenuTrigger>
      <AnimatePresence>{subOpen&&<Menu.Portal keepMounted>
       <Menu.Positioner side="right" align="start" sideOffset={8} collisionPadding={16} className="z-50">
        <Menu.Popup aria-label="Move destination" render={(props,state)=><motion.div {...props as HTMLMotionProps<'div'>} data-testid="dropdown-menu-submenu" className={PANEL} initial={{opacity:0,x:reduced?0:state.side==='left'?6:-6}} animate={{opacity:1,x:0,transition:enter}} exit={{opacity:0,x:reduced?0:state.side==='left'?6:-6,transition:exit}}/>}>
         <Menu.Item className={ITEM} onClick={()=>onCommand('workspace')}><Icon name="workspace"/>Workspace</Menu.Item>
         <Menu.Item className={ITEM} onClick={()=>onCommand('archive')}><Icon name="archive"/>Archive</Menu.Item>
        </Menu.Popup>
       </Menu.Positioner>
      </Menu.Portal>}</AnimatePresence>
     </Menu.SubmenuRoot>
    </Menu.Popup>
   </Menu.Positioner>
  </Menu.Portal>}</AnimatePresence>
 </Menu.Root>;
}
export function Playground(){
 const [copies,setCopies]=useState(0);const [favorite,setFavorite]=useState(false);const [location,setLocation]=useState('Workspace');const [status,setStatus]=useState('No command selected.');
 const command=(value:Command)=>{if(value==='duplicate'){setCopies(n=>n+1);setStatus('A copy was created.');}else if(value==='favorite'){setFavorite(true);setStatus('Added to favorites.');}else{setLocation(value==='archive'?'Archive':'Workspace');setStatus(`Moved to ${value==='archive'?'Archive':'Workspace'}.`);}};
 return <section aria-label="Document example" className="w-full max-w-[340px] rounded-panel border border-line bg-surface p-4">
  <div className="flex items-center justify-between gap-4"><div><h3 className="m-0 text-[16px] font-semibold text-ink">Field notes</h3><p className="m-0 text-sm text-muted">{location}{favorite?' · Favorite':''}</p></div><DocumentMenu name="Field notes" onCommand={command}/></div>
  <p className="my-4 text-[15px] text-muted">Original document{copies?` + ${copies} ${copies===1?'copy':'copies'}`:''}</p>
  <p role="status" className="m-0 min-h-6 text-sm text-muted">{status}</p>
 </section>;
}

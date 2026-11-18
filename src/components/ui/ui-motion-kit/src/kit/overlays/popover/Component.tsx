import { useState, type ReactElement } from "react";
import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { Popover } from "@/primitives/popover";
import { DURATION, EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";

/**
 * Click-triggered anchored popover on an inverted charcoal surface (accent mixed with surface).
 * It prefers the space below the trigger and flips above it when the viewport has no room,
 * rising or dropping from the side it actually opened on.
 */
export function ActionPopover({ trigger, title, description, actions }: {trigger: ReactElement; title: string; description?: string; actions: {label: string; run(): void}[]}) {
 const [open,setOpen]=useState(false); const reduced=useReducedMotion();
 const enter={duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out] as [number,number,number,number]};
 const exit={duration:reduced?0:DURATION.exit/1000,ease:[...EASING_POINTS.in] as [number,number,number,number]};
 return <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
  <Popover.Trigger render={trigger}/>
  <AnimatePresence>{open && <Popover.Portal keepMounted>
   <Popover.Positioner side="bottom" align="start" sideOffset={8} collisionPadding={16} className="z-50">
    <Popover.Popup initialFocus={true} render={(props,state)=><motion.div {...props as HTMLMotionProps<'div'>} data-testid="popover-panel" className="w-[248px] max-w-[calc(100vw-32px)] rounded-overlay bg-[color-mix(in_srgb,var(--mk-accent)_88%,var(--mk-surface))] p-2 text-accent-fg shadow-[var(--mk-shadow-overlay)]" initial={{opacity:0,y:reduced?0:state.side==='top'?6:-6}} animate={{opacity:1,y:0,transition:enter}} exit={{opacity:0,y:reduced?0:state.side==='top'?6:-6,transition:exit}}/>}>
     <div className="border-b border-accent-fg/15 px-3 pt-2 pb-3">
      <Popover.Title className="m-0 text-[15px] font-semibold">{title}</Popover.Title>
      {description && <Popover.Description className="m-0 mt-0.5 text-sm text-accent-fg/75">{description}</Popover.Description>}
     </div>
     <div className="mt-2 flex flex-col gap-0.5">{actions.map(action=><Popover.Close key={action.label} render={<button type="button" className="flex h-10 w-full items-center rounded-control px-3 text-left text-[15px] font-medium text-accent-fg transition-colors duration-120 hover:bg-accent-fg/12 focus-visible:outline-accent-fg pointer-coarse:h-11 motion-reduce:transition-none" onClick={action.run}>{action.label}</button>}/>)}</div>
    </Popover.Popup>
   </Popover.Positioner>
  </Popover.Portal>}</AnimatePresence>
 </Popover.Root>;
}
export function Playground(){
 const idle='Signed in as Ada.';
 const [result,setResult]=useState(idle);
 const actions=[['View profile','Profile opened.'],['Switch workspace','Workspace switcher opened.'],['Keyboard shortcuts','Shortcuts opened.'],['Sign out','Signed out.']];
 return <div className="flex flex-col items-center gap-3">
  <p className="m-0 text-[15px] text-muted">Field notes workspace · sidebar footer</p>
  <ActionPopover title="Account" description="ada@fieldnotes.app" trigger={<Button variant="secondary" data-testid="popover-trigger">Account</Button>} actions={actions.map(([label,result])=>({label:label!,run:()=>setResult(result!)}))}/>
  <Button variant="secondary" data-testid="popover-outside" onClick={()=>setResult(idle)}>Reset demo</Button>
  <p role="status" className="m-0 min-h-6 text-sm text-muted">{result}</p>
 </div>;
}

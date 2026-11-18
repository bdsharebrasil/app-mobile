import { useState, type ReactNode, type ComponentProps } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
const MotionButton = motion.create(Button);
export function PressButton({ children, onClick, disabled, ...props }: Omit<ComponentProps<typeof MotionButton>, "children"> & { children?: ReactNode }) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [burst, setBurst] = useState(0);
  return <MotionButton {...props} disabled={disabled} className="relative overflow-hidden active:scale-100" animate={{ scale: pressed && !reduced ? .97 : 1 }} transition={{ duration: reduced ? 0 : pressed ? .18 : .12, ease: [...EASING_POINTS.out] }}
    style={{ backgroundColor: pressed ? "var(--mk-accent-hover)" : undefined }}
    onPointerDown={e => { if (e.button !== 0 || disabled) return; const r = e.currentTarget.getBoundingClientRect(); setOrigin({ x: (e.clientX-r.left)/r.width*100, y: (e.clientY-r.top)/r.height*100 }); setPressed(true); }}
    onPointerUp={() => setPressed(false)} onPointerCancel={() => setPressed(false)} onPointerLeave={() => setPressed(false)} onBlur={() => setPressed(false)}
    onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !disabled) { setOrigin({x:50,y:50}); setPressed(true); } }} onKeyUp={() => setPressed(false)}
    onClick={e => { setBurst(n=>n+1); onClick?.(e); }}>
    {burst > 0 && !reduced && <motion.span key={burst} data-testid="press-highlight" aria-hidden="true" className="pointer-events-none absolute h-40 w-40 rounded-full bg-accent-fg" style={{left:`${origin.x}%`,top:`${origin.y}%`,marginLeft:-80,marginTop:-80}} initial={{scale:0,opacity:.2}} animate={{scale:1,opacity:0}} transition={{duration:.22,ease:[...EASING_POINTS.out]}} />}
    <span className="relative">{children}</span>
  </MotionButton>;
}
export function Playground() {
 const [count,setCount]=useState(0);
 return <div data-testid="button-press-playground" className="w-full max-w-md space-y-4 text-ink"><p className="text-sm text-muted">Save a local draft with a single press.</p><PressButton data-testid="button-press-trigger" onClick={()=>setCount(n=>n+1)}>Save draft</PressButton><p role="status" className="text-base">{count ? `Draft saved ${count} ${count===1?'time':'times'}.` : 'No changes saved yet.'}</p><PressButton disabled>Unavailable</PressButton></div>;
}

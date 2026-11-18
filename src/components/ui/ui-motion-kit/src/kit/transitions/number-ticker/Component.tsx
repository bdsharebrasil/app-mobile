import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { EASING_POINTS } from "@/engine/tokens";
import { Button } from "@/ui/Button";
export function NumberTicker({value,label,locale='en-US',minimumDigits=6}:{value:number;label:string;locale?:string;minimumDigits?:number}) {
 const reduced=useReducedMotion();const [display,setDisplay]=useState(value);const current=useRef(value);const formatter=new Intl.NumberFormat(locale,{maximumFractionDigits:2});
 useEffect(()=>{if(reduced){current.current=value;setDisplay(value);return;}const control=animate(current.current,value,{duration:.24,ease:[...EASING_POINTS.out],onUpdate:n=>{current.current=n;setDisplay(n);}});return()=>control.stop();},[value,reduced]);
 return <div className="space-y-2"><p className="m-0 text-sm text-muted">{label}</p><span className="sr-only-kit" data-testid="ticker-accessible">{label}: {formatter.format(value)}</span><span data-testid="ticker-visual" aria-hidden="true" className="block text-3xl font-semibold tabular-nums" style={{minWidth:`${minimumDigits}ch`}}>{formatter.format(reduced?value:Math.round(display))}</span></div>;
}
export function Playground(){const [total,setTotal]=useState(1248);return <div data-testid="number-ticker-playground" className="w-full max-w-md space-y-4 text-ink"><p className="text-sm text-muted">Update a sample studio metric.</p><NumberTicker value={total} label="Completed sketches"/><div className="flex flex-wrap gap-2"><Button data-testid="number-ticker-trigger" onClick={()=>setTotal(n=>n+37)}>Add 37 sketches</Button><Button variant="secondary" onClick={()=>setTotal(1248)}>Reset</Button></div></div>;}

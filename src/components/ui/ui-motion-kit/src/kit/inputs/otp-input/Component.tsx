import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { OTPField } from '@/primitives/otp-field';
import { DURATION,EASING_POINTS } from '@/engine/tokens';
import './otp-input.css';
export interface OneTimeCodeProps {
 label?: string;
 length?: number;
 value?: string;
 onChange?: (value:string)=>void;
 onComplete?: (value:string)=>void;
 disabled?: boolean;
 error?: string;
}
/** Completion means all digits entered, not server-side verification. Never block paste/autofill. */
export function OneTimeCode({label='Verification code',length=6,value:controlled,onChange,onComplete,disabled,error}:OneTimeCodeProps){
 const id=useId();const reduced=useReducedMotion();const [local,setLocal]=useState('');
 const value=controlled??local;const complete=value.length===length;
 return <div className="otp-input w-full max-w-96" data-testid="otp-input-widget">
 <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">{label}</label>
 <motion.div data-testid="otp-input-pulse" animate={{scale:reduced?1:complete?[1,1.015,1]:1}} transition={{duration:reduced?0:DURATION.enter/1000,ease:[...EASING_POINTS.out]}}>
 <OTPField.Root id={id} length={length} value={value} onValueChange={next=>{setLocal(next);onChange?.(next);}} onValueComplete={onComplete} disabled={disabled} autoComplete="one-time-code" inputMode="numeric" validationType="numeric" aria-describedby={`${id}-hint`} aria-invalid={Boolean(error)} className="otp-input-slots" style={{gridTemplateColumns:`repeat(${length},minmax(0,1fr))`}}>
 {Array.from({length},(_,i)=><OTPField.Input key={i} aria-label={i?`Digit ${i+1} of ${length}`:undefined} className="h-11 min-w-0 w-full rounded-control border border-control-line bg-surface text-center text-base text-ink data-[filled]:bg-secondary"/>)}
 </OTPField.Root></motion.div>
 <p id={`${id}-hint`} className="mt-2 text-sm text-muted">Enter or paste the {length}-digit code.</p>
 <p role="status" data-testid="otp-input-result" className="min-h-6 text-sm text-ink">{error??(complete?'✓ Code complete. Ready to verify.':`${value.length} of ${length} digits entered.`)}</p>
 </div>;
}
export function Playground(){return <OneTimeCode/>;}

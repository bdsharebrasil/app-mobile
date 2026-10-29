import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import './premium-mobile.css';

let locks = 0;
let originalOverflow = '';
let originalPadding = '';
function lockScroll() {
  if (locks++ === 0) {
    originalOverflow = document.body.style.overflow;
    originalPadding = document.body.style.paddingRight;
    const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = 'hidden';
    if (scrollbar) document.body.style.paddingRight = `${scrollbar}px`;
  }
  return () => {
    if (--locks === 0) {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
    }
  };
}

export type SheetAction = {
  rotulo: string;
  onClick: (fechar: () => void) => void;
  desabilitado?: boolean;
  carregando?: boolean;
};

/** Native dialog: modal focus, inert background and Escape work in Safari/WebView. */
export function PremiumSheet({ titulo, rotuloEsquerda = 'Cancelar', acaoDireita,
  aoFechar, children, bloqueado = false, compacto = false, footer, antesDeFechar,
}: {
  titulo: string;
  rotuloEsquerda?: string | null;
  acaoDireita?: SheetAction;
  aoFechar: () => void;
  children: ReactNode;
  bloqueado?: boolean;
  compacto?: boolean;
  footer?: ReactNode;
  antesDeFechar?: () => boolean;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(aoFechar);
  const blockedRef = useRef(bloqueado);
  const beforeCloseRef = useRef(antesDeFechar);
  beforeCloseRef.current = antesDeFechar;
  closeRef.current = aoFechar;
  blockedRef.current = bloqueado;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const leavingRef = useRef(false);
  const gesture = useRef<{ y: number; time: number; distance: number } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const close = useCallback(() => {
    if (blockedRef.current || leavingRef.current) return;
    if (beforeCloseRef.current && !beforeCloseRef.current()) return;
    leavingRef.current = true;
    setLeaving(true);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    timer.current = setTimeout(() => closeRef.current(), duration);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const unlock = lockScroll();
    leavingRef.current = false;
    setLeaving(false);
    dialog.showModal();
    // Focus the container so opening the sheet doesn't summon the keyboard.
    dialog.focus({ preventScroll: true });
    const cancel = (event: Event) => { event.preventDefault(); close(); };
    dialog.addEventListener('cancel', cancel);
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty('--viewport-height', `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty('--viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    return () => {
      clearTimeout(timer.current);
      dialog.removeEventListener('cancel', cancel);
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      dialog.close();
      unlock();
    };
  }, [close]);

  const resetDrag = () => { gesture.current = null; setDragging(false); setDrag(0); };
  return createPortal(
    <dialog ref={dialogRef} tabIndex={-1} aria-labelledby={id} aria-busy={bloqueado || undefined}
      className={`ios-root premium-dialog ${compacto ? 'premium-dialog--compact' : ''} ${leaving ? 'is-leaving' : ''}`}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className={`premium-sheet ${dragging ? 'is-dragging' : ''}`} style={{ transform: leaving ? undefined : `translateY(${drag}px)` }}>
        <div className="premium-sheet-handle" aria-hidden="true"
          onPointerDown={(event) => {
            if (blockedRef.current || event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            gesture.current = { y: event.clientY, time: performance.now(), distance: 0 };
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!gesture.current) return;
            const distance = Math.max(0, event.clientY - gesture.current.y);
            gesture.current.distance = distance;
            setDrag(distance);
          }}
          onPointerUp={() => {
            const current = gesture.current;
            if (current) {
              const speed = current.distance / Math.max(1, performance.now() - current.time);
              if (current.distance > 110 || (current.distance > 40 && speed > .6)) close();
            }
            resetDrag();
          }} onPointerCancel={resetDrag}>
          <span />
        </div>
        <header className="premium-sheet-nav">
          {rotuloEsquerda ? <button type="button" disabled={bloqueado} className="premium-text-button" onClick={close}>{rotuloEsquerda}</button>
            : <button type="button" disabled={bloqueado} className="premium-icon-button" aria-label="Fechar" onClick={close}><X size={20} /></button>}
          <h2 id={id}>{titulo}</h2>
          {acaoDireita ? <button type="button" className="premium-text-button premium-text-button--strong"
            disabled={bloqueado || acaoDireita.desabilitado || acaoDireita.carregando}
            onClick={() => acaoDireita.onClick(close)}>
            {acaoDireita.carregando ? <><Loader2 className="premium-spin" size={18} /><span className="sr-only">Salvando</span></> : acaoDireita.rotulo}
          </button> : <span />}
        </header>
        <div className="premium-sheet-content">{children}</div>
        {footer && <footer className="premium-sheet-footer">{footer}</footer>}
      </section>
    </dialog>, document.body);
}

'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalTone = 'dark' | 'gold' | 'orange';

type Action = { label: string; onClick?: () => void };

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: ReactNode;
  tone?: ModalTone;
  primary?: Action;
  secondary?: Action;
}

const TONE: Record<ModalTone, { ring: string; title: string; btn: string }> = {
  dark: { ring: 'border-border', title: 'text-text', btn: 'bg-surface-2 text-text border border-border hover:border-primary' },
  gold: { ring: 'border-gold', title: 'text-gold', btn: 'bg-gold text-bg hover:opacity-90' },
  orange: { ring: 'border-primary', title: 'text-primary', btn: 'bg-primary text-on-primary hover:opacity-90' },
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({ open, onClose, title, message, tone = 'orange', primary, secondary }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // open: mount, then show on the next frame (fade/scale in). close: fade out, then unmount.
  useEffect(() => {
    let raf = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      lastFocus.current = document.activeElement as HTMLElement;
      raf = requestAnimationFrame(() => {
        setMounted(true);
        raf = requestAnimationFrame(() => setShown(true));
      });
    } else {
      raf = requestAnimationFrame(() => setShown(false));
      t = setTimeout(() => { setMounted(false); lastFocus.current?.focus?.(); }, 200);
    }
    return () => { cancelAnimationFrame(raf); if (t) clearTimeout(t); };
  }, [open]);

  useEffect(() => {
    if (!mounted || !open) return;
    const el = panel.current;
    (el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !el) return;
      const f = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mounted, open]);

  if (!mounted) return null;
  const t = TONE[tone];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" data-testid="modal">
      <div
        aria-hidden
        data-testid="modal-backdrop"
        onClick={() => closeRef.current()}
        className={`absolute inset-0 bg-bg/70 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative w-full max-w-sm rounded-2xl border ${t.ring} bg-surface-1 p-6 shadow-[var(--shadow-1)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${shown ? 'opacity-100 scale-100' : 'opacity-0 scale-95 motion-reduce:scale-100'}`}
      >
        <h2 id="modal-title" className={`text-xl font-bold ${t.title}`}>{title}</h2>
        {message && <div className="mt-2 text-sm leading-relaxed text-text-2">{message}</div>}
        {(primary || secondary) && (
          <div className="mt-6 flex justify-end gap-3">
            {secondary && (
              <button type="button" onClick={secondary.onClick ?? onClose} className="rounded-xl border border-border px-4 py-2 text-sm text-text-2 transition-colors hover:border-primary hover:text-primary">
                {secondary.label}
              </button>
            )}
            {primary && (
              <button type="button" data-autofocus onClick={primary.onClick ?? onClose} className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${t.btn}`}>
                {primary.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

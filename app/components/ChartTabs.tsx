'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);
let lastIdx = -1; // survives the remount between 本命盘 and transit layouts

export type ChartViewId = 'natal' | 'day' | 'month' | 'year';
const TABS: { id: ChartViewId; label: string }[] = [
  { id: 'natal', label: '本命盘' }, { id: 'day', label: '流日' }, { id: 'month', label: '流月' }, { id: 'year', label: '流年' },
];

/** Segmented sub-nav (§4c): tablist with arrow-key navigation; scrolls horizontally on mobile. */
export default function ChartTabs({ value, onChange }: { value: ChartViewId; onChange: (v: ChartViewId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const barRef = useRef<HTMLSpanElement>(null);
  const flipRef = useRef<gsap.core.Timeline | null>(null);
  // orange underline: GSAP Flip from previous tab to active tab (0.35s power3.out); reduced motion = jump
  useLayoutEffect(() => {
    const idx = TABS.findIndex((t) => t.id === value);
    const bar = barRef.current; const btn = refs.current[idx];
    if (!bar || !btn) return;
    const place = (b: HTMLElement) => gsap.set(bar, { left: b.offsetLeft, width: b.offsetWidth, x: 0 });
    flipRef.current?.kill();
    const prev = lastIdx >= 0 ? refs.current[lastIdx] : null;
    lastIdx = idx;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prev || prev === btn || reduce) { place(btn); return; }
    place(prev);
    const st = Flip.getState(bar);
    place(btn);
    flipRef.current = Flip.from(st, { duration: 0.35, ease: 'power3.out', scale: false });
  }, [value]);
  useEffect(() => () => { flipRef.current?.kill(); }, []);
  useEffect(() => { refs.current[TABS.findIndex((t) => t.id === value)]?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [value]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + TABS.length) % TABS.length;
    onChange(TABS[n].id); refs.current[n]?.focus();
  };
  return (
    <div className="relative max-w-full">
      <div role="tablist" aria-label="星盘视图" className="relative inline-flex max-w-full overflow-x-auto snap-x gap-1 [scrollbar-width:none]">
        {TABS.map((t, i) => {
          const on = t.id === value;
          return (
            <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}
              className={`snap-start shrink-0 px-[18px] pt-2 pb-3 rounded-[8px] text-[16px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${on ? 'text-primary font-semibold' : 'text-text-2 hover:text-text'}`}>
              {t.label}
            </button>
          );
        })}
        <span ref={barRef} aria-hidden className="absolute bottom-0 left-0 h-[2px] rounded-full bg-primary pointer-events-none" />
      </div>
    </div>
  );
}

'use client';
import { t as tx } from '../i18n';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

type Mode = 'day' | 'month' | 'year';
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => { const t = new Date(y, m, d); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
const parts = (s: string) => { const [y, m, d] = s.split('-').map(Number); return { y, m: m - 1, d }; };
const WEEK = () => ([tx('日'), tx('一'), tx('二'), tx('三'), tx('四'), tx('五'), tx('六')]);

/** Themed period picker (§4c): calendar grid (流日), month grid (流月), year list (流年). Keyboard: arrows/PageUp/PageDown/Home/End, Enter selects, Escape closes. */
export default function PeriodPicker({ mode, value, today, minYear, maxYear, onChange, children }: {
  mode: Mode; value: string; today: string; minYear: number; maxYear: number; onChange: (v: string) => void; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(value); // keyboard cursor (ISO date)
  const [viewYM, setViewYM] = useState(() => { const p = parts(value); return { y: p.y, m: p.m }; });
  const rootRef = useRef<HTMLDivElement>(null);
  const trigRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const openPicker = () => { const p = parts(value); setCur(value); setViewYM({ y: p.y, m: p.m }); setOpen(true); };
  const close = (refocus = true) => { setOpen(false); if (refocus) trigRef.current?.focus(); };
  const pick = (v: string) => { onChange(v); close(); };

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('pointerdown', down);
    return () => document.removeEventListener('pointerdown', down);
  }, [open]);

  // keep focus on the cursor cell
  useLayoutEffect(() => {
    if (!open) return;
    const el = panelRef.current?.querySelector<HTMLElement>('[data-cur="true"]');
    el?.focus({ preventScroll: true });
    if (mode === 'year' && listRef.current) { // 5 full rows (48px pitch), cursor's row in the middle
      const row = Math.floor((parts(cur).y - minYear) / 3);
      listRef.current.scrollTop = Math.max(0, (row - 2) * 48);
    }
  }, [open, cur, viewYM, mode]);

  const c = parts(cur);
  const clampY = (y: number) => Math.min(maxYear, Math.max(minYear, y));
  const moveTo = (v: string) => { const p = parts(v); if (p.y < minYear || p.y > maxYear) return; setCur(v); setViewYM({ y: p.y, m: p.m }); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') return;
    let next: string | null = null;
    if (mode === 'day') {
      const map: Record<string, () => string> = {
        ArrowLeft: () => iso(c.y, c.m, c.d - 1), ArrowRight: () => iso(c.y, c.m, c.d + 1),
        ArrowUp: () => iso(c.y, c.m, c.d - 7), ArrowDown: () => iso(c.y, c.m, c.d + 7),
        PageUp: () => iso(c.y, c.m - 1, Math.min(c.d, new Date(c.y, c.m, 0).getDate())),
        PageDown: () => iso(c.y, c.m + 1, Math.min(c.d, new Date(c.y, c.m + 2, 0).getDate())),
        Home: () => iso(c.y, c.m, 1), End: () => iso(c.y, c.m + 1, 0),
      };
      next = map[e.key]?.() ?? null;
    } else if (mode === 'month') {
      const d: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3, PageUp: -12, PageDown: 12 };
      if (e.key in d) next = iso(c.y, c.m + d[e.key], 1);
      if (e.key === 'Home') next = iso(c.y, 0, 1);
      if (e.key === 'End') next = iso(c.y, 11, 1);
    } else {
      const d: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, PageUp: -10, PageDown: 10 };
      if (e.key in d) next = iso(clampY(c.y + d[e.key]), 0, 1);
      if (e.key === 'Home') next = iso(minYear, 0, 1);
      if (e.key === 'End') next = iso(maxYear, 0, 1);
    }
    if (next) { e.preventDefault(); moveTo(next); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(cur); }
  };

  const cell = 'rounded-[10px] text-[15px] num transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ob-sheet';
  const state = (sel: boolean, isToday: boolean) =>
    `relative ${sel ? 'bg-primary text-on-primary font-semibold' : 'text-text hover:bg-primary-soft'} ${isToday ? "after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-[3px] after:w-1 after:h-1 after:rounded-full " + (sel ? 'after:bg-on-primary' : 'after:bg-primary') : ''}`;
  const navBtn = 'w-8 h-8 rounded-[8px] flex items-center justify-center text-text-2 hover:text-primary hover:bg-primary-soft disabled:opacity-35';

  const v = parts(value), t = parts(today);
  let body: React.ReactNode;
  if (mode === 'day') {
    const { y, m } = viewYM;
    const first = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, i) => i - first + 1);
    body = (
      <>
        <div className="flex items-center justify-between mb-2">
          <button type="button" tabIndex={-1} aria-label={tx('上个月')} disabled={y <= minYear && m === 0} onClick={() => moveTo(iso(y, m - 1, 1))} className={navBtn}><Icon name="arrow_left" size={16} /></button>
          <span className="text-[16px] font-semibold text-text num" aria-live="polite">{tx('{0}年{1}月', [y, m + 1])}</span>
          <button type="button" tabIndex={-1} aria-label={tx('下个月')} disabled={y >= maxYear && m === 11} onClick={() => moveTo(iso(y, m + 1, 1))} className={navBtn}><Icon name="arrow_right" size={16} /></button>
        </div>
        <div role="grid" aria-label={tx('{0}年{1}月', [y, m + 1])} className="grid grid-cols-7 gap-1">
          {WEEK().map((w) => <span key={w} role="columnheader" className="h-8 flex items-center justify-center text-[13px] text-text-3">{w}</span>)}
          {cells.map((d, i) => {
            if (d < 1 || d > days) return <span key={i} className="h-9" />;
            const s = iso(y, m, d);
            const isCur = s === cur;
            return (
              <button key={i} type="button" role="gridcell" tabIndex={isCur ? 0 : -1} data-cur={isCur} aria-selected={s === value}
                aria-label={tx('{0}年{1}月{2}日 星期{3}', [y, m + 1, d, WEEK()[(first + d - 1) % 7]])} aria-current={s === today ? 'date' : undefined}
                onClick={() => pick(s)} className={`h-9 ${cell} ${state(s === value, s === today)}`}>{d}</button>
            );
          })}
        </div>
      </>
    );
  } else if (mode === 'month') {
    const y = viewYM.y;
    body = (
      <>
        <div className="flex items-center justify-between mb-2">
          <button type="button" tabIndex={-1} aria-label={tx('上一年')} disabled={y <= minYear} onClick={() => moveTo(iso(y - 1, c.m, 1))} className={navBtn}><Icon name="arrow_left" size={16} /></button>
          <span className="text-[16px] font-semibold text-text num" aria-live="polite">{tx('{0}年', [y])}</span>
          <button type="button" tabIndex={-1} aria-label={tx('下一年')} disabled={y >= maxYear} onClick={() => moveTo(iso(y + 1, c.m, 1))} className={navBtn}><Icon name="arrow_right" size={16} /></button>
        </div>
        <div role="grid" aria-label={tx('{0}年', [y])} className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, m) => {
            const isCur = c.y === y && c.m === m;
            return (
              <button key={m} type="button" role="gridcell" tabIndex={isCur ? 0 : -1} data-cur={isCur} aria-selected={v.y === y && v.m === m}
                aria-label={tx('{0}年{1}月', [y, m + 1])} onClick={() => pick(iso(y, m, 1))}
                className={`h-11 ${cell} ${state(v.y === y && v.m === m, t.y === y && t.m === m)}`}>{tx('{0}月', [m + 1])}</button>
            );
          })}
        </div>
      </>
    );
  } else {
    body = (
      <div className="relative">
      <ul ref={listRef} role="listbox" aria-label={tx('选择年份')} className="h-[232px] overflow-y-auto grid grid-cols-3 auto-rows-[40px] gap-2 snap-y snap-mandatory [scrollbar-width:none] py-0">
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map((y) => {
          const isCur = c.y === y;
          return (
            <li key={y} role="option" aria-selected={v.y === y} tabIndex={isCur ? 0 : -1} data-cur={isCur}
              onClick={() => pick(iso(y, 0, 1))} className={`h-10 snap-start flex items-center justify-center cursor-pointer ${cell} ${state(v.y === y, t.y === y)}`}>{y}</li>
          );
        })}
      </ul>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-ob-sheet to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-ob-sheet to-transparent" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative md:static">
      <button ref={trigRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openPicker(); } }}
        className={`flex items-center gap-2 px-3 h-10 rounded-[10px] border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${open ? 'border-primary bg-ob-field' : 'border-transparent hover:border-ob-border'}`}>
        {children}
      </button>
      {open && (
        <div ref={panelRef} role="dialog" aria-label={mode === 'day' ? tx('选择日期') : mode === 'month' ? tx('选择月份') : tx('选择年份')} onKeyDown={onKey}
          className="absolute z-50 top-[calc(100%+8px)] left-1/2 -translate-x-1/2 md:left-auto md:right-0 md:translate-x-0 w-[300px] p-3 bg-ob-sheet border border-ob-border rounded-[var(--r-card)] shadow-[var(--shadow-1)]">
          {body}
          <div className="mt-3 pt-3 border-t border-ob-border flex justify-between items-center">
            <span className="text-[13px] text-text-3">{tx('Esc 关闭 · 方向键选择')}</span>
            <button type="button" onClick={() => pick(today)} className="text-[15px] text-primary hover:underline">{mode === 'day' ? tx('今天') : mode === 'month' ? tx('本月') : tx('今年')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

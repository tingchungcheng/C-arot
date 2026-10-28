'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface WheelItem { value: number; label: string; disabled?: boolean }

const ROW = 44;

interface Props {
  items: WheelItem[];
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

/** One scroll-snap wheel column (5 visible rows x 44px). role=spinbutton with arrow/PageUp/PageDown keys. */
export default function WheelColumn({ items, value, onChange, ariaLabel, disabled, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmatic = useRef(false);
  const selIdx = Math.max(0, items.findIndex((i) => i.value === value));
  const [centerIdx, setCenterIdx] = useState(selIdx);

  const nearestEnabled = useCallback((idx: number) => {
    idx = Math.min(items.length - 1, Math.max(0, idx));
    if (!items[idx]?.disabled) return idx;
    for (let d = 1; d < items.length; d++) {
      if (idx - d >= 0 && !items[idx - d].disabled) return idx - d;
      if (idx + d < items.length && !items[idx + d].disabled) return idx + d;
    }
    return idx;
  }, [items]);

  const scrollToIdx = useCallback((idx: number, smooth: boolean) => {
    const el = ref.current;
    if (!el) return;
    programmatic.current = true;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: idx * ROW, behavior: smooth && !reduce ? 'smooth' : 'auto' });
    setCenterIdx(idx);
    setTimeout(() => { programmatic.current = false; }, smooth ? 350 : 50);
  }, []);

  // keep the wheel in sync with an externally-set value (typed input, clamping)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.round(el.scrollTop / ROW) !== selIdx) scrollToIdx(selIdx, false);
    else setCenterIdx(selIdx);
  }, [selIdx, scrollToIdx]);

  const commit = useCallback((idx: number) => {
    const target = nearestEnabled(idx);
    if (target !== idx) scrollToIdx(target, true);
    const item = items[target];
    if (item && item.value !== value) {
      if ('vibrate' in navigator) { try { navigator.vibrate?.(5); } catch { /* noop */ } }
      onChange(item.value);
    }
  }, [items, nearestEnabled, onChange, scrollToIdx, value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const idx = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
    setCenterIdx(idx);
    if (programmatic.current) return;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => commit(idx), 120);
  };

  const step = (delta: number) => {
    let idx = selIdx + delta;
    idx = Math.min(items.length - 1, Math.max(0, idx));
    // skip disabled values in the direction of travel
    while (items[idx]?.disabled && idx > 0 && idx < items.length - 1) idx += delta > 0 ? 1 : -1;
    if (items[idx]?.disabled) return;
    scrollToIdx(idx, true);
    onChange(items[idx].value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const map: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
    if (e.key in map) { e.preventDefault(); step(map[e.key]); }
    if (e.key === 'Home') { e.preventDefault(); step(-items.length); }
    if (e.key === 'End') { e.preventDefault(); step(items.length); }
  };

  return (
    <div
      ref={ref}
      className={`wheel-col ${disabled ? 'pointer-events-none' : ''} ${className}`}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuenow={value}
      aria-valuetext={items[selIdx]?.label}
      aria-valuemin={items[0]?.value}
      aria-valuemax={items[items.length - 1]?.value}
      aria-disabled={disabled || undefined}
    >
      <div style={{ height: ROW * 2 }} aria-hidden="true" />
      {items.map((it, i) => {
        const dist = Math.min(2, Math.abs(i - centerIdx));
        return (
          <div
            key={it.value}
            className="wheel-row"
            data-dist={dist}
            data-disabled={it.disabled ? 'true' : undefined}
            aria-hidden="true"
            onClick={() => { if (!it.disabled && !disabled) { scrollToIdx(i, true); onChange(it.value); } }}
          >
            {it.label}
          </div>
        );
      })}
      <div style={{ height: ROW * 2 }} aria-hidden="true" />
    </div>
  );
}

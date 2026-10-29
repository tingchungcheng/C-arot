'use client';
import { t as tx } from '../i18n';

import { useMemo, useState } from 'react';
import WheelColumn from './WheelColumn';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  value: string;           // HH:MM or ''
  unknown: boolean;
  onChange: (time: string) => void;
  onUnknownChange: (unknown: boolean) => void;
}

/** Hour/minute wheels themed like the date picker, plus the "不知道出生时间" toggle. */
export default function BirthTimePicker({ value, unknown, onChange, onUnknownChange }: Props) {
  const m = value.match(/^(\d{2}):(\d{2})$/);
  const [view, setView] = useState(() => (m ? { h: +m[1], mi: +m[2] } : { h: 12, mi: 0 }));
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ value: i, label: pad(i) })), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ value: i, label: pad(i) })), []);

  const set = (h: number, mi: number) => { setView({ h, mi }); onChange(`${pad(h)}:${pad(mi)}`); };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-text">{tx('出生时间 · 滑动选择')}</p>
        <p className="text-[13px] text-text-ob-2 num">{unknown ? tx('未知') : value || '—'}</p>
      </div>
      <div className="grid grid-cols-2 text-center text-[12px] text-text-ob-3 mb-2" aria-hidden="true"><span>{tx('时')}</span><span>{tx('分')}</span></div>
      <div className={`relative ob-field rounded-[14px] grid grid-cols-2 focus-within:shadow-[var(--focus-ring)] ${unknown ? 'opacity-50' : ''}`} aria-disabled={unknown || undefined}>
        <div className="wheel-band" aria-hidden="true" style={unknown ? { background: 'var(--c-ob-border)' } : undefined} />
        <WheelColumn ariaLabel={tx('出生小时')} items={hours} value={view.h} onChange={(h) => set(h, view.mi)} disabled={unknown} />
        <WheelColumn ariaLabel={tx('出生分钟')} items={minutes} value={view.mi} onChange={(mi) => set(view.h, mi)} disabled={unknown} />
      </div>
      {!value && !unknown && <p className="text-[13px] text-text-ob-2 mt-2">{tx('滑动或点选来确认时间')}</p>}

      <label className="mt-4 flex items-center justify-between gap-4 ob-field rounded-[14px] px-4 min-h-[56px] cursor-pointer">
        <span className="text-[15px] text-text">{tx('不知道出生时间')}</span>
        <input
          type="checkbox"
          role="switch"
          checked={unknown}
          onChange={(e) => { onUnknownChange(e.target.checked); if (e.target.checked) onChange(''); }}
          className="peer sr-only"
        />
        <span aria-hidden="true" className="relative w-12 h-7 rounded-full bg-ob-bg border border-ob-border peer-checked:bg-primary peer-checked:border-primary transition-colors peer-focus-visible:shadow-[var(--focus-ring)] after:absolute after:top-[3px] after:left-[3px] after:w-5 after:h-5 after:rounded-full after:bg-text after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-on-primary" />
      </label>
      {unknown && <p className="text-[13px] text-text-ob-2 mt-2">{tx('没关系 — 星盘仍可生成,但上升星座与宫位可能不准确。')}</p>}
    </div>
  );
}

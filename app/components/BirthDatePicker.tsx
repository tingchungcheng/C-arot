'use client';
import { t as tx } from '../i18n';

import { useMemo, useState } from 'react';
import WheelColumn, { type WheelItem } from './WheelColumn';
import ZodiacReveal from './ZodiacReveal';
import { zodiacFor } from './zodiac';

const MIN_YEAR = 1900;
const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();

export function parseISO(v: string): { y: number; m: number; d: number } | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

/** Parse DD/MM/YYYY; returns ISO yyyy-mm-dd or an error message. */
function parseTyped(s: string, today: Date): { iso?: string; error?: string } {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return { error: tx('请按 DD/MM/YYYY 格式输入') };
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12) return { error: tx('月份应在 1–12 之间') };
  if (y < MIN_YEAR) return { error: tx('年份不能早于 {0}', [MIN_YEAR]) };
  if (d < 1 || d > daysIn(y, mo)) return { error: tx('{0}年{1}月没有 {2} 日', [y, mo, d]) };
  const dt = new Date(y, mo - 1, d);
  if (dt > today) return { error: tx('出生日期不能晚于今天') };
  return { iso: `${y}-${pad(mo)}-${pad(d)}` };
}

function formatTyping(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

interface Props { value: string; onChange: (iso: string) => void }

export default function BirthDatePicker({ value, onChange }: Props) {
  const today = useMemo(() => new Date(), []);
  const ty = today.getFullYear(), tm = today.getMonth() + 1, td = today.getDate();
  const parsed = parseISO(value);
  // wheel display defaults to 01/01/2000 until the user picks
  const [view, setView] = useState(() => parsed ?? { y: 2000, m: 1, d: 1 });
  const [mode, setMode] = useState<'wheel' | 'type'>('wheel');
  const [typed, setTyped] = useState(() => (parsed ? `${pad(parsed.d)}/${pad(parsed.m)}/${parsed.y}` : ''));
  const [typedError, setTypedError] = useState('');

  const set = (next: { y: number; m: number; d: number }) => {
    // clamp day to month length and to today
    let { y, m, d } = next;
    if (y > ty) y = ty;
    if (y === ty && m > tm) m = tm;
    d = Math.min(d, daysIn(y, m));
    if (y === ty && m === tm && d > td) d = td;
    setView({ y, m, d });
    setTyped(`${pad(d)}/${pad(m)}/${y}`);
    setTypedError('');
    onChange(`${y}-${pad(m)}-${pad(d)}`);
  };

  const dayItems: WheelItem[] = useMemo(() => Array.from({ length: 31 }, (_, i) => {
    const d = i + 1;
    return { value: d, label: String(d), disabled: d > daysIn(view.y, view.m) || (view.y === ty && view.m === tm && d > td) };
  }), [view.y, view.m, ty, tm, td]);
  const monthItems: WheelItem[] = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    value: i + 1, label: tx('{0} 月', [i + 1]), disabled: view.y === ty && i + 1 > tm,
  })), [view.y, ty, tm]);
  const yearItems: WheelItem[] = useMemo(() => Array.from({ length: ty - MIN_YEAR + 1 }, (_, i) => ({ value: MIN_YEAR + i, label: String(MIN_YEAR + i) })), [ty]);

  const sign = parsed ? zodiacFor(parsed.m, parsed.d) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[13px] font-semibold text-text">{tx('出生日期 ·')} {mode === 'wheel' ? tx('滑动选择') : tx('手动输入')}</p>
        <button
          type="button"
          onClick={() => setMode(mode === 'wheel' ? 'type' : 'wheel')}
          className="text-[13px] font-medium text-text underline decoration-2 decoration-primary underline-offset-4 min-h-[44px] px-1"
        >
          {mode === 'wheel' ? tx('Type it instead · 手动输入') : tx('Use wheels · 滑动选择')}
        </button>
      </div>

      {mode === 'wheel' ? (
        <>
          <div className="grid grid-cols-[1fr_1.2fr_1.4fr] text-center text-[12px] text-text-ob-3 mb-2" aria-hidden="true">
            <span>{tx('@col:日')}</span><span>{tx('@col:月')}</span><span>{tx('@col:年')}</span>
          </div>
          <div className="relative ob-field rounded-[14px] grid grid-cols-[1fr_1.2fr_1.4fr] focus-within:shadow-[var(--focus-ring)]">
            <div className="wheel-band" aria-hidden="true" />
            <WheelColumn ariaLabel={tx('出生日')} items={dayItems} value={view.d} onChange={(d) => set({ ...view, d })} />
            <WheelColumn ariaLabel={tx('出生月份')} items={monthItems} value={view.m} onChange={(m) => set({ ...view, m })} />
            <WheelColumn ariaLabel={tx('出生年份')} items={yearItems} value={view.y} onChange={(y) => set({ ...view, y })} />
          </div>
          {!parsed && <p className="text-[13px] text-text-ob-2 mt-2">{tx('滑动或点选任意一列来确认日期')}</p>}
        </>
      ) : (
        <div>
          <label htmlFor="dob-typed" className="block text-[13px] font-medium text-text-ob-2 mb-2">{tx('日 / 月 / 年 (DD/MM/YYYY)')}</label>
          <input
            id="dob-typed"
            className="ob-input num text-[18px] tracking-wider"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="DD/MM/YYYY"
            value={typed}
            aria-invalid={!!typedError}
            aria-describedby="dob-typed-help"
            onChange={(e) => {
              const v = formatTyping(e.target.value);
              setTyped(v);
              if (v.length === 10) {
                const r = parseTyped(v, today);
                if (r.iso) { const p = parseISO(r.iso)!; setView(p); setTypedError(''); onChange(r.iso); }
                else { setTypedError(r.error!); onChange(''); }
              } else { setTypedError(''); if (value) onChange(''); }
            }}
            style={typedError ? { borderColor: 'var(--c-danger)' } : undefined}
          />
          <p id="dob-typed-help" className="text-[13px] mt-2 text-text-ob-2" role={typedError ? 'alert' : undefined}>
            {typedError || tx('例如 14/06/1998')}
          </p>
        </div>
      )}

      <div className="mt-4 md:hidden">
        <ZodiacReveal sign={sign} />
      </div>
    </div>
  );
}

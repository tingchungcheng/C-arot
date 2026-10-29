'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { t as tx } from '../i18n';
import Icon from './Icon';
import Modal from './Modal';
import { creditsStore, afford, type Affordance, type CreditState, type Feature, type Refusal } from './credits-store';
import { useAuthGate } from './AuthGateProvider';

/** The repo's carrot icon (Icon "carrot", icons-data.ts); `half` clips it to 50%. */
export function CarrotIcon({ size = 16, half = false, className = '' }: { size?: number; half?: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block shrink-0 overflow-hidden align-[-2px] ${className}`} style={{ width: half ? size / 2 : size, height: size }}>
      <Icon name="carrot" size={size} />
    </span>
  );
}

/** "· [carrot]2" suffix for a feature button. */
export function CarrotCost({ cost }: { cost?: number }) {
  const { status } = useAuthGate();
  if (status !== 'authenticated' || !cost) return null;
  return (
    <span className="inline-flex items-center gap-0.5 font-normal opacity-90" aria-label={tx('消耗 {0} 根胡萝卜', [cost])}>
      <span aria-hidden="true" className="mx-0.5">·</span><CarrotIcon size={15} />{fmt(cost)}
    </span>
  );
}

export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
export const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

export function useCredits() {
  const { status } = useAuthGate();
  const [state, setState] = useState<CreditState | null>(null);
  useEffect(() => {
    if (status === 'loading') return;
    let alive = true;
    // guests are keyed by the httpOnly carot_anon cookie; refetch when the identity changes
    creditsStore.getBalance().then((s) => alive && s && setState(s));
    const off = creditsStore.onChange((s) => setState(s));
    return () => { alive = false; off(); };
  }, [status]);
  return status === 'loading' ? null : state;
}

export function useAfford(feature: Feature): { a: Affordance | null; state: CreditState | null } {
  const state = useCredits();
  return { a: afford(state, feature), state };
}

/** Calm dimmed-button caption for a refusal. */
export function RefusalCaption({ a, state, className = '' }: { a: Affordance | null; state: CreditState | null; className?: string }) {
  if (!a || a.ok || !state) return null;
  return (
    <p role="status" data-testid="carrot-refusal" className={`mt-2 text-[13px] text-text-2 ${className}`}>
      {a.reason === 'daily_limit' ? tx('今日已抽牌 · 明日再来') : tx('胡萝卜不足 · {0} 补充', [hhmm(state.resetsAt)])}
    </p>
  );
}

/** Copy for a refusal that arrived mid-action (Modal). */
export function refusalMessage(r: Refusal) {
  return r.error === 'tarot_daily_limit' ? tx('今日已抽牌 · 明日再来') : tx('胡萝卜不足 · {0} 补充', [hhmm(r.resetsAt)]);
}

const FEATURES: { f: Feature; label: string }[] = [
  { f: 'tarot', label: '塔罗占卜' }, { f: 'combined', label: '综合解读' }, { f: 'chart_summary', label: '星盘总结' }, { f: 'chat', label: '星象对话' },
];

/** Header pill (Dev-05): 32px, ob-sheet fill, ob-border, 20px carrot, cream tabular number. */
export function CarrotBalance() {
  const { status } = useAuthGate();
  const state = useCredits();
  const [shown, setShown] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const pill = useRef<HTMLButtonElement>(null);
  const floatRef = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => creditsStore.onChange((s, charged) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!charged || reduce || !floatRef.current || !pill.current) { setShown(s.balance); return; }
    const o = { v: s.balance + charged };
    gsap.killTweensOf([floatRef.current, pill.current, o]);
    gsap.fromTo(floatRef.current, { opacity: 1, y: 0 }, { opacity: 0, y: -12, duration: 0.6, ease: 'power2.out' });
    gsap.fromTo(pill.current, { borderColor: 'var(--c-primary)' }, { borderColor: 'var(--c-ob-border)', duration: 0.3, ease: 'none' });
    gsap.to(o, { v: s.balance, duration: 0.5, ease: `steps(${Math.max(1, Math.round(charged * 2))})`, onUpdate: () => setShown(Math.round(o.v * 10) / 10) });
  }), []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close); window.addEventListener('keydown', close);
    return () => { window.removeEventListener('mousedown', close); window.removeEventListener('keydown', close); };
  }, [open]);
  if (!state || status !== 'authenticated') return null; // pill stays hidden for guests
  const v = shown ?? state.balance;
  const tone = v <= 0 ? 'text-text-2' : v < 2 ? 'text-gold' : 'text-text';
  return (
    <div ref={wrap} className="relative">
      <button ref={pill} type="button" data-testid="carrot-balance" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        title={v <= 0 ? tx('午夜补充') : undefined}
        aria-label={tx('今日剩余 {0} / {1}', [fmt(state.balance), fmt(state.allowance)])}
        className="relative inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-ob-sheet border border-ob-border">
        <span className="text-primary inline-flex"><Icon name="carrot" size={20} /></span>
        <span ref={floatRef} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-[5px] text-primary opacity-0"><Icon name="carrot" size={20} /></span>
        <span className={`num text-[14px] tabular-nums ${tone}`}>{fmt(v)}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={tx('今日胡萝卜')} className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-[12px] bg-ob-sheet border border-ob-border p-4 shadow-[var(--shadow-1)] text-[14px]">
          <p className="font-semibold text-text">{tx('今日剩余 {0} / {1}', [fmt(state.balance), fmt(state.allowance)])}</p>
          <ul className="mt-3 space-y-1.5 text-text-2">
            {FEATURES.map(({ f, label }) => (
              <li key={f} className="flex items-center justify-between"><span>{tx(label)}</span><span className="inline-flex items-center gap-0.5 tabular-nums"><CarrotIcon size={14} />{fmt(state.costs[f])}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-text-2">{tx('{0} 补充', [hhmm(state.resetsAt)])}</p>
          {/* future: 升级 link for paid tier */}
          <a hidden href="/settings" className="mt-3 text-primary">{tx('升级')}</a>
        </div>
      )}
    </div>
  );
}

/** Shown only when a refusal comes back after the user pressed the button. */
export function RefusalModal({ refusal, onClose }: { refusal: Refusal | null; onClose: () => void }) {
  return (
    <Modal open={!!refusal} onClose={onClose} tone="gold"
      title={refusal?.error === 'tarot_daily_limit' ? tx('今日已抽牌') : tx('胡萝卜不足')}
      message={refusal ? refusalMessage(refusal) : ''}
      primary={{ label: tx('知道了'), onClick: onClose }} />
  );
}

'use client';
import { t as tx, getLocale, localeHeaders } from '../i18n';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import type { BirthChartData } from '@/lib/astrology/calculator';
import type { TransitResult, TransitPeriod } from '@/lib/astrology/transits';
import { aspectTone, symbolFor, toneColor } from './TransitWheel';
import Icon from './Icon';
import PeriodPicker from './PeriodPicker';

interface BirthPayload { date: string; time?: string; latitude: number; longitude: number; timezone: string }
interface Turn { role: 'user' | 'assistant'; content: string; error?: string }

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const WEEK = () => (tx('日一二三四五六'));

function step(at: string, period: TransitPeriod, dir: number) {
  const d = parse(at);
  if (period === 'day') d.setDate(d.getDate() + dir);
  else if (period === 'month') { d.setDate(1); d.setMonth(d.getMonth() + dir); }
  else { d.setMonth(0, 1); d.setFullYear(d.getFullYear() + dir); }
  return iso(d);
}
const periodKey = (at: string, p: TransitPeriod) => (p === 'day' ? at : p === 'month' ? at.slice(0, 7) : at.slice(0, 4));
const label = (at: string, p: TransitPeriod, short = false) => {
  const d = parse(at);
  if (p === 'year') return tx('{0}年', [d.getFullYear()]);
  if (p === 'month') return tx('{0}年{1}月', [d.getFullYear(), d.getMonth() + 1]);
  return short ? tx('{0}月{1}日 周{2}', [d.getMonth() + 1, d.getDate(), WEEK()[d.getDay()]]) : tx('{0}年{1}月{2}日', [d.getFullYear(), d.getMonth() + 1, d.getDate()]);
};

const MODE = () => ({
  day: { reset: tx('今天'), focus: tx('今日重点'), noun: tx('这一天'), ctx: tx('流日'), chips: [tx('今天适合表白吗?'), tx('我该如何面对工作压力?'), tx('今天的幸运时段?')] },
  month: { reset: tx('本月'), focus: tx('本月重点'), noun: tx('这个月'), ctx: tx('流月'), chips: [tx('这个月的感情运势如何?'), tx('本月工作要注意什么?'), tx('这个月适合开始新计划吗?')] },
  year: { reset: tx('今年'), focus: tx('今年重点'), noun: tx('今年'), ctx: tx('流年'), chips: [tx('今年事业有什么机会?'), tx('今年的感情主题是什么?'), tx('今年最该专注什么?')] },
} as const);

const MEANING = (): Record<string, string> => ({
  Conjunction: tx('能量叠加,主题被放大'), Sextile: tx('小机会出现,主动把握'), Trine: tx('顺流助力,事半功倍'),
  Square: tx('张力推动你做出调整'), Opposition: tx('两端拉扯,寻找平衡'), Quincunx: tx('需要微调与适应'), Semisextile: tx('细微的提示'),
});

/** Bold markdown → primary; everything else as text. */
function Rich({ text }: { text: string }) {
  const parts = text.replace(/\*\*([^*]*)$/, '$1').split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="text-primary font-semibold">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}</>;
}

/** Transit header row + side panel. The wheel itself lives in the page (one instance across all tabs); data flows up via onTransit/onHighlight. */
export default function TransitView({ birth, birthYear, period, tabs, onTransit, onHighlight }: { natal?: BirthChartData; birth: BirthPayload; birthYear: number; period: TransitPeriod; tabs: React.ReactNode; onTransit: (t: TransitResult | null, loading: boolean) => void; onHighlight: (i: number | null) => void }) {
  const today = iso(new Date());
  const [atBy, setAtBy] = useState<Record<TransitPeriod, string>>({ day: today, month: today, year: today });
  const at = atBy[period];
  const key = 'chat'; // one thread across 流日/流月/流年 (history kept when switching tabs)
  const isCurrent = periodKey(at, period) === periodKey(today, period);
  const m = MODE()[period];

  const [transit, setTransit] = useState<TransitResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const setHl = onHighlight;

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true); setLoadErr(false);
    fetch('/api/transits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...birth, period, at }), signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: TransitResult) => { setTransit(j); setLoading(false); })
      .catch((e) => { if (e.name !== 'AbortError') { setLoadErr(true); setLoading(false); } });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, at, birth.date, birth.time, birth.latitude, birth.longitude]);

  useEffect(() => { onTransit(transit, loading); }, [transit, loading, onTransit]);

  // chat threads kept per period (restorable when stepping back)
  const [threads, setThreads] = useState<Record<string, Turn[]>>({});
  const [used, setUsed] = useState<Record<string, string[]>>({});
  const turns = threads[key] ?? [];
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'idle' | 'typing' | 'streaming'>('idle');
  const [limited, setLimited] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sheet, setSheet] = useState<'closed' | 'peek' | 'full'>('closed');

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [turns]);

  const setTurns = (fn: (t: Turn[]) => Turn[]) => setThreads((all) => ({ ...all, [key]: fn(all[key] ?? []) }));

  const ask = async (q: string, fromChip = false) => {
    const question = q.trim().slice(0, 200);
    if (!question || busy !== 'idle' || loading || limited) return;
    const history = turns.filter((t) => !t.error && t.content).slice(-6).map(({ role, content }) => ({ role, content }));
    if (fromChip) setUsed((u) => ({ ...u, [key]: [...(u[key] ?? []), q] }));
    else setInput('');
    setTurns((t) => [...t, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    setBusy('typing');
    const ac = new AbortController(); abortRef.current = ac;
    const patchLast = (p: Partial<Turn>) => setThreads((all) => { const t = [...(all[key] ?? [])]; t[t.length - 1] = { ...t[t.length - 1], ...p }; return { ...all, [key]: t }; });
    try {
      const res = await fetch('/api/transits/chat', { method: 'POST', headers: localeHeaders(), body: JSON.stringify({ ...birth, period, at, question, history, locale: getLocale() }), signal: ac.signal });
      if (res.status === 429) { setLimited(true); patchLast({ error: tx('今天问得够多啦,明天再来') }); return; }
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        patchLast({ content: acc }); setBusy('streaming');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { patchLast({ error: tx('白兔迷路了,请重试') }); if (!fromChip) setInput(question); }
    } finally { setBusy('idle'); abortRef.current = null; }
  };
  const retry = () => {
    const lastQ = [...turns].reverse().find((t) => t.role === 'user')?.content;
    if (!lastQ) return;
    setTurns((t) => t.slice(0, -2));
    setTimeout(() => ask(lastQ), 0);
  };

  const chips = m.chips.filter((c) => !(used[key] ?? []).includes(c));
  // 重点 rows: old fade + up 8px (0.15s), new fade in from 12px below (0.3s, stagger 0.06s); reduced = crossfade
  const [fx, setFx] = useState<TransitResult | null>(null);
  const focus = (fx?.aspects ?? []).slice(0, 3);
  const focusRef = useRef<HTMLUListElement>(null);
  const fxTl = useRef<gsap.core.Timeline | null>(null);
  const fxIn = useRef(false);
  useLayoutEffect(() => {
    if (!transit) return;
    fxTl.current?.kill();
    const rows = focusRef.current?.querySelectorAll('li');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fx || !rows?.length) { fxIn.current = true; setFx(transit); return; }
    fxTl.current = gsap.timeline().to(rows, { opacity: 0, duration: 0.15, ease: 'power1.in' })
      .add(() => { fxIn.current = true; setFx(transit); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transit]);
  useLayoutEffect(() => {
    if (!fxIn.current) return; fxIn.current = false;
    const rows = focusRef.current?.querySelectorAll('li');
    if (!rows?.length) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fxTl.current?.kill();
    fxTl.current = gsap.timeline().fromTo(rows, { opacity: 0 },
      { opacity: 1, duration: 0.3, stagger: reduce ? 0 : 0.06, ease: 'power1.out', clearProps: 'opacity' });
  }, [fx]);
  useEffect(() => () => { fxTl.current?.progress(1).kill(); slideTl.current?.progress(1).kill(); }, []); // finish (not freeze) on unmount

  // direction-aware slide of wheel + 重点 when switching 日→月→年 (from right) or back (from left); chat is not animated
  const ORDER = { day: 1, month: 2, year: 3 } as const;
  const prevPeriod = useRef<TransitPeriod | null>(null);
  const slideTl = useRef<gsap.core.Tween | null>(null);
  useLayoutEffect(() => {
    const prev = prevPeriod.current; prevPeriod.current = period;
    const dir = prev ? Math.sign(ORDER[period] - ORDER[prev]) : 1; // first mount comes from 本命盘 (leftmost)
    if (prev && !dir) return;
    slideTl.current?.kill();
    const els = document.querySelectorAll('[data-transit-slide]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void reduce; void dir; // side panel: crossfade only, no slide (wheel column never moves)
    slideTl.current = gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', clearProps: 'opacity' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const stepper = (
    <div className="relative flex items-center gap-2">
      <button type="button" aria-label={tx('上一个')} onClick={() => setAtBy((s) => ({ ...s, [period]: step(at, period, -1) }))} className="icon-btn w-10 h-10 rounded-[10px] border border-border-strong flex items-center justify-center text-text-2 hover:text-primary"><Icon name="arrow_left" size={18} /></button>
      <PeriodPicker mode={period} value={at} today={today} minYear={birthYear} maxYear={birthYear + 80}
        onChange={(v) => setAtBy((s) => ({ ...s, [period]: v }))}>
        <Icon name="calendar" size={18} className="text-text-2" />
        <span className="text-[17px] font-semibold text-text num"><span className="hidden md:inline">{label(at, period)}</span><span className="md:hidden">{label(at, period, true)}</span></span>
      </PeriodPicker>
      <button type="button" aria-label={tx('下一个')} onClick={() => setAtBy((s) => ({ ...s, [period]: step(at, period, 1) }))} className="icon-btn w-10 h-10 rounded-[10px] border border-border-strong flex items-center justify-center text-text-2 hover:text-primary"><Icon name="arrow_right" size={18} /></button>
      <button type="button" disabled={isCurrent} onClick={() => setAtBy((s) => ({ ...s, [period]: today }))}
        className={`h-10 px-4 rounded-[10px] text-[15px] ${isCurrent ? 'border border-dashed border-border-strong text-text-3' : 'border border-border-strong text-text hover:border-primary'}`}>{m.reset}</button>
    </div>
  );

  const chat = (inSheet: boolean) => (
    <section aria-labelledby="chat-h" className={`bg-surface-1 border border-border rounded-[var(--r-card)] flex flex-col ${inSheet ? 'h-full border-0 rounded-none' : 'min-h-[300px] max-h-[520px]'}`}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <span className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center"><Icon name="rabbit" size={20} /></span>
        <div className="flex-1 min-w-0">
          <h3 id="chat-h" className="text-[17px] text-text font-semibold">{tx('问问白兔')}</h3>
          <p className="text-[13px] text-text-3 truncate">{tx('已读取:本命盘 + {0}{1}行运', [label(at, period), m.ctx === tx('流日') ? '' : m.ctx])}</p>
        </div>
        {inSheet && <button type="button" onClick={() => setSheet('closed')} aria-label={tx('关闭')} className="text-text-2 px-2 text-[15px]">{tx('关闭')}</button>}
      </header>
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="text-center py-4">
            <span className="mx-auto w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold"><Icon name="pocket_watch" size={36} /></span>
            <p className="mt-3 text-[17px] text-text font-semibold">{tx('想知道{0}的星象对你意味着什么?', [m.noun])}</p>
            <p className="mt-1 text-[15px] text-text-2">{tx('白兔已读好你的本命盘和{0}行运,点一个问题开始。', [m.ctx])}</p>
          </div>
        )}
        {chips.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${turns.length === 0 ? 'justify-center' : ''}`}>
            {chips.map((c) => <button key={c} type="button" disabled={busy !== 'idle' || loading || limited} onClick={() => ask(c, true)} className="px-3.5 py-1.5 rounded-full text-[15px] text-text bg-surface-2 border border-border-strong hover:border-primary disabled:opacity-50">{c}</button>)}
          </div>
        )}
        {turns.map((t, i) => t.role === 'user' ? (
          <div key={i} className="flex justify-end"><p className="max-w-[78%] px-3.5 py-2 text-[15px] text-text bg-primary-soft border border-primary/40 rounded-[14px_14px_4px_14px]">{t.content}</p></div>
        ) : (
          <div key={i} className="flex items-start gap-2">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center"><Icon name="rabbit" size={16} /></span>
            <div className="max-w-[90%] px-3.5 py-2.5 text-[15px] leading-[1.7] text-text-2 bg-surface-2 rounded-[14px_14px_14px_4px]">
              {t.error ? (
                <p className="flex items-center gap-2"><Icon name="warning" size={16} className="text-danger" />{t.error}{!limited && <button type="button" onClick={retry} className="text-primary underline underline-offset-4">{tx('重试')}</button>}</p>
              ) : t.content ? (
                <p className="whitespace-pre-wrap"><Rich text={t.content} />{busy === 'streaming' && i === turns.length - 1 && <span aria-hidden="true" className="rd-cursor" />}</p>
              ) : (
                <span className="flex gap-1 py-1.5" aria-label={tx('白兔正在输入')}><i className="w-1.5 h-1.5 rounded-full bg-text-3 motion-safe:animate-bounce" /><i className="w-1.5 h-1.5 rounded-full bg-text-3 motion-safe:animate-bounce [animation-delay:.15s]" /><i className="w-1.5 h-1.5 rounded-full bg-text-3 motion-safe:animate-bounce [animation-delay:.3s]" /></span>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-end gap-2 px-4 py-3 border-t border-border">
        <div className="flex-1 relative">
          <textarea rows={1} value={input} maxLength={200} disabled={loading || limited}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(input); } }}
            placeholder={limited ? tx('今天问得够多啦,明天再来') : loading ? tx('星盘加载中…') : tx('问问白兔关于{0}的星象…', [m.noun])}
            aria-label={tx('向白兔提问')}
            className="w-full min-h-[46px] max-h-32 resize-none px-3.5 py-3 text-[15px] text-text bg-surface-2 border border-border-strong rounded-[12px] focus:border-primary focus:outline-none disabled:opacity-60" />
          {input.length >= 180 && <span className="absolute right-3 bottom-1 text-[12px] text-text-3 num">{input.length}/200</span>}
        </div>
        {busy !== 'idle' ? (
          <button type="button" onClick={() => abortRef.current?.abort()} aria-label={tx('停止')} className="w-[46px] h-[46px] rounded-[12px] bg-primary text-on-primary flex items-center justify-center"><span className="w-3.5 h-3.5 bg-on-primary rounded-[2px]" /></button>
        ) : (
          <button type="submit" aria-label={tx('发送')} disabled={!input.trim() || loading || limited} className="w-[46px] h-[46px] rounded-[12px] bg-primary text-on-primary flex items-center justify-center disabled:opacity-45"><Icon name="arrow_right" size={20} /></button>
        )}
      </form>
      {inSheet && <p className="px-4 pb-4 text-[15px] text-text-3 flex items-center gap-2"><Icon name="info" size={16} />{tx('塔罗与星盘是探索与反思的工具,非预测或专业建议。')}</p>}
    </section>
  );

  const skeleton = 'bg-[color-mix(in_srgb,var(--c-text)_6%,transparent)] rounded-[10px] motion-safe:animate-pulse';

  return (
    <>
      <div className="order-1 md:col-span-12 mt-6 pb-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">{tabs}{stepper}</div>

      <div className="order-3 md:col-span-12 xl:col-span-6 mt-6 space-y-4 pb-20 md:pb-0">
        <section data-transit-slide aria-labelledby="focus-h" className="bg-surface-1 border border-border rounded-[var(--r-card)] p-5">
          <h2 id="focus-h" className="text-[19px] text-text flex items-center gap-2 mb-2"><Icon name="star" size={20} className="text-gold" />{m.focus}</h2>
          {loadErr ? (
            <p className="py-3 text-[15px] text-text-2 flex items-center gap-2"><Icon name="warning" size={16} className="text-danger" />{tx('白兔迷路了,请重试')}<button type="button" onClick={() => setAtBy((s) => ({ ...s }))} className="text-primary underline">{tx('重试')}</button></p>
          ) : !fx && loading ? (
            <div className="space-y-3 py-2">{[0, 1, 2].map((i) => <div key={i} className={`${skeleton} h-12`} />)}</div>
          ) : focus.length === 0 ? (
            <p className="py-3 text-[15px] text-text-2">{tx('这段时间没有紧密的行运相位,适合按自己的节奏前进。')}</p>
          ) : (
            <ul ref={focusRef}>
              {focus.map((a, i) => {
                const tone = aspectTone(a.type);
                return (
                  <li key={`${a.transit_en}-${a.type}-${a.natal_en}`} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)} onFocus={() => setHl(i)} onBlur={() => setHl(null)} tabIndex={0}
                    className="grid grid-cols-[34px_1fr_auto] gap-3 items-center py-3 border-t border-border first:border-t-0 rounded-[8px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="w-[34px] h-[34px] rounded-full border flex items-center justify-center text-[16px]" style={{ borderColor: toneColor(tone), color: toneColor(tone), fontFamily: '"Segoe UI Symbol","Apple Symbols",serif' }}>{symbolFor(a.transit_en) + '\uFE0E'}</span>
                    <div>
                      <p className="text-[15px] text-text font-semibold">{tx('行运{0} {1} 本命{2}', [tx(a.transit), tx(a.type_zh), tx(a.natal)])}</p>
                      <p className="text-[15px] text-text-2">{MEANING()[a.type.charAt(0).toUpperCase() + a.type.slice(1).toLowerCase()] ?? tx('留意这一能量的提示')}</p>
                    </div>
                    <span className="text-[13px] text-text-3 text-right num"><span className={a.applying ? 'text-gold' : 'text-text-2'}>{a.applying ? tx('渐强') : tx('渐弱')}</span><br />{tx('容许')} {a.orb.toFixed(1)}°</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="hidden md:block">{chat(false)}</div>
        <p className="hidden md:flex items-center gap-2 text-[15px] text-text-3 bg-surface-1 border border-border rounded-[var(--r-card)] px-4 py-3"><Icon name="info" size={16} />{tx('塔罗与星盘是探索与反思的工具,非预测或专业建议。')}</p>
      </div>

      {/* mobile: bottom sheet */}
      <button type="button" onClick={() => setSheet('peek')} className="md:hidden fixed bottom-5 left-5 right-5 z-40 btn btn-primary shadow-[var(--shadow-1)]"><Icon name="rabbit" size={20} />{tx('问问白兔')}</button>
      {sheet !== 'closed' && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={tx('问问白兔')}>
          <button type="button" aria-label={tx('关闭')} className="absolute inset-0 bg-bg/60" onClick={() => setSheet('closed')} />
          <div className={`absolute left-0 right-0 bottom-0 bg-surface-1 border-t border-border rounded-t-[20px] flex flex-col transition-[height] duration-300 ${sheet === 'full' ? 'h-[92svh]' : 'h-[60svh]'}`}>
            <button type="button" aria-label={sheet === 'full' ? tx('收起') : tx('展开')} onClick={() => setSheet((s) => (s === 'full' ? 'peek' : 'full'))} className="mx-auto mt-2 mb-1 w-12 h-1.5 rounded-full bg-border-strong" />
            <div className="flex-1 min-h-0">{chat(true)}</div>
          </div>
        </div>
      )}
    </>
  );
}

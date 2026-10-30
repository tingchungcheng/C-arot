'use client';
import { t as tx, getLocale, localeHeaders } from '../i18n';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import PocketWatchTicking from '../components/PocketWatchTicking';
import TransitView from '../components/TransitView';
import ChartTabs, { type ChartViewId } from '../components/ChartTabs';

gsap.registerPlugin(Flip);
import Link from 'next/link';
import LoadingWatch from '../components/LoadingWatch';
import TransitWheel from '../components/TransitWheel';
import type { TransitResult } from '@/lib/astrology/transits';
import Icon from '../components/Icon';
import { CarrotCost, RefusalCaption, RefusalModal, useAfford } from '../components/Carrots';
import { creditsStore, readRefusal, type Refusal } from '../components/credits-store';
import { eclipticLon } from '../components/natal-geometry';
import { PLANETS } from '../components/zodiac';
import type { BirthChartData } from '@/lib/astrology/calculator';
import { birthChartCacheKey, chartSummaryCacheKey, readCachedJson, writeCachedJson } from '../components/profile-store';

interface StoredBirth { nickname?: string; date: string; time?: string; place: string; latitude?: number; longitude?: number; timezone?: string }
/** Locked summary shape (see app/api/birth-chart/interpret). */
interface ChartSummary { sun: string; moon: string; rising: string; traits: string[]; strength: string; challenge: string; summary: string }
interface ChartResponse { chartId?: string; chartData: BirthChartData; summary: string; interpretation: string }

const fmtDeg = (p?: { sign: string; degree: number }) => (p ? `${tx(p.sign)} ${String(Math.floor(p.degree)).padStart(2, '0')}°` : '—');
const symbolOf = (en: string) => PLANETS.find((x) => x.name_en.toLowerCase() === en.toLowerCase())?.symbol ?? '';

export default function BirthChartPage() {
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [birthData, setBirthData] = useState<StoredBirth | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setViewState] = useState<ChartViewId>('natal');
  useEffect(() => {
    const read = () => { const v = new URLSearchParams(window.location.search).get('view'); setViewState(v === 'day' || v === 'month' || v === 'year' ? v : 'natal'); };
    read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read);
  }, []);
  const viewRef = useRef<ChartViewId>('natal');
  const prevViewRef = useRef<ChartViewId | null>(null);
  const setView = (v: ChartViewId) => {
    const commit = () => {
      const u = new URL(window.location.href);
      if (v === 'natal') u.searchParams.delete('view'); else u.searchParams.set('view', v);
      window.history.pushState(null, '', u); setViewState(v);
    };
    commit(); // the persistent wheel sequences its own ring fade + size tween
  };
  // last transit result is kept after leaving transit tabs so the outer ring can fade out
  const [transit, setTransit] = useState<TransitResult | null>(null);
  const [hl, setHl] = useState<number | null>(null);
  const onTransit = useCallback((t: TransitResult | null) => { if (t) setTransit(t); }, []);
  // 本命盘 side panel crossfades in when coming back from a transit tab (wheel stays put)
  useLayoutEffect(() => {
    const prev = prevViewRef.current; prevViewRef.current = view; viewRef.current = view;
    if (view !== 'natal' || !prev || prev === 'natal') return;
    const els = document.querySelectorAll('[data-natal-slide]');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void reduce; // crossfade only (same with reduced motion)
    const tw = gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', clearProps: 'opacity' });
    return () => { tw.kill(); gsap.set(els, { clearProps: 'opacity,transform' }); };
  }, [view]);
  const [summary, setSummary] = useState<ChartSummary | null>(null);
  const { a: chartAfford, state: credits } = useAfford('chart_summary');
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const sumRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  // GSAP Flip: idle button card morphs into the status bar (0.4s power2.inOut). Reduced motion: no Flip.
  useLayoutEffect(() => {
    const st = flipState.current; flipState.current = null;
    if (!st || !boxRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    Flip.from(st, { targets: boxRef.current, duration: 0.4, ease: 'power2.inOut', scale: false });
  }, [aiState]);

  const birthPayload = (data: StoredBirth) => ({
    date: data.date, time: data.time || undefined, place: data.place,
    latitude: data.latitude || 3.139, longitude: data.longitude || 101.687, timezone: data.timezone || 'Asia/Kuala_Lumpur',
  });
  // Restore a saved summary for this birth data (no API call).
  useEffect(() => {
    if (!birthData) return;
    const cached = readCachedJson<ChartSummary>(chartSummaryCacheKey(birthData, getLocale()));
    if (!cached?.sun || !Array.isArray(cached.traits)) return;
    let active = true;
    queueMicrotask(() => {
      if (active) { setSummary(cached); setAiState('done'); }
    });
    return () => { active = false; };
  }, [birthData]);

  const fetchSummary = async (regenerate = false) => {
    if (!birthData || aiState === 'loading') return;
    const locale = getLocale();
    if (!regenerate) {
      const cached = readCachedJson<ChartSummary>(chartSummaryCacheKey(birthData, locale));
      if (cached?.sun && Array.isArray(cached.traits)) { setSummary(cached); setAiState('done'); return; }
    }
    const prev = aiState;
    if (boxRef.current) flipState.current = Flip.getState(boxRef.current);
    setAiState('loading');
    const ac = new AbortController(); abortRef.current = ac;
    try {
      const res = await creditsStore.fetch('/api/birth-chart/interpret', {
        method: 'POST', headers: localeHeaders(), signal: ac.signal,
        body: JSON.stringify({ chartId: chart?.chartId, ...birthPayload(birthData), regenerate, locale }),
      });
      const refused = await readRefusal(res);
      if (refused) { setRefusal(refused); setAiState(prev === 'done' && summary ? 'done' : 'idle'); return; }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as { summary: ChartSummary };
      setSummary(json.summary);
      writeCachedJson(chartSummaryCacheKey(birthData, locale), json.summary);
      setAiState('done');
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setAiState(prev === 'done' && summary ? 'done' : 'idle'); return; }
      console.error('Chart summary failed:', e);
      setAiState('error');
    } finally { abortRef.current = null; }
  };

  // Reveal (design-system §4b): card rises, then rows stagger 0.08s; tags scale in. Reduced motion: instant.
  useEffect(() => {
    if (aiState !== 'done' || !sumRef.current) return;
    const root = sumRef.current;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.timeline()
        .from(root, { opacity: 0, y: 16, duration: 0.45, ease: 'power3.out' })
        .from(root.querySelectorAll('.sum-row'), { opacity: 0, y: 12, duration: 0.4, stagger: 0.08, ease: 'power3.out' }, '-=.2')
        .from(root.querySelectorAll('.sum-tag'), { scale: 0.9, duration: 0.3, stagger: 0.05, ease: 'power3.out' }, '<0.2');
    });
    mm.add('(prefers-reduced-motion: reduce)', () => { gsap.set([root, ...root.querySelectorAll('.sum-row,.sum-tag')], { opacity: 1, y: 0, scale: 1 }); });
    return () => mm.revert();
  }, [aiState, summary]);

  const handleGenerate = async (data: StoredBirth) => {
    const cached = readCachedJson<ChartResponse>(birthChartCacheKey(data));
    if (cached?.chartData?.planets) { setChart(cached); return; }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: localeHeaders(),
        body: JSON.stringify({
          locale: getLocale(),
          nickname: data.nickname,
          date: data.date,
          time: data.time || undefined,
          place: data.place,
          latitude: data.latitude || 3.139,
          longitude: data.longitude || 101.687,
          timezone: data.timezone || 'Asia/Kuala_Lumpur',
          deferInterpretation: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to generate chart');
      const json = (await response.json()) as ChartResponse;
      writeCachedJson(birthChartCacheKey(data), json);
      setChart(json);
    } catch (e) {
      console.error('Error generating chart:', e);
      setError(tx('生成星盘失败,请稍后再试。'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const raw = localStorage.getItem('birthData');
    if (raw) {
      const parsed = JSON.parse(raw) as StoredBirth;
      queueMicrotask(() => {
        if (!active) return;
        setBirthData(parsed);
        if (parsed.place) void handleGenerate(parsed);
      });
    }
    queueMicrotask(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg pt-16 md:pt-20 flex items-center justify-center">
        <LoadingWatch message={tx('正在计算星盘...')} />
      </div>
    );
  }

  if (ready && !birthData) {
    return (
      <div className="min-h-screen bg-bg pt-16 md:pt-20 px-5 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <Icon name="star" size={48} className="text-gold mx-auto mb-4" />
          <h2 className="text-[24px] text-text mb-2">{tx('请先完成个人资料')}</h2>
          <p className="text-[15px] text-text-2 mb-6">{tx('星盘需要你的出生日期、时间与地点。')}</p>
          <Link href="/onboarding" className="btn btn-primary">{tx('前往填写')} <Icon name="arrow_right" size={20} /></Link>
        </div>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="min-h-screen bg-bg pt-24 px-5">
        <div className="mx-auto max-w-xl text-center">
          <Icon name="chart_wheel" size={48} className="text-gold mx-auto mb-4" />
          <h1 className="text-[32px] text-text mb-4">{tx('你的星盘')}</h1>
          {error && <p className="mb-4 flex justify-center items-center gap-2 text-[15px] text-danger"><Icon name="warning" size={20} />{error}</p>}
          {birthData && <button onClick={() => handleGenerate(birthData)} className="btn btn-primary">{tx('生成星盘')} <Icon name="sparkle" size={20} /></button>}
        </div>
      </div>
    );
  }

  const { chartData } = chart;
  // Ascendant, houses and rising sign come straight from lib (equal houses; houses[0] = ascendant longitude).
  const houses = chartData.houses;
  const asc = houses?.length ? houses[0] : chartData.rising ? eclipticLon(chartData.rising) : undefined;
  const risingPos = chartData.rising;
  const cards = [
    ...(risingPos ? [{ key: 'asc', label: tx('上升'), sym: 'AC', pos: risingPos, house: undefined as number | undefined }] : []),
    ...chartData.planets.map((p) => ({ key: p.planet_en, label: tx(p.planet), sym: symbolOf(p.planet_en), pos: p as { sign: string; degree: number }, house: p.house })),
  ];
  const dateLabel = birthData?.date ? birthData.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => tx('{0}年{1}月{2}日', [y, +m, +d])) : '';

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20 pb-16">
      <div className="mx-auto max-w-[1312px] px-5 md:px-10 xl:px-16 pt-8 flex flex-col md:grid md:grid-cols-12 md:gap-6">
        <div className="md:col-span-12 md:flex md:items-end md:justify-between md:gap-6">
          <div>
          <p className="overline text-primary">{tx('Chart · 出生星盘')}</p>
          <h1 className="text-[32px] leading-[1.2] tracking-[0.04em] text-text mt-2">{birthData?.nickname?.trim() ? tx('{0}的星盘', [birthData.nickname.trim()]) : tx('你的出生星盘')}</h1>
          </div>
          <p className="mt-2 flex items-center gap-2 text-[15px] text-text-2"><Icon name="pin" size={18} />{birthData?.place}{dateLabel && ` · ${dateLabel}`}{birthData?.time && ` ${birthData.time}`}</p>
        </div>

        {/* one wheel instance for all four tabs (stable child position; CSS order places it) */}
        <div className="order-2 md:col-span-12 xl:col-span-6 mt-6 xl:sticky xl:top-[96px] xl:self-start">
          <TransitWheel natal={chartData} transit={transit} highlight={view === 'natal' ? null : hl} mode={view === 'natal' ? 'natal' : 'transit'} />
          {/* legends crossfade (stacked in one grid cell); 流年 caption stays under the transit legend */}
          <div className="mt-4 grid">
            <ul aria-hidden={view !== 'natal'} className={`[grid-area:1/1] flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-text-2 justify-center self-start transition-opacity duration-300 ${view === 'natal' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <li className="flex items-center gap-2"><span className="w-5 h-0.5 bg-primary" />{tx('紧张相位')}</li>
              <li className="flex items-center gap-2"><span className="w-5 h-0.5 bg-gold" />{tx('和谐相位')}</li>
              <li className="flex items-center gap-2"><span className="w-5 border-t border-dashed border-text-3" />{tx('次要')}</li>
            </ul>
            <div aria-hidden={view === 'natal'} className={`[grid-area:1/1] transition-opacity duration-300 ${view !== 'natal' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-text-2 justify-center">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-text" />{tx('本命(内圈)')}</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{tx('行运(外圈)')}</li>
                <li className="flex items-center gap-2"><span className="w-5 h-0.5 bg-gold" />{tx('和谐')}</li>
                <li className="flex items-center gap-2"><span className="w-5 h-0.5 bg-primary" />{tx('紧张')}</li>
              </ul>
              {view === 'year' && <p className="mt-2 text-center text-[13px] leading-[18px] text-text-2">{tx('流年仅显示木星及以外慢行星')}</p>}
            </div>
          </div>
        </div>

        {view === 'natal' ? (
          <>
            <div className="order-1 md:col-span-12 mt-6 pb-4 border-b border-border"><ChartTabs value={view} onChange={setView} /></div>
        <div data-natal-slide className="order-3 md:col-span-12 xl:col-span-6 mt-6 space-y-4">
          <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3" aria-label={tx('行星位置')}>
            {cards.map((c) => (
              <li key={c.key} className="bg-surface-1 border border-border rounded-[var(--r-card)] p-3">
                <p className="text-[13px] text-text-2 flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-gold w-4 text-center" style={{ fontFamily: '"Segoe UI Symbol","Apple Symbols","Noto Sans Symbols",serif' }}>{c.sym === 'AC' ? 'AC' : c.sym + '\uFE0E'}</span>
                  {c.label}{c.house ? <span className="ml-auto num text-text-3">{tx('{0}宫', [c.house])}</span> : null}
                </p>
                <p className="text-[16px] font-bold text-text mt-1">{fmtDeg(c.pos)}</p>
              </li>
            ))}
          </ul>

          {aiState !== 'done' && (
            <section ref={boxRef} aria-label={tx('星盘摘要')} aria-busy={aiState === 'loading'} className={`bg-surface-1 rounded-[var(--r-card)] p-5 ${aiState === 'loading' ? 'border-[1.5px] border-primary' : 'border border-border'}`}>
              {aiState === 'idle' && (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <span className="shrink-0 w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center text-gold"><Icon name="pocket_watch" size={36} /></span>
                  <div className="flex-1">
                    <h3 className="text-[18px] text-text font-semibold">{tx('让白兔读一读你的星盘')}</h3>
                    <p className="text-[15px] text-text-2 mt-1">{tx('用 AI 把太阳、月亮、上升整理成一张简明摘要')}</p>
                  </div>
                  <button type="button" onClick={() => fetchSummary()} disabled={!!chartAfford && !chartAfford.ok} className="btn btn-primary md:w-auto px-5 disabled:opacity-50"><Icon name="sparkle" size={20} />{tx('生成星盘摘要')} <CarrotCost cost={chartAfford?.cost} /></button>
                  <RefusalCaption a={chartAfford} state={credits} />
                  <RefusalModal refusal={refusal} onClose={() => setRefusal(null)} />
                </div>
              )}
              {aiState === 'loading' && (
                <div className="min-h-[76px] -my-2 flex items-center gap-4">
                  <PocketWatchTicking size={48} className="shrink-0 text-gold" />
                  <div className="flex-1">
                    <p className="text-[15px] text-text font-semibold">{tx('白兔正在读你的星盘…')} <span className="text-text-3 font-normal">{tx('约 5 秒')}</span></p>
                    <span className="mt-2 block h-[3px] rounded-full bg-surface-3 overflow-hidden"><span className="block h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-gold motion-safe:animate-pulse" /></span>
                  </div>
                  <button type="button" onClick={() => abortRef.current?.abort()} className="text-[14px] text-text-2 underline underline-offset-4 hover:text-primary">{tx('取消')}</button>
                </div>
              )}
              {aiState === 'error' && (
                <div className="text-[15px] text-text-2">
                  <p className="flex items-center gap-2"><Icon name="warning" size={18} className="text-danger" />{tx('星盘摘要暂时不可用,请稍后再试。')}</p>
                  <button type="button" onClick={() => fetchSummary()} className="btn btn-secondary mt-3">{tx('重试')}</button>
                </div>
              )}
            </section>
          )}
          <p className="sr-only" aria-live="polite">{aiState === 'loading' ? tx('正在生成星盘摘要') : aiState === 'done' ? tx('星盘摘要已生成') : ''}</p>

          {aiState === 'done' && summary && (
            <section ref={sumRef} aria-labelledby="sum-h" className="sum-card bg-surface-1 border border-border rounded-[var(--r-card)] p-5 md:p-6">
              <h2 id="sum-h" className="text-[19px] text-text flex items-center gap-2 mb-5"><Icon name="crystal_ball" size={22} className="text-gold" />{tx('星盘摘要')}</h2>

              <h3 className="sum-row text-[17px] text-text font-semibold mb-2" style={{ fontFamily: 'var(--font-serif-zh, inherit)' }}>{tx('核心三要素')} <i className="text-[14px] text-gold font-normal" style={{ fontFamily: 'var(--font-display, serif)' }}>Big three</i></h3>
              <ul className="mb-6">
                {([
                  ['sun', tx('太阳'), chartData.sun?.sign && tx(chartData.sun.sign), summary.sun, 'text-gold border-gold/60'],
                  ['moon', tx('月亮'), chartData.moon?.sign && tx(chartData.moon.sign), summary.moon, 'text-text border-text/60'],
                  ['ascendant', tx('上升'), chartData.rising?.sign && tx(chartData.rising.sign), summary.rising, 'text-primary border-primary/60'],
                ] as const).filter((r) => r[3]).map(([ic, label, sign, line, ring]) => (
                  <li key={ic} className="sum-row grid grid-cols-[36px_48px_72px_1fr] items-center gap-3 py-3 border-t border-border">
                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${ring}`}><Icon name={ic} size={18} /></span>
                    <span className="text-[14px] text-text-2">{label}</span>
                    <span className="text-[15px] text-text font-bold">{sign ?? '—'}</span>
                    <span className="text-[15px] text-text-2">{line}</span>
                  </li>
                ))}
              </ul>

              <h3 className="sum-row text-[17px] text-text font-semibold mb-3">{tx('性格关键词')} <i className="text-[14px] text-gold font-normal" style={{ fontFamily: 'var(--font-display, serif)' }}>Keywords</i></h3>
              <ul className="sum-row flex flex-wrap gap-2 mb-6">
                {summary.traits.map((t) => <li key={t} className="sum-tag px-3.5 py-1 rounded-full text-[15px] text-text bg-surface-2 border border-border-strong">{t}</li>)}
              </ul>

              <h3 className="sum-row text-[17px] text-text font-semibold mb-3">{tx('优势 / 课题')} <i className="text-[14px] text-gold font-normal" style={{ fontFamily: 'var(--font-display, serif)' }}>Strengths · Lessons</i></h3>
              <div className="space-y-2.5 mb-6">
                <p className="sum-row flex items-center gap-3 text-[15px] text-text-2"><span aria-hidden="true" className="w-1 h-[22px] rounded-full bg-leaf" /><b className="text-leaf font-semibold">{tx('优势')}</b>{summary.strength}</p>
                <p className="sum-row flex items-center gap-3 text-[15px] text-text-2"><span aria-hidden="true" className="w-1 h-[22px] rounded-full bg-gold" /><b className="text-gold font-semibold">{tx('课题')}</b>{summary.challenge}</p>
              </div>

              <h3 className="sum-row text-[17px] text-text font-semibold mb-3">{tx('一句话总结')} <i className="text-[14px] text-gold font-normal" style={{ fontFamily: 'var(--font-display, serif)' }}>In one line</i></h3>
              <blockquote className="sum-row bg-primary-soft border-l-[3px] border-primary rounded-r-[10px] px-4 py-3 text-[18px] font-semibold text-text">“{summary.summary}”</blockquote>

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => fetchSummary(true)} className="text-[15px] text-text-2 underline underline-offset-4 hover:text-primary inline-flex items-center gap-1.5"><Icon name="reversed" size={16} />{tx('重新生成')}</button>
              </div>
            </section>
          )}
          <p className="flex items-center gap-2 text-[15px] text-text-3 bg-surface-1 border border-border rounded-[var(--r-card)] px-4 py-3"><Icon name="info" size={16} />{tx('塔罗与星盘是探索与反思的工具,非预测或专业建议。')}</p>


        </div>
          </>
        ) : (
          <TransitView
            key="transit"
            natal={chartData}
            period={view}
            tabs={<ChartTabs value={view} onChange={setView} />}
            onTransit={onTransit}
            onHighlight={setHl}
            birthYear={Number(birthData?.date?.slice(0, 4)) || 1990}
            birth={{ date: birthData!.date, time: birthData?.time || undefined, latitude: birthData?.latitude || 3.139, longitude: birthData?.longitude || 101.687, timezone: birthData?.timezone || 'Asia/Kuala_Lumpur' }}
          />
        )}
      </div>
    </div>
  );
}

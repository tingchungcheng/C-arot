'use client';
import { t as tx, cardName, getLocale, localeHeaders } from '../../../i18n';
import { setLastReadingId } from '../../../components/history-store';
import { CarrotCost, useAfford } from '@/app/components/Carrots';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import LoadingWatch from '@/app/components/LoadingWatch';
import CardTitle from '@/app/components/CardTitle';
import TarotArt, { artSrc, TarotNamedBack } from '@/app/components/TarotArt';
import Icon, { type IconName } from '../../../components/Icon';
import { Section, splitSections } from '../../../components/ReadingProse';
import { stripDevNotes } from '../../../components/Markdown';

interface MetaCard { id: string; position: number; position_label: string; orientation: 'upright' | 'reversed'; name_zh: string; name_en: string; number?: number; arcana?: string }
interface Meta { readingId: string; topic: string; question: string; cards: MetaCard[] }
type Phase = 'waiting' | 'streaming' | 'done' | 'stopped' | 'error';

const TOPIC = (): Record<string, { label: string; icon: IconName; tone: string }> => ({
  love: { label: tx('爱情'), icon: 'love', tone: 'text-primary' },
  career: { label: tx('事业'), icon: 'career', tone: 'text-gold' },
  personal_growth: { label: tx('个人成长'), icon: 'growth', tone: 'text-green' },
});
const POS = (): { label: string; icon: IconName }[] => ([{ label: tx('过去'), icon: 'past' }, { label: tx('现在'), icon: 'present' }, { label: tx('未来'), icon: 'future' }]);
const TOTAL_SECTIONS = 4;


/** Face-up placeholder frame: card-back checker border, gold inner frame, numeral, glyph, name. */
function CardFace({ c }: { c: MetaCard }) {
  const rev = c.orientation === 'reversed';
  const art = artSrc(c.id);
  if (art) return <TarotArt src={art} alt={`${cardName(c)}${rev ? tx('(逆位)') : ''}`} reversed={rev} className="shadow-[var(--shadow-1)]" />;
  // art only: the name/orientation are in the label rows below the card
  return <TarotNamedBack nameZh={c.name_zh} nameEn={c.name_en} reversed={rev} showName={false} className="shadow-[var(--shadow-1)]" />;
}

function ReadingResultContent() {
  const params = useParams();
  const router = useRouter();
  const readingId = params?.readingId as string;
  const [meta, setMeta] = useState<Meta | null>(null);
  const combCost = useAfford('combined').a?.cost;
  const [metaError, setMetaError] = useState(false);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('waiting');
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (regenerate = false) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setText('');
    setPhase('waiting');
    try {
      const res = await fetch(`/api/readings/${readingId}/stream${regenerate ? '?regenerate=1' : ''}`, { method: 'POST', headers: localeHeaders(), body: JSON.stringify({ locale: getLocale() }), signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(`status ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const t = dec.decode(value, { stream: true });
        if (t) { setText((s) => s + t); setPhase('streaming'); }
      }
      setPhase('done');
      setLastReadingId(readingId);
    } catch (e) {
      if (ac.signal.aborted) { setPhase('stopped'); return; }
      console.error('Reading stream failed:', e);
      setPhase('error');
    }
  }, [readingId]);

  useEffect(() => {
    if (!readingId) return;
    fetch(`/api/readings/${readingId}`, { headers: localeHeaders(false) }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then(setMeta).catch(() => setMetaError(true));
    run();
    return () => abortRef.current?.abort();
  }, [readingId, run]);

  const stop = () => abortRef.current?.abort();
  const busy = phase === 'waiting' || phase === 'streaming';
  const startAnotherReading = () => {
    if (!busy) router.push(`/tarot?restart=${Date.now()}`);
  };

  const { secs } = splitSections(stripDevNotes(text));
  const doneCount = phase === 'streaming' ? Math.max(0, secs.length - 1) : secs.length;
  const current = Math.min(Math.max(secs.length, 1), TOTAL_SECTIONS);
  const completed = phase === 'streaming' ? secs.slice(0, -1) : secs;
  const inProgress = phase === 'streaming' ? secs[secs.length - 1] : undefined;

  const save = () => {
    if (busy) return;
    const list = JSON.parse(localStorage.getItem('savedReadings') || '[]') as string[];
    if (!list.includes(readingId)) localStorage.setItem('savedReadings', JSON.stringify([readingId, ...list]));
    setSaved(true);
  };
  const share = async () => {
    if (busy) return;
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: tx('C-arot 塔罗解读'), url });
      else { await navigator.clipboard.writeText(url); }
      setShared(true);
    } catch { /* cancelled */ }
  };

  if (metaError) {
    return (
      <div className="min-h-screen bg-bg pt-24 px-5 text-center">
        <p className="text-[16px] text-text-2 mb-6">{tx('找不到这次占卜。')}</p>
        <Link href="/tarot" className="btn btn-primary">{tx('重新开始')} <Icon name="arrow_right" size={20} /></Link>
      </div>
    );
  }

  const topic = TOPIC()[meta?.topic ?? ''] ?? TOPIC().love;
  const actionCls = (extra = '') => `btn ${extra} aria-disabled:opacity-45 aria-disabled:pointer-events-none`;

  return (
    <div className="min-h-screen bg-bg pt-16 md:pt-20 pb-16">
      <div className="mx-auto max-w-[1312px] px-5 md:px-10 xl:px-16 pt-8 md:grid md:grid-cols-12 md:gap-6 xl:gap-x-12">
        {/* left: question, cards, actions (sticky on desktop) */}
        <aside className="md:col-span-5 md:self-start md:sticky md:top-28">
          <p className="overline text-primary">{tx('Tarot · Reading · 解读')}</p>
          <h1 className="text-[32px] md:text-[36px] leading-[1.2] tracking-[0.04em] text-text mt-2">{tx('你的三张牌')}</h1>
          <p className="mt-4 flex gap-3 items-center bg-surface-1 border border-border rounded-[12px] px-4 py-3 text-[15px] text-text">
            <Icon name={topic.icon} size={18} className={`${topic.tone} shrink-0`} />
            <span className="text-text-2 shrink-0">{topic.label} ·</span>
            <span className="truncate">“{meta?.question ?? '…'}”</span>
          </p>

          <ol className="mt-6 grid grid-cols-3 gap-3 md:gap-4" aria-label={tx('牌阵')}>
            {(meta?.cards ?? []).map((c, i) => (
              <li key={c.id + i} className="text-center flex flex-col items-stretch">
                {/* sized box so the card's h-full resolves and the labels flow below it (they used to overflow the row) */}
                <div className="relative w-full aspect-[2/3.5] shrink-0"><div className="absolute inset-0"><CardFace c={c} /></div></div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[15px] text-gold"><Icon name={POS()[i].icon} size={16} />{POS()[i].label}</p>
                <CardTitle primary={cardName(c)} secondary={getLocale() === 'zh' ? c.name_en : undefined} />
                <span className={`inline-block mt-3 rounded-full border px-2.5 py-0.5 text-[12px] ${c.orientation === 'reversed' ? 'border-gold/50 bg-gold/15 text-gold' : 'border-green/50 bg-green/15 text-green'}`}>
                  {c.orientation === 'reversed' ? tx('逆位') : tx('正位')}<span className="hidden md:inline"> · {c.orientation === 'reversed' ? 'Reversed' : 'Upright'}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="hidden md:flex mt-10 pt-6 border-t border-border gap-3 flex-wrap">
            <button type="button" onClick={save} aria-disabled={busy || undefined} className={actionCls('btn-secondary')}><Icon name={saved ? 'check' : 'star'} size={20} />{saved ? tx('已保存') : tx('保存')}</button>
            <button type="button" onClick={share} aria-disabled={busy || undefined} className={actionCls('btn-secondary')}><Icon name={shared ? 'check' : 'link'} size={20} />{shared ? tx('已复制链接') : tx('分享')}</button>
            <button type="button" onClick={startAnotherReading} aria-disabled={busy || undefined} className={actionCls('btn-primary')}><Icon name="tarot_cards" size={20} />{tx('再抽一次')}</button>
            <button type="button" onClick={() => { if (!busy) router.push(`/combined?readingId=${encodeURIComponent(readingId)}`); }} aria-disabled={busy || undefined} data-testid="go-combined" className={actionCls('btn-secondary')}><Icon name="crystal_ball" size={20} />{tx('生成综合解读')}<CarrotCost cost={combCost} /></button>
          </div>
        </aside>

        {/* right: status + reading */}
        <div className="md:col-span-7 mt-8 md:mt-0">
          {busy ? (
            <div className="bg-surface-1 border border-border rounded-[var(--r-card)] px-4 py-3 flex items-center gap-4" role="status">
              <span className="w-11 h-11 rounded-full border border-border-strong flex items-center justify-center text-gold shrink-0"><Icon name="pocket_watch" size={26} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-text"><span className="font-bold">{tx('白兔正在书写…')}</span> <span className="text-text-2">{tx('第 {0} / {1} 段', [current, TOTAL_SECTIONS])}</span></p>
                <div className="mt-2 h-[3px] rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-gold transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(Math.max(doneCount, 0.4) / TOTAL_SECTIONS) * 100}%` }} />
                </div>
              </div>
              <button type="button" onClick={stop} className="text-[15px] text-text-2 underline underline-offset-4 hover:text-text min-h-[44px] px-2">{tx('停止')}</button>
            </div>
          ) : phase === 'done' ? (
            <p className="flex items-center gap-2 text-[15px] text-green" role="status"><Icon name="check" size={18} />{tx('解读完成')}</p>
          ) : phase === 'stopped' ? (
            <p className="flex items-center gap-3 text-[15px] text-text-2" role="status">{tx('已停止书写')}
              <button type="button" onClick={() => run(true)} className="underline underline-offset-4 text-primary min-h-[44px]">{tx('重新生成')}</button></p>
          ) : (
            <p className="flex items-center gap-3 text-[15px] text-text-2" role="alert"><Icon name="warning" size={18} className="text-danger" />{tx('AI 解读暂时不可用,请稍后再试。')}
              <button type="button" onClick={() => run(true)} className="underline underline-offset-4 text-primary min-h-[44px]">{tx('重试')}</button></p>
          )}

          <article className="reading mt-8" aria-busy={busy}>
            {phase === 'waiting' && <div className="py-6 flex justify-center"><LoadingWatch message={tx('白兔正在翻开你的牌…')} /></div>}
            {/* completed sections are announced one at a time; the section being typed is hidden from AT until it completes */}
            <div aria-live="polite" aria-atomic="false">
              {completed.map((s, i) => <Section key={i} {...s} />)}
            </div>
            {inProgress && (
              <div aria-hidden="true">
                <Section {...inProgress} cursor={<span className="rd-cursor" />} />
              </div>
            )}
          </article>

          <p className="mt-10 flex gap-3 items-start bg-surface-1 border border-border rounded-[var(--r-card)] p-4 text-[15px] leading-[1.6] text-text-3 max-w-[68ch]">
            <Icon name="info" size={20} className="text-gold mt-0.5 shrink-0" />{tx('塔罗与星盘是探索与反思的工具,非预测或专业建议。')}
          </p>

          <div className="md:hidden mt-6 grid gap-3">
            <button type="button" onClick={startAnotherReading} aria-disabled={busy || undefined} className={actionCls('btn-primary w-full')}><Icon name="tarot_cards" size={20} />{tx('再抽一次')}</button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={save} aria-disabled={busy || undefined} className={actionCls('btn-secondary')}><Icon name={saved ? 'check' : 'star'} size={20} />{saved ? tx('已保存') : tx('保存')}</button>
              <button type="button" onClick={share} aria-disabled={busy || undefined} className={actionCls('btn-secondary')}><Icon name={shared ? 'check' : 'link'} size={20} />{shared ? tx('已复制') : tx('分享')}</button>
            </div>
            <button type="button" onClick={() => { if (!busy) router.push(`/combined?readingId=${encodeURIComponent(readingId)}`); }} aria-disabled={busy || undefined} data-testid="go-combined-m" className={actionCls('btn-secondary w-full')}><Icon name="crystal_ball" size={20} />{tx('生成综合解读')}<CarrotCost cost={combCost} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReadingResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg pt-20 flex items-center justify-center"><LoadingWatch message={tx('加载中...')} /></div>}>
      <ReadingResultContent />
    </Suspense>
  );
}

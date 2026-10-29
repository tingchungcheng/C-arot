'use client';
import { t as tx, cardName, getLocale, localeHeaders } from '../i18n';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isProfileComplete } from '../components/profile-store';
import LoadingWatch from '../components/LoadingWatch';
import Icon from '../components/Icon';
import { CarrotCost, RefusalCaption, RefusalModal, useAfford } from '../components/Carrots';
import { creditsStore, readRefusal, type Refusal } from '../components/credits-store';
import Modal from '../components/Modal';
import Markdown, { stripDevNotes } from '../components/Markdown';
import { historyStore, HistoryAccessError, getLastReadingId, formatZhDateTime, snippet, type CombinedHistoryEntry, type HistoryCard } from '../components/history-store';

const TOPIC_ZH = (): Record<string, string> => ({ love: tx('爱情'), career: tx('事业'), personal_growth: tx('个人成长'), general: tx('综合') });

function summary(e: CombinedHistoryEntry) {
  const topic = e.topic ? TOPIC_ZH()[e.topic] ?? e.topic : '';
  const cards = e.cards.map((c) => cardName(c) + (c.orientation === 'reversed' ? tx('(逆)') : '')).join(' · ');
  return [topic, cards].filter(Boolean).join(' ｜ ');
}

function CombinedPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const paramId = params.get('readingId');
  // latest completed reading + profile, read from localStorage after mount (null = not checked yet)
  const [ctx, setCtx] = useState<{ lastId: string | null; profile: boolean } | null>(null);
  const autoStarted = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<CombinedHistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openEntry, setOpenEntry] = useState<CombinedHistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CombinedHistoryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyLocked, setHistoryLocked] = useState(false);
  const { a: combAfford, state: credits } = useAfford('combined');
  const [refusal, setRefusal] = useState<Refusal | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await historyStore.list();
      setHistory(list);
      setHistoryLocked(false);
      setLoaded(true);
    } catch (e) {
      if (e instanceof HistoryAccessError && (e.status === 401 || e.status === 403)) {
        setHistory([]);
        setHistoryLocked(true);
        setLoaded(true);
        return;
      }
      throw e;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([historyStore.list(), isProfileComplete()]).then(([historyResult, profileResult]) => {
      if (!alive) return;
      if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
      else if (historyResult.reason instanceof HistoryAccessError && (historyResult.reason.status === 401 || historyResult.reason.status === 403)) setHistoryLocked(true);
      if (profileResult.status !== 'fulfilled') return;
      setLoaded(true);
      setCtx({ lastId: getLastReadingId(), profile: profileResult.value });
    });
    return () => { alive = false; };
  }, []);

  const readingId = paramId || ctx?.lastId || null;

  const handleGenerate = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const [res, metaRes] = await Promise.all([
        creditsStore.fetch('/api/combined', { method: 'POST', headers: localeHeaders(), body: JSON.stringify({ readingId: id, locale: getLocale() }) }),
        fetch(`/api/readings/${id}`, { headers: localeHeaders(false) }),
      ]);
      const refused = await readRefusal(res);
      if (refused) { setRefusal(refused); return; }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const meta = metaRes.ok ? await metaRes.json() : null;
      const entry = await historyStore.add({
        readingId: id,
        topic: meta?.topic,
        question: meta?.question ?? '',
        cards: (meta?.cards ?? []).map((c: HistoryCard) => ({ id: c.id, position_label: c.position_label, orientation: c.orientation, name_zh: c.name_zh, name_en: c.name_en })),
        result: data.combinedInterpretation,
      });
      await refresh();
      setOpenEntry(entry);
    } catch {
      setError(tx('生成综合解读失败。请确保你已完成塔罗占卜和星盘生成。'));
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // /combined?readingId=… (from the reading page): start right away, once, then drop the param
  useEffect(() => {
    if (!paramId || !ctx || autoStarted.current) return;
    autoStarted.current = true;
    router.replace('/combined', { scroll: false });
    if (ctx.profile) queueMicrotask(() => handleGenerate(paramId));
  }, [paramId, ctx, handleGenerate, router]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    await historyStore.remove(id);
    setPendingDelete(null);
    if (openEntry?.id === id) setOpenEntry(null);
    await refresh();
  };

  const modals = (
    <>
      <RefusalModal refusal={refusal} onClose={() => setRefusal(null)} />
      <Modal
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        tone="orange"
        title={tx('删除这条记录？')}
        message={pendingDelete ? tx('{0} 的综合解读将被删除，无法恢复。', [formatZhDateTime(pendingDelete.createdAt)]) : ''}
        primary={{ label: tx('删除'), onClick: confirmDelete }}
        secondary={{ label: tx('取消') }}
      />
      <Modal open={!!error} onClose={() => setError(null)} tone="dark" title={tx('生成失败')} message={error} primary={{ label: tx('知道了') }} />
    </>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg pt-20 flex items-center justify-center">
        <LoadingWatch message={tx('正在综合塔罗与星盘...')} />
      </div>
    );
  }

  if (openEntry) {
    return (
      <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-3xl" data-testid="history-detail">
          <button onClick={() => setOpenEntry(null)} className="mb-6 inline-flex items-center gap-2 text-sm text-text-2 hover:text-primary transition-colors">
            {tx('← 返回历史记录')}
          </button>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-gold text-sm tracking-wide">{formatZhDateTime(openEntry.createdAt)}</p>
            <button onClick={() => setPendingDelete(openEntry)} className="text-sm text-text-3 hover:text-danger transition-colors">{tx('删除')}</button>
          </div>
          {openEntry.question && <h2 className="text-2xl font-bold text-text mb-2">“{openEntry.question}”</h2>}
          {openEntry.cards.length > 0 && <p className="text-text-2 text-sm mb-6">{summary(openEntry)}</p>}
          <div className="bg-gradient-to-br from-primary/20 to-leaf/20 p-6 md:p-8 rounded-2xl border border-primary/40">
            <Markdown text={stripDevNotes(openEntry.result)} className="text-text leading-relaxed" />
          </div>
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <Icon name="crystal_ball" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">{tx('综合解读')}</h1>
          <p className="text-text/60">{tx('塔罗与星盘的对话')}</p>
        </div>

        <div className="bg-surface-1 p-6 md:p-8 rounded-2xl border border-primary/20 mb-10 text-center">
          <p className="text-text mb-2">{tx('综合解读将你的塔罗解读与出生星盘结合，揭示当前趋势与长期特质的对话。')}</p>
          <p className="text-text/60 text-sm mb-6">{tx('请确保你已完成塔罗占卜和星盘生成')}</p>
          {!ctx ? (
            <div className="h-12" aria-hidden />
          ) : !ctx.profile ? (
            <div data-testid="need-profile" className="flex flex-col items-center gap-3">
              <p className="text-text-2 text-sm">{tx('综合解读需要你的出生资料。')}</p>
              <Link href="/settings" className="btn btn-primary"><Icon name="settings" size={20} />{tx('前往设置填写资料')}</Link>
            </div>
          ) : !readingId ? (
            <div data-testid="need-reading" className="flex flex-col items-center gap-3">
              <p className="text-text-2 text-sm">{tx('还没有塔罗解读。先完成一次占卜,再回来生成综合解读。')}</p>
              <Link href="/tarot" className="btn btn-primary"><Icon name="tarot_cards" size={20} />{tx('去塔罗占卜')}</Link>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => handleGenerate(readingId)} data-testid="generate" disabled={!!combAfford && !combAfford.ok} className="btn btn-primary px-6 disabled:opacity-50">
                {tx('生成综合解读')} <CarrotCost cost={combAfford?.cost} /> <Icon name="sparkle" size={20} />
              </button>
              <RefusalCaption a={combAfford} state={credits} className="mt-0" />
              <p className="text-text-3 text-xs">{tx('将使用你最近一次的塔罗解读')}</p>
            </div>
          )}
        </div>

        <section aria-labelledby="history-h">
          <div className="flex items-baseline justify-between mb-4">
            <h2 id="history-h" className="text-xl font-bold text-text">{tx('历史记录')}</h2>
            {history.length > 0 && <span className="text-text-3 text-sm">{tx('{0} 条', [history.length])}</span>}
          </div>
          {historyLocked ? (
            <div data-testid="history-locked" className="rounded-2xl border border-border bg-surface-1 p-8 text-center text-text-2">
              <span className="inline-block rounded-full border border-gold/50 bg-gold/15 px-3 py-0.5 text-[13px] font-bold text-gold">{tx('即将推出')}</span>
              <p className="mt-3 font-semibold text-text">{tx('跨设备历史记录')}</p>
              <p className="mt-2 text-sm">{tx('登录后在不同设备查看和删除自己的记录。')}</p>
            </div>
          ) : loaded && history.length === 0 ? (
            <div data-testid="history-empty" className="rounded-2xl border border-dashed border-border p-8 text-center text-text-3">
              <Icon name="crystal_ball" size={32} className="mx-auto mb-3 opacity-60" />
              {tx('还没有综合解读记录。生成后会自动保存在这里。')}
            </div>
          ) : (
            <ul className="space-y-3" data-testid="history-list">
              {history.map((e) => (
                <li key={e.id} className="group relative rounded-2xl border border-border bg-surface-1 transition-colors hover:border-primary/60">
                  <button
                    onClick={() => setOpenEntry(e)}
                    data-testid="history-row"
                    className="block w-full text-left p-4 md:p-5 pr-16"
                  >
                    <span className="block text-gold text-sm">{formatZhDateTime(e.createdAt)}</span>
                    <span className="mt-1 block font-bold text-text truncate">{e.question ? `“${e.question}”` : tx('综合解读')}{e.cards.length ? <span className="font-normal text-text-2"> · {summary(e)}</span> : null}</span>
                    <span className="mt-1 block text-sm text-text-3 line-clamp-2">{snippet(stripDevNotes(e.result), 90)}</span>
                  </button>
                  <button
                    onClick={() => setPendingDelete(e)}
                    aria-label={tx('删除 {0} 的记录', [formatZhDateTime(e.createdAt)])}
                    data-testid="history-delete"
                    className="absolute right-3 top-3 rounded-lg px-2 py-1 text-sm text-text-3 hover:text-danger hover:bg-surface-2 transition-colors"
                  >
                    {tx('删除')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {modals}
    </div>
  );
}

export default function CombinedPage() {
  return <Suspense fallback={null}><CombinedPageInner /></Suspense>;
}

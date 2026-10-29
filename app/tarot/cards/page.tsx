'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { cardName, getLocale, t as tx } from '../../i18n';
import TarotArt, { artSrc } from '../../components/TarotArt';
import Icon from '../../components/Icon';
import { TAROT_DECK, type TarotCard } from '@/lib/tarot/deck';

type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
const SUITS: Suit[] = ['wands', 'cups', 'swords', 'pentacles'];
const SUIT_LABELS: Record<Suit, string> = { wands: '权杖', cups: '圣杯', swords: '宝剑', pentacles: '星币' };

function contextLine(card: TarotCard) {
  // The deck currently stores keyword/meaning copy in Chinese only. Keep this as
  // the source-of-truth line for every locale until translated fields are added.
  return card.upright_keywords.slice(0, 2).join(' · ') || card.upright_meaning;
}

function DreamBubble({ card, onSelect }: { card: TarotCard; onSelect: (card: TarotCard) => void }) {
  const locale = getLocale();
  const title = cardName(card);
  const bubble = useRef<HTMLDivElement>(null);
  const puffs = useRef<HTMLSpanElement[]>([]);
  const frame = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const reduce = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduce.current = mq.matches;
    const onChange = () => { reduce.current = mq.matches; };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const el = frame.current;
    const cloud = bubble.current;
    if (!el || !cloud) return;
    const bits = puffs.current;
    gsap.killTweensOf([el, cloud, ...bits]);
    if (active) {
      const r = cloud.getBoundingClientRect();
      const overflowLeft = 16 - r.left;
      const overflowRight = r.right - (window.innerWidth - 16);
      gsap.set(cloud, { x: overflowLeft > 0 ? overflowLeft : overflowRight > 0 ? -overflowRight : 0 });
    } else { gsap.set(cloud, { x: 0 }); }
    if (reduce.current) {
      gsap.set(el, { scale: 1, y: 0 });
      gsap.set(cloud, { opacity: active ? 1 : 0, y: active ? 0 : 5 });
      gsap.set(bits, { opacity: active ? 0.65 : 0.2, y: 0 });
      return;
    }
    gsap.to(el, { scale: active ? 1.08 : 1, y: active ? -8 : 0, boxShadow: active ? '0 14px 30px rgba(217,178,106,.16)' : '0 0 0 rgba(217,178,106,0)', duration: active ? 0.35 : 0.24, ease: 'power3.out' });
    gsap.to(cloud, { opacity: active ? 1 : 0, y: active ? 0 : 7, duration: 0.3, ease: 'power2.out' });
    if (active) {
      gsap.fromTo(bits, { opacity: 0, y: 7 }, { opacity: 0.75, y: 0, duration: 0.45, stagger: 0.07, ease: 'sine.out' });
      gsap.to(bits, { y: 'random(-2, 2)', duration: 1.8, repeat: -1, yoyo: true, stagger: 0.11, ease: 'sine.inOut', delay: 0.42 });
    } else {
      gsap.to(bits, { opacity: 0.2, y: 0, duration: 0.18, overwrite: true });
    }
  }, [active]);

  const setPuff = (el: HTMLSpanElement | null, i: number) => { if (el) puffs.current[i] = el; };
  return (
    <div
      ref={frame}
      className="relative flex min-w-0 flex-col items-center rounded-[14px] outline-none focus-visible:z-20"
      onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setActive(false); }}
      onClick={() => onSelect(card)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(card); } }}
      tabIndex={0}
      aria-label={`${title}: ${contextLine(card)}`}
    >
      <div ref={bubble} aria-hidden="true" className="pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 z-10 w-[min(260px,calc(100vw-32px))] -translate-x-1/2 opacity-0">
        <span ref={(el) => setPuff(el, 0)} className="absolute -bottom-2 left-[16%] h-5 w-8 rounded-full bg-surface-2/80 blur-[5px]" />
        <span ref={(el) => setPuff(el, 1)} className="absolute -bottom-1 left-[34%] h-7 w-11 rounded-full bg-surface-2/80 blur-[6px]" />
        <span ref={(el) => setPuff(el, 2)} className="absolute -bottom-2 right-[22%] h-5 w-9 rounded-full bg-surface-2/80 blur-[5px]" />
        <p className="relative rounded-[18px] border border-gold/35 bg-surface-2/90 px-3 py-2 text-center font-display text-[13px] italic leading-tight text-text-2 shadow-[0_6px_24px_rgba(217,178,106,.12)] backdrop-blur-sm whitespace-nowrap overflow-hidden text-ellipsis">{title} · {contextLine(card)}</p>
      </div>
      <div className="relative w-full overflow-visible rounded-[12px] border border-border bg-surface-1 p-1 transition-colors focus-visible:border-gold/70 focus-visible:ring-2 focus-visible:ring-gold/30">
        {artSrc(card.id) ? <TarotArt src={artSrc(card.id)!} alt={title} loading="lazy" className="rounded-[9px]" /> : null}
      </div>
      <p className="mt-3 w-full truncate text-center font-[family-name:var(--font-display-zh)] text-[15px] font-semibold leading-tight text-text">{title}</p>
      {locale !== 'zh' && <p className="sr-only">{card.name_zh}</p>}
    </div>
  );
}

function CardSection({ heading, cards, onSelect }: { heading: string; cards: TarotCard[]; onSelect: (card: TarotCard) => void }) {
  return <section className="mb-14" aria-labelledby={`gallery-${heading}`}>
    <div className="mb-5 flex items-end gap-4 border-b border-border pb-3">
      <h2 id={`gallery-${heading}`} className="font-[family-name:var(--font-display-zh)] text-[24px] font-bold text-primary">{heading}</h2>
      <span className="num text-[13px] text-text-2">{cards.length}</span>
    </div>
    <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
      {cards.map((card) => <DreamBubble key={card.id} card={card} onSelect={onSelect} />)}
    </div>
  </section>;
}

function CardFocusOverlay({ card, onClose }: { card: TarotCard; onClose: () => void }) {
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = cardName(card);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ctx = gsap.context(() => {
      if (mq.matches) {
        gsap.set(overlay.current, { opacity: 1 });
        gsap.set(panel.current, { opacity: 1, y: 0 });
        gsap.set([art.current, copy.current], { opacity: 1, x: 0 });
        return;
      }
      gsap.fromTo(overlay.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(panel.current, { opacity: 0, y: 24, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'power3.out' });
      gsap.fromTo(art.current, { opacity: 0, x: -36, rotate: -2 }, { opacity: 1, x: 0, rotate: 0, duration: 0.65, delay: 0.08, ease: 'power3.out' });
      gsap.fromTo(copy.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5, delay: 0.2, ease: 'power3.out' });
    });
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); ctx.revert(); };
  }, [onClose]);

  return (
    <div ref={overlay} className="fixed inset-0 z-[140] flex items-center justify-center bg-bg/75 p-4 backdrop-blur-md md:p-8" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="card-focus-title" className="relative max-h-[calc(100svh-32px)] w-full max-w-[720px] overflow-y-auto rounded-[20px] border border-gold/40 bg-surface-1/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,.5)] md:max-h-[calc(100svh-128px)] md:p-5 lg:p-6">
        <button ref={closeButton} type="button" onClick={onClose} className="icon-btn absolute right-4 top-4 z-10 md:right-6 md:top-6" aria-label={tx('关闭')}>
          <Icon name="close" size={22} />
        </button>
        <div className="grid items-center gap-5 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.78fr)] lg:gap-6 lg:pt-0">
          <div ref={art} className="flex min-h-[32svh] items-center justify-center lg:min-h-[min(46svh,450px)]">
            {artSrc(card.id) ? <TarotArt src={artSrc(card.id)!} alt={title} loading="eager" className="h-[min(42svh,420px)] w-auto max-w-full rounded-[12px] object-contain shadow-[0_20px_50px_rgba(0,0,0,.42)] lg:h-[min(46svh,450px)]" /> : null}
          </div>
          <div ref={copy} className="pb-3 lg:pr-8">
            <p className="overline text-primary">{card.arcana_type === 'major' ? tx('大阿尔卡那') : tx(SUIT_LABELS[card.suit as Suit])}</p>
            <h2 id="card-focus-title" className="mt-3 font-[family-name:var(--font-display-zh)] text-[clamp(30px,4vw,54px)] font-bold leading-tight text-text">{title}</h2>
            {cardName(card) !== card.name_zh && <p className="mt-2 font-display text-lg italic text-gold">{card.name_zh}</p>}
            <p className="mt-6 text-lg leading-relaxed text-text-2">{card.upright_meaning}</p>
            <p className="mt-5 border-l-2 border-primary pl-4 text-[15px] leading-relaxed text-text-3">{contextLine(card)}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {card.upright_keywords.slice(0, 4).map((keyword) => <span key={keyword} className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-sm text-gold">{keyword}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TarotCardsPage() {
  const [filter, setFilter] = useState<'all' | Suit>('all');
  const [focusedCard, setFocusedCard] = useState<TarotCard | null>(null);
  const major = useMemo(() => TAROT_DECK.filter((c) => c.arcana_type === 'major'), []);
  const minor = useMemo(() => SUITS.map((suit) => ({ suit, cards: TAROT_DECK.filter((c) => c.arcana_type === 'minor' && c.suit === suit) })), []);
  return (
    <main className="min-h-screen overflow-x-clip bg-bg px-5 pb-20 pt-28 md:px-10 md:pt-36 xl:px-16">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-12 max-w-[720px]">
          <p className="overline text-primary">{tx('Tarot · 塔罗占卜')}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display-zh)] text-[clamp(32px,5vw,56px)] font-bold leading-tight text-text">{tx('塔罗牌图鉴')}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-text-2">{tx('漫游完整的 78 张牌,悬停或聚焦以聆听牌面的梦语')}</p>
        </header>
        <div className="mb-10 flex flex-wrap gap-2" role="tablist" aria-label={tx('牌组筛选')}>
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => { setFilter('all'); setFocusedCard(null); }} className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${filter === 'all' ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-2 hover:border-gold/50 hover:text-text'}`}>{tx('全部')}</button>
          {SUITS.map((suit) => <button key={suit} type="button" role="tab" aria-selected={filter === suit} onClick={() => { setFilter(suit); setFocusedCard(null); }} className={`rounded-full border px-4 py-2 text-[14px] transition-colors ${filter === suit ? 'border-gold bg-gold/15 text-gold' : 'border-border text-text-2 hover:border-gold/50 hover:text-text'}`}>{tx(SUIT_LABELS[suit])}</button>)}
        </div>
        {filter === 'all' ? <>
          <CardSection heading={tx('大阿尔卡那')} cards={major} onSelect={setFocusedCard} />
          {minor.map(({ suit, cards }) => <CardSection key={suit} heading={tx(SUIT_LABELS[suit])} cards={cards} onSelect={setFocusedCard} />)}
        </> : <CardSection heading={tx(SUIT_LABELS[filter])} cards={minor.find((x) => x.suit === filter)?.cards ?? []} onSelect={setFocusedCard} />}
      </div>
      {focusedCard && <CardFocusOverlay card={focusedCard} onClose={() => setFocusedCard(null)} />}
    </main>
  );
}

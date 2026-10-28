'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CARDS_EVENT } from './RabbitHoleTransition';
import { fitLayout, type Geo, type Placed } from './hero-layout';

/*
 * Landing hero cards (5 xl / 4 md / 3 sm). The random seed is drawn once per page load on the
 * client; positions come from makeLayout() against the measured stage, header and viewport, so
 * every card stays ≥24px under the nav, inside the viewport, and front cards overlap the hero
 * box by ≤30% without touching the face, watch, Alice or the rabbit's body (never demoted: they move outward instead). xl is always 3 sharp fronts + 2 blurred backs.
 */
let sharedSeed: number | null = null;
const listeners = new Set<(c: Placed[]) => void>();
let current: Placed[] | null = null;

const TEXT_GAP = 32;
// right edge of the actual text/controls in the column (line boxes, not the grid column)
function textRight(col: Element) {
  const rg = document.createRange(); rg.selectNodeContents(col);
  let r = 0; for (const b of Array.from(rg.getClientRects())) if (b.width > 0) r = Math.max(r, b.right);
  col.querySelectorAll('button, a, .btn, svg').forEach((e) => { const b = e.getBoundingClientRect(); if (b.width) r = Math.max(r, b.right); });
  return r;
}
// xl: keep the stage's left edge ≥32px right of the text; the CSS width is the cap, this only trims it
function fitStage(stage: HTMLElement) {
  stage.style.width = ''; stage.style.right = '';
  if (document.documentElement.clientWidth < 1280) return;
  const col = document.querySelector('.hero-text'); if (!col) return;
  const s = stage.getBoundingClientRect(), min = textRight(col) + TEXT_GAP;
  if (s.left < min) stage.style.width = `${Math.floor(s.right - min)}px`;
}

function measure(stage: HTMLElement): Geo {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight, sy = window.scrollY;
  const s = stage.getBoundingClientRect();
  const nav = document.querySelector('header') as HTMLElement | null; // fixed top-0; height is stable even mid-intro
  const bp = vw >= 1280 ? 'xl' : vw >= 768 ? 'md' : 'sm';
  const col = document.querySelector('.hero-text');
  const text = col?.getBoundingClientRect();
  const wordsR = col ? textRight(col) : 0;
  return {
    stage: { l: s.left, t: s.top + sy, r: s.right, b: s.bottom + sy },
    vw, vh, navBottom: nav ? nav.offsetHeight : 64,
    // no card behind any words: the column up to the words' right edge + gap (cards may only pass its edge below the text)
    avoid: text ? [{ l: text.left, t: text.top + sy, r: bp === 'xl' ? Math.max(wordsR + TEXT_GAP, text.left) : text.right, b: text.bottom + sy }] : [],
    bp,
  };
}

function publish(stage: HTMLElement) {
  if (sharedSeed === null) sharedSeed = (Math.random() * 2 ** 32) >>> 0;
  fitStage(stage);
  const geo0 = measure(stage);
  const fit = fitLayout(sharedSeed, geo0);
  if (fit.scale < 1) {
    // last resort: trim the hero, keeping its left edge where the text gap put it
    const w = geo0.stage.r - geo0.stage.l, nw = w * fit.scale;
    stage.style.width = `${nw}px`;
    stage.style.right = `${parseFloat(getComputedStyle(stage).right) + (w - nw)}px`;
  }
  current = fit.cards;
  if (process.env.NODE_ENV !== 'production') {
    // dev-only hooks for layout QA across seeds
    Object.assign(window, { __heroLayout: { seed: sharedSeed, cards: current }, __heroGeo: geo0, __heroFit: (seed: number, dbg?: Record<string, number>) => { const f = fitLayout(seed, geo0, dbg); return Object.assign(f.cards, { scale: f.scale }); } });
  }
  listeners.forEach((l) => l(current!));
}

export default function HeroShuffle({ layer }: { layer: 'back' | 'front' }) {
  const [cards, setCards] = useState<Placed[] | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current?.closest('.hero-stage') as HTMLElement | null;
    if (!stage) return;
    const sync = (c: Placed[]) => {
      const r = stage.getBoundingClientRect();
      setOrigin({ x: r.left, y: r.top + window.scrollY });
      setCards(c);
    };
    listeners.add(sync);
    let alive = true;
    if (current && layer === 'front') sync(current);
    else if (layer === 'back') {
      // wait for styles + fonts so the measured stage/header geometry is final
      const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((r) => window.addEventListener('load', () => r(), { once: true }));
      const start = performance.now();
      const go = () => {
        if (!alive) return;
        // the header can be unlaid-out for a few frames after hydration; wait until it has height (max 2s)
        const h = (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 1;
        if (h === 0 && performance.now() - start < 2000) { requestAnimationFrame(go); return; }
        publish(stage);
      };
      loaded.then(() => document.fonts.ready).then(() => requestAnimationFrame(go));
    }
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(() => publish(stage), 150); };
    if (layer === 'back') window.addEventListener('resize', onResize);
    return () => {
      alive = false; listeners.delete(sync); clearTimeout(t);
      if (layer === 'back') { window.removeEventListener('resize', onResize); sharedSeed = null; current = null; }
    };
  }, [layer]);

  // rabbit-hole transition: fade out + stop float/parallax on CTA click; restore if it's skipped/fails
  useEffect(() => {
    const root = ref.current; if (!root) return;
    let hidden = false;
    const on = (e: Event) => {
      const d = (e as CustomEvent<'hide' | 'show'>).detail;
      const movers = root.querySelectorAll('.hs-inner, .hs-px');
      if (d === 'hide') {
        hidden = true; gsap.killTweensOf(movers);
        gsap.to(root, { opacity: 0, duration: 0.4, ease: 'power2.out', overwrite: true });
      } else if (hidden) {
        hidden = false; gsap.killTweensOf(root); gsap.set(root, { clearProps: 'opacity' });
        setCards((c) => (c ? [...c] : c)); // re-run entrance + float
      }
    };
    window.addEventListener(CARDS_EVENT, on);
    return () => { window.removeEventListener(CARDS_EVENT, on); gsap.killTweensOf(root); gsap.set(root, { clearProps: 'opacity' }); };
  }, []);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!cards || !root) return;
    const stage = root.closest('.hero-stage') as HTMLElement | null;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const els = gsap.utils.toArray<HTMLElement>('.hs-card', root);
        const ab = (stage ?? root).getBoundingClientRect();
        const cx = ab.left + ab.width / 2, cy = ab.top + ab.height / 2;
        els.forEach((el) => {
          const b = el.getBoundingClientRect();
          const inner = el.querySelector('.hs-inner')!;
          const i = Number(el.dataset.i);
          gsap.from(inner, {
            x: cx - (b.left + b.width / 2), y: cy - (b.top + b.height / 2), rotation: 0, scale: 0.6, opacity: 0,
            duration: 0.8, delay: 0.3 + i * 0.08, ease: 'power3.out',
            onComplete: () => {
              if (el.dataset.layer !== 'front') return;
              const d = gsap.utils.random(4, 6); // full cycle -6px ↔ +6px
              gsap.to(inner, { y: 6, duration: d / 4, ease: 'sine.out', onComplete: () => { gsap.fromTo(inner, { y: 6 }, { y: -6, duration: d / 2, ease: 'sine.inOut', repeat: -1, yoyo: true }); } });
            },
          });
        });
        const movers = els.map((el) => {
          const px = el.querySelector('.hs-px')!;
          const amt = el.dataset.layer === 'front' ? 12 : 4;
          return { amt, x: gsap.quickTo(px, 'x', { duration: 0.6, ease: 'power3.out' }), y: gsap.quickTo(px, 'y', { duration: 0.6, ease: 'power3.out' }) };
        });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType === 'touch') return;
          const nx = (e.clientX / window.innerWidth) * 2 - 1, ny = (e.clientY / window.innerHeight) * 2 - 1;
          movers.forEach((m) => { m.x(nx * m.amt); m.y(ny * m.amt); });
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
      });
    }, root);
    return () => ctx.revert();
  }, [cards]);

  const list = (cards ?? []).map((c, i) => ({ c, i })).filter(({ c }) => (layer === 'back') === c.back);
  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 ${layer === 'back' ? 'z-0' : 'z-[2]'}`}>
      {origin && list.map(({ c, i }) => (
        <div
          key={`${i}-${c.src}`}
          data-i={i}
          data-layer={c.back ? 'back' : 'front'}
          className="hs-card hero-shuffle-card absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: c.cx - origin.x, top: c.cy - origin.y, width: c.w }}
        >
          <div className="hs-px">
            <div className="hs-inner" style={{ rotate: `${c.rot.toFixed(1)}deg` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.src}
                alt={c.alt}
                draggable={false}
                className={`block w-full aspect-[2/3.5] object-cover rounded-[12px] ${c.back ? 'brightness-[0.65] blur-[4px]' : 'shadow-[var(--shadow-1)]'}`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

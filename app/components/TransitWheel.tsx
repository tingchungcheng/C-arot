'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { BirthChartData } from '@/lib/astrology/calculator';
import type { TransitResult } from '@/lib/astrology/transits';
import { GLYPHS } from './ZodiacGlyph';
import { PLANETS } from './zodiac';
import { eclipticLon, wheelAngle, polar, spreadAngles } from './natal-geometry';

/** Bi-wheel (design-system §4c): zodiac band · transit ring (orange) · natal ring (cream) · houses; transit→natal aspect lines. */
const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const TENSE = new Set(['Square', 'Opposition']);
const HARM = new Set(['Trine', 'Sextile', 'Conjunction']);
const C = 240;
/** natal-mode radii (k=1) sit just inside the sign band, chart_1440 proportions; transit mode (k=0) is the bi-wheel. */
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const radii = (k: number) => ({ n: lerp(R_N_IN, 143, k), g: lerp((R_N_IN + R_T_IN) / 2, 176, k), h: lerp(R_H_IN, 92, k) });
/** Natal intro (band spin-in, houses, planets) plays once per page load — never on tab switches. */
let hasPlayedIntro = false;
const R_Z_OUT = 232, R_Z_IN = 204, R_T_IN = 168, R_N_IN = 124, R_H_IN = 56;
const SYM_FONT = { fontFamily: '"Segoe UI Symbol","Apple Symbols","Noto Sans Symbols",serif' };

export const symbolFor = (en: string) => PLANETS.find((x) => x.name_en.toLowerCase() === en.toLowerCase())?.symbol ?? en.slice(0, 2);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
export const aspectTone = (type: string) => { const t = cap(type); return TENSE.has(t) ? 'tense' : HARM.has(t) ? 'harm' : 'minor'; };
export const toneColor = (t: string) => (t === 'tense' ? 'var(--c-primary)' : t === 'harm' ? 'var(--c-gold)' : 'var(--c-leaf)');

export type WheelMode = 'natal' | 'transit';

/** One persistent wheel for all four tabs. Size: natal 560 (xl) / 480 (md) / 350; transit min(560, 100vh − 420); always ≤ column width. */
function sizeFor(mode: WheelMode, col: number) {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (vw < 768) return Math.min(col, 350);
  const max = Math.max(280, Math.min(560, vh - (mode === 'natal' ? 400 : 420)));
  return Math.min(col, max);
}

export default function TransitWheel({ natal, transit, highlight, maxLines = 5, className = '', mode = 'transit' }: {
  natal: BirthChartData; transit: TransitResult | null; highlight?: number | null; maxLines?: number; className?: string; mode?: WheelMode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const modeRingRef = useRef<SVGGElement>(null);   // mode-level wrappers (ring / transit planets / transit lines)
  const modeLinesRef = useRef<SVGGElement>(null);
  const modePlanetsRef = useRef<SVGGElement>(null);
  const natAspRef = useRef<SVGGElement>(null);
  const prevMode = useRef<WheelMode | null>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  const modeTl = useRef<gsap.core.Timeline | null>(null);
  const introTl = useRef<gsap.core.Timeline | null>(null);
  const [k, setK] = useState(mode === 'natal' ? 1 : 0);
  const kProxy = useRef({ k: mode === 'natal' ? 1 : 0 });
  const kTo = (v: number) => ({ k: v, onUpdate: () => setK(kProxy.current.k) });

  useLayoutEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    const col = () => wrap.parentElement?.clientWidth ?? 560;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ring = [modeRingRef.current, modeLinesRef.current, modePlanetsRef.current].filter(Boolean);
    const natAsp = natAspRef.current;
    const prev = prevMode.current; prevMode.current = mode;
    const w = sizeFor(mode, col());
    const on = mode === 'transit' ? 1 : 0;
    if (prev === null) { // first mount: place without tweening
      gsap.set(wrap, { width: w }); gsap.set(ring, { opacity: on }); gsap.set(natAsp, { opacity: 1 - on });
      return;
    }
    if (prev === mode) return;
    modeTl.current?.kill(); // mid-click: continue from current values
    if (reduce) { // size snaps, ring crossfades
      gsap.set(wrap, { width: w }); kProxy.current.k = 1 - on; setK(1 - on);
      modeTl.current = gsap.timeline().to(ring, { opacity: on, duration: 0.3 }, 0).to(natAsp, { opacity: 1 - on, duration: 0.3 }, 0);
      return;
    }
    const tl = gsap.timeline();
    if (mode === 'transit') { // shrink 0.5s; ring fades in over the last 60% (0.2 → 0.5)
      tl.to(wrap, { width: w, duration: 0.5, ease: 'power2.inOut' }, 0)
        .to(kProxy.current, { ...kTo(0), duration: 0.5, ease: 'power2.inOut' }, 0)
        .to(natAsp, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0)
        .to(ring, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.2);
    } else { // ring fades out first, then grow
      tl.to(ring, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0)
        .to(wrap, { width: w, duration: 0.5, ease: 'power2.inOut' }, 0.3)
        .to(kProxy.current, { ...kTo(1), duration: 0.5, ease: 'power2.inOut' }, 0.3)
        .to(natAsp, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0.5);
    }
    modeTl.current = tl;
  }, [mode]);

  useEffect(() => {
    const onResize = () => { const wrap = wrapRef.current; if (!wrap || modeTl.current?.isActive()) return; gsap.set(wrap, { width: sizeFor(modeRef.current, wrap.parentElement?.clientWidth ?? 560) }); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); modeTl.current?.progress(1).kill(); };
  }, []);

  // first page load only: band spin-in, houses + natal planets fade. Flag is set on completion so a StrictMode
  // probe-unmount doesn't swallow it; tab switches never remount this component.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || hasPlayedIntro || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { hasPlayedIntro = true; return; }
    const band = svg.querySelector('[data-part="band"]'), houses = svg.querySelectorAll('[data-part="house"]'), nat = svg.querySelector('[data-part="natal-planets"]'), asp = svg.querySelector('[data-part="natal-aspects-in"]');
    introTl.current = gsap.timeline({ onComplete: () => { hasPlayedIntro = true; } })
      .from(band, { rotation: -30, svgOrigin: `${C} ${C}`, opacity: 0, duration: 1.2, ease: 'power4.out' }, 0)
      .from(houses, { opacity: 0, duration: 0.4, stagger: 0.03 }, 0.3)
      .from(nat, { opacity: 0, duration: 0.5 }, 0.6)
      .from(asp, { opacity: 0, duration: 0.6 }, 1.0);
    return () => { introTl.current?.kill(); gsap.set([band, ...Array.from(houses), nat, asp], { clearProps: 'transform,opacity' }); };
  }, []);

  // ---- animation state: displayed transit longitudes + the aspect set currently drawn ----
  const [lons, setLons] = useState<Record<string, number>>({});
  const [shown, setShown] = useState<TransitResult | null>(null);
  const [drawTick, setDrawTick] = useState(0);
  const lonsRef = useRef<Record<string, number>>({});
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const drawRef = useRef<gsap.core.Timeline | null>(null);
  const drawPending = useRef(false);
  const outerRef = useRef<SVGGElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const planetsRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    if (!transit) return;
    tlRef.current?.kill(); drawRef.current?.kill(); // mid-animation change: kill and continue from where we are
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target: Record<string, number> = Object.fromEntries(transit.planets.map((p) => [p.planet_en, p.longitude]));
    const apply = (m: Record<string, number>) => { lonsRef.current = m; setLons(m); };
    const first = Object.keys(lonsRef.current).length === 0;
    if (first) {
      apply(target); setShown(transit); drawPending.current = !reduce; setDrawTick((n) => n + 1);
      // 本命盘 → transit: outer ring + its planets + lines fade in together (0.3s, no scale); band/houses/natal never move
      drawPending.current = false;
      tlRef.current = gsap.timeline().fromTo([planetsRef.current, linesRef.current], { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', clearProps: 'opacity' });
      return;
    }
    if (reduce) { // crossfade only
      tlRef.current = gsap.timeline().to([planetsRef.current, linesRef.current], { opacity: 0, duration: 0.15 })
        .add(() => { apply(target); setShown(transit); }).to([planetsRef.current, linesRef.current], { opacity: 1, duration: 0.2 });
      return;
    }
    const start = { ...lonsRef.current }; const prox = { t: 0 };
    tlRef.current = gsap.timeline()
      .to(linesRef.current, { opacity: 0, duration: 0.15 })
      .to(prox, { t: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: () => {
        const m: Record<string, number> = {};
        for (const k in target) { const a = start[k] ?? target[k]; const d = ((target[k] - a + 540) % 360) - 180; m[k] = (a + d * prox.t + 360) % 360; }
        apply(m);
      } }, 0)
      .add(() => { drawPending.current = true; setShown(transit); setDrawTick((n) => n + 1); });
  }, [transit]);

  // redraw aspect lines via stroke-dash 0.4s, stagger 0.05s
  useLayoutEffect(() => {
    const g = linesRef.current;
    if (!g || !drawPending.current) return;
    drawPending.current = false;
    gsap.set(g, { opacity: 1 });
    const els = Array.from(g.querySelectorAll<SVGLineElement>('line[data-draw]'));
    const tl = gsap.timeline();
    els.forEach((el, i) => {
      if (el.dataset.draw === 'minor') { tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: 'opacity' }, i * 0.05); return; }
      const len = el.getTotalLength();
      tl.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out', clearProps: 'strokeDasharray,strokeDashoffset' }, i * 0.05);
    });
    drawRef.current = tl;
  }, [drawTick]);
  useLayoutEffect(() => () => { tlRef.current?.progress(1).kill(); drawRef.current?.progress(1).kill(); lonsRef.current = {}; }, []); // a remount re-runs the fade-in entrance

  const rr = radii(k);
  const asc = natal.houses?.length ? natal.houses[0] : natal.rising ? eclipticLon(natal.rising) : 0;
  const cusps = natal.houses ?? [];
  const pt = (lon: number, r: number) => polar(wheelAngle(lon, asc), r, C);

  const nat = natal.planets.map((p) => ({ en: p.planet_en, name: p.planet, lon: eclipticLon(p), label: `${p.planet} ${p.sign} ${p.degree.toFixed(0)}°` }));
  const natDraw = spreadAngles(nat.map((p) => p.lon), 8);
  const tr = (transit?.planets ?? []).map((p) => ({ en: p.planet_en, name: p.planet, lon: lons[p.planet_en] ?? p.longitude, label: `行运${p.planet} ${p.sign} ${p.degree.toFixed(0)}°${p.retrograde ? ' 逆行' : ''}`, rx: p.retrograde }));
  // glyph at the planet's own longitude (no angular spread); on collision (<6°) stack outward by 14px
  const trLevel: number[] = [];
  tr.map((p, i) => ({ lon: p.lon, i })).sort((a, b) => a.lon - b.lon).forEach(({ lon, i }, _k, arr) => {
    let lvl = 0;
    const clash = (l: number) => arr.some((o) => o.i !== i && trLevel[o.i] === l && Math.abs(((o.lon - lon + 540) % 360) - 180) < 6);
    while (clash(lvl)) lvl++;
    trLevel[i] = lvl;
  });
  const natBy = new Map(nat.map((p) => [p.en, p]));
  const natAny = (k: string) => nat.find((p) => p.en === k || p.name === k);
  const trBy = new Map(tr.map((p) => [p.en, p]));
  const lines = (shown?.aspects ?? []).slice(0, maxLines);

  return (
    <div ref={wrapRef} className="mx-auto max-w-full" style={{ width: 350 }}>
    <svg ref={svgRef} viewBox="0 0 480 480" width="100%" height="100%" data-chart-wheel className={`block w-full h-auto ${className}`} role="img" aria-label={mode === 'transit' ? '行运双圈星盘:内圈本命,外圈行运' : '本命星盘'}>
      <g data-part="band">
      {/* zodiac band */}
      <circle cx={C} cy={C} r={R_Z_OUT} fill="none" stroke="var(--c-primary)" strokeWidth="1.6" />
      <circle cx={C} cy={C} r={R_Z_IN} fill="none" stroke="var(--c-primary)" strokeWidth="1" />
      {SIGN_IDS.map((id, i) => {
        const a = pt(i * 30, R_Z_OUT), b = pt(i * 30, R_Z_IN), g = pt(i * 30 + 15, (R_Z_OUT + R_Z_IN) / 2);
        return (
          <g key={id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--c-primary)" strokeWidth="1" />
            <g transform={`translate(${g.x - 7.5} ${g.y - 7.5}) scale(${15 / 24})`} fill="none" stroke="var(--c-text)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={GLYPHS[id]} /></g>
          </g>
        );
      })}
      </g>

      <g ref={modeRingRef} data-outer-ring><g ref={outerRef}>
      {/* transit ring (6% orange tint) */}
      <circle cx={C} cy={C} r={(R_Z_IN + R_T_IN) / 2} fill="none" stroke="var(--c-primary)" strokeOpacity="0.06" strokeWidth={R_Z_IN - R_T_IN} />
      <circle cx={C} cy={C} r={R_T_IN} fill="none" stroke="var(--c-primary)" strokeOpacity="0.5" strokeWidth="0.8" />
      </g></g>
      {/* natal ring */}
      <circle data-part="natal-ring" cx={C} cy={C} r={rr.n} fill="none" stroke="var(--c-gold)" strokeOpacity="0.45" strokeWidth="0.8" />
      {/* houses */}
      <circle data-part="house" cx={C} cy={C} r={rr.h} fill="var(--c-bg)" fillOpacity="0.5" stroke="var(--c-border-strong)" strokeWidth="0.8" />
      {cusps.map((cusp, i) => {
        const ang = i % 3 === 0;
        const a = pt(cusp, lerp(rr.n, R_Z_IN, k)), b = pt(cusp, ang ? rr.h - 0 : rr.h);
        const l = pt(cusp + 15, rr.h + 12);
        return (
          <g key={i} data-part="house">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ang ? 'var(--c-primary)' : 'var(--c-border-strong)'} strokeWidth={ang ? 1.3 : 0.8} />
            <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="var(--c-text-3)" className="num">{i + 1}</text>
          </g>
        );
      })}
      {(() => { const p = pt(asc, R_Z_OUT + 4); return <path d={`M${p.x - 6} ${p.y - 5} L${p.x} ${p.y} L${p.x - 6} ${p.y + 5} Z`} fill="var(--c-primary)" />; })()}

      {/* natal aspects — visible on 本命盘 only */}
      <g ref={natAspRef} data-natal-aspects><g data-part="natal-aspects-in">
      {natal.aspects.filter((a) => cap(a.type) !== 'Conjunction').map((a, i) => {
        const p1 = natAny(a.planet1), p2 = natAny(a.planet2);
        if (!p1 || !p2) return null;
        const s = pt(p1.lon, rr.n), e = pt(p2.lon, rr.n);
        const tone = aspectTone(a.type);
        return <line key={i} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={tone === 'minor' ? 'var(--c-text-3)' : toneColor(tone)} strokeWidth={a.orb < 3 ? 1.2 : 0.8} strokeDasharray={tone === 'minor' ? '3 3' : undefined} opacity={0.85} />;
      })}
      </g></g>

      {/* transit → natal aspect lines (tightest first) */}
      <g ref={modeLinesRef} data-outer-ring><g ref={linesRef}>
      {lines.map((a, i) => {
        const t = trBy.get(a.transit_en), n = natBy.get(a.natal_en);
        if (!t || !n) return null;
        const s = pt(t.lon, R_T_IN), e = pt(n.lon, rr.n);
        const tone = aspectTone(a.type);
        const dim = highlight != null && highlight !== i;
        return (
          <line key={`${a.transit_en}-${a.type}-${a.natal_en}`} data-idx={i} data-draw={tone} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={toneColor(tone)} strokeWidth={highlight === i ? 2.6 : 1.6}
            strokeDasharray={tone === 'minor' ? '4 3' : undefined} opacity={dim ? 0.25 : 0.95} style={{ transition: 'opacity .2s, stroke-width .2s' }}>
            <title>{`行运${a.transit} ${a.type_zh} 本命${a.natal}`}</title>
          </line>
        );
      })}
      </g></g>

      {/* natal planets */}
      <g data-part="natal-planets">
      {nat.map((p, i) => {
        const dot = pt(p.lon, rr.n), g = pt(natDraw[i], rr.g);
        return (
          <g key={p.en}>
            <circle cx={dot.x} cy={dot.y} r="2.2" fill="var(--c-text)" />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize="16" fill="var(--c-text)" style={SYM_FONT}>{symbolFor(p.en) + '\uFE0E'}</text>
            <title>{p.label}</title>
          </g>
        );
      })}
      </g>

      <g ref={modePlanetsRef} data-outer-ring><g ref={planetsRef}>
      {/* transit planets */}
      {tr.map((p, i) => {
        const dot = pt(p.lon, R_T_IN), g = pt(p.lon, R_T_IN + 12 + trLevel[i] * 14);
        return (
          <g key={p.en}>
            <circle cx={dot.x} cy={dot.y} r="2.6" fill="var(--c-primary)" />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize="16" fontWeight="700" fill="var(--c-primary)" style={SYM_FONT}>{symbolFor(p.en) + '\uFE0E'}</text>
            {p.rx && <text x={g.x + 8} y={g.y + 7} fontSize="8" fill="var(--c-primary)">R</text>}
            <title>{p.label}</title>
          </g>
        );
      })}
      </g></g>
    </svg>
    </div>
  );
}

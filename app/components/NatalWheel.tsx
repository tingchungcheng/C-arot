'use client';
import { t as tx } from '../i18n';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { BirthChartData } from '@/lib/astrology/calculator';
import { GLYPHS } from './ZodiacGlyph';
import { PLANETS } from './zodiac';
import { eclipticLon, wheelAngle, polar, spreadAngles } from './natal-geometry';

const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const TENSE = new Set(['Square', 'Opposition']);
const HARMONIC = new Set(['Trine', 'Sextile']);

const C = 200;
const R_OUT = 192, R_SIGN_IN = 160, R_HOUSE_IN = 72, R_PLANET = 138, R_ASPECT = 112;


function symbolFor(planetEn: string) {
  const p = PLANETS.find((x) => x.name_en.toLowerCase() === planetEn.toLowerCase() || x.id === planetEn.toLowerCase());
  return p?.symbol ?? planetEn.slice(0, 2);
}

/** Natal wheel drawn in React from chart data (replaces the lib SVG string renderer in the UI). Ascendant on the left. */
export default function NatalWheel({ chart, ascendant, houses, className = '' }: { chart: BirthChartData; ascendant?: number; houses?: number[]; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const asc = ascendant ?? (chart.rising ? eclipticLon(chart.rising) : 0);
  const cusps = houses ?? chart.houses ?? [];

  // ecliptic longitude -> screen point; asc pinned at 9 o'clock, zodiac counter-clockwise
  const pt = (lon: number, r: number) => polar(wheelAngle(lon, asc), r, C);

  // true longitudes for dots/aspects; glyphs nudged apart so they don't overlap
  const withLon = chart.planets.map((p) => ({ ...p, lon: eclipticLon(p) }));
  const spread = spreadAngles(withLon.map((p) => p.lon), 9);
  const placed = withLon.map((p, i) => ({ ...p, drawLon: spread[i] }));

  const byName = new Map(placed.map((p) => [p.planet_en, p]));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, () => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.nw-zodiac', { rotation: -30, svgOrigin: `${C} ${C}`, opacity: 0, duration: 1.2, ease: 'power4.out' })
          .from('.nw-house', { opacity: 0, duration: 0.5, stagger: 0.03 }, 0.3)
          .from('.nw-planet', { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.06 }, 0.6)
          .from('.nw-aspect', { opacity: 0, duration: 0.6, stagger: 0.02 }, 1.0);
      });
    }, el);
    return () => ctx.revert();
  }, [chart]);

  return (
    <svg ref={ref} viewBox="0 0 400 400" className={className} role="img" aria-label={tx('出生星盘图')}>
      <defs>
        <radialGradient id="nw-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--c-primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--c-bg)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={R_OUT} fill="url(#nw-bg)" />

      {/* zodiac band */}
      <g className="nw-zodiac">
        <circle cx={C} cy={C} r={R_OUT} fill="none" stroke="var(--c-primary)" strokeWidth="1.6" />
        <circle cx={C} cy={C} r={R_SIGN_IN} fill="none" stroke="var(--c-primary)" strokeWidth="1" />
        {SIGN_IDS.map((id, i) => {
          const a = pt(i * 30, R_OUT), b = pt(i * 30, R_SIGN_IN);
          const g = pt(i * 30 + 15, (R_OUT + R_SIGN_IN) / 2);
          return (
            <g key={id}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--c-primary)" strokeWidth="1" />
              <g transform={`translate(${g.x - 8} ${g.y - 8}) scale(${16 / 24})`} fill="none" stroke="var(--c-text)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d={GLYPHS[id]} />
              </g>
            </g>
          );
        })}
        {Array.from({ length: 72 }, (_, i) => {
          const a = pt(i * 5, R_SIGN_IN), b = pt(i * 5, R_SIGN_IN - (i % 2 ? 4 : 7));
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--c-border-strong)" strokeWidth="0.8" />;
        })}
      </g>

      {/* houses */}
      <circle cx={C} cy={C} r={R_HOUSE_IN} fill="var(--c-bg)" fillOpacity="0.5" stroke="var(--c-gold)" strokeOpacity="0.5" strokeWidth="0.8" />
      <circle cx={C} cy={C} r={R_ASPECT} fill="none" stroke="var(--c-gold)" strokeOpacity="0.35" strokeWidth="0.8" />
      {cusps.map((cusp, i) => {
        const angular = i % 3 === 0;
        const a = pt(cusp, R_SIGN_IN), b = pt(cusp, angular ? 0 : R_HOUSE_IN);
        const label = pt(cusp + 15, R_HOUSE_IN + 12);
        return (
          <g key={i} className="nw-house">
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={angular ? 'var(--c-primary)' : 'var(--c-border-strong)'} strokeWidth={angular ? 1.4 : 0.8} />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="var(--c-text-2)" className="num">{i + 1}</text>
          </g>
        );
      })}
      {(ascendant !== undefined || chart.rising) && (() => { const p = pt(asc, R_OUT + 4); return <path d={`M${p.x - 6} ${p.y - 5} L${p.x} ${p.y} L${p.x - 6} ${p.y + 5} Z`} fill="var(--c-primary)" />; })()}

      {/* aspects */}
      {chart.aspects.filter((a) => a.type !== 'Conjunction').map((a, i) => {
        const p1 = byName.get(a.planet1), p2 = byName.get(a.planet2);
        if (!p1 || !p2) return null;
        const s = pt(p1.lon, R_ASPECT), e = pt(p2.lon, R_ASPECT);
        const tense = TENSE.has(a.type), harm = HARMONIC.has(a.type);
        return (
          <line key={i} className="nw-aspect" x1={s.x} y1={s.y} x2={e.x} y2={e.y}
            stroke={tense ? 'var(--c-primary)' : harm ? 'var(--c-gold)' : 'var(--c-text-3)'}
            strokeWidth={a.orb < 3 ? 1.2 : 0.8} strokeDasharray={tense || harm ? undefined : '3 3'} opacity={0.85}>
            <title>{`${tx(a.planet1)} ${tx(a.type_zh)} ${tx(a.planet2)}`}</title>
          </line>
        );
      })}

      {/* planets */}
      {placed.map((p) => {
        const g = pt(p.drawLon, R_PLANET), dot = pt(p.lon, R_ASPECT);
        const tick = pt(p.lon, R_SIGN_IN);
        const isLum = p.planet_en === 'Sun' || p.planet_en === 'Moon';
        return (
          <g key={p.planet_en} className="nw-planet">
            <line x1={tick.x} y1={tick.y} x2={pt(p.lon, R_SIGN_IN - 9).x} y2={pt(p.lon, R_SIGN_IN - 9).y} stroke="var(--c-gold)" strokeWidth="1" />
            <circle cx={dot.x} cy={dot.y} r="2.2" fill="var(--c-text)" />
            <text x={g.x} y={g.y} textAnchor="middle" dominantBaseline="central" fontSize="15"
              fill={isLum ? 'var(--c-gold)' : 'var(--c-text)'} style={{ fontFamily: '"Segoe UI Symbol","Apple Symbols","Noto Sans Symbols",serif' }}>
              {symbolFor(p.planet_en) + '\uFE0E'}
            </text>
            <title>{`${tx(p.planet)} ${tx(p.sign)} ${p.degree.toFixed(0)}°`}</title>
          </g>
        );
      })}
    </svg>
  );
}

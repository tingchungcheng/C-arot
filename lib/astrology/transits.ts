import * as Astronomy from 'astronomy-engine';
import type { BirthChartData } from './calculator';

/** 流日 day · 流月 month · 流年 year */
export type TransitPeriod = 'day' | 'month' | 'year';

const SIGNS = ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'];
const SIGNS_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const BODIES: { body: Astronomy.Body; name: string; name_en: string }[] = [
  { body: Astronomy.Body.Sun, name: '太阳', name_en: 'Sun' },
  { body: Astronomy.Body.Moon, name: '月亮', name_en: 'Moon' },
  { body: Astronomy.Body.Mercury, name: '水星', name_en: 'Mercury' },
  { body: Astronomy.Body.Venus, name: '金星', name_en: 'Venus' },
  { body: Astronomy.Body.Mars, name: '火星', name_en: 'Mars' },
  { body: Astronomy.Body.Jupiter, name: '木星', name_en: 'Jupiter' },
  { body: Astronomy.Body.Saturn, name: '土星', name_en: 'Saturn' },
  { body: Astronomy.Body.Uranus, name: '天王星', name_en: 'Uranus' },
  { body: Astronomy.Body.Neptune, name: '海王星', name_en: 'Neptune' },
  { body: Astronomy.Body.Pluto, name: '冥王星', name_en: 'Pluto' },
];
/** Which transiting planets matter for each period (fast ones are noise over a year). */
const PERIOD_BODIES: Record<TransitPeriod, string[]> = {
  day: ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'],
  month: ['Sun','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'],
  year: ['Jupiter','Saturn','Uranus','Neptune','Pluto'],
};
const ORB: Record<TransitPeriod, number> = { day: 3, month: 4, year: 5 };
const ASPECTS = [
  { type: 'Conjunction', type_zh: '合相', angle: 0 },
  { type: 'Sextile', type_zh: '六分相', angle: 60 },
  { type: 'Square', type_zh: '四分相', angle: 90 },
  { type: 'Trine', type_zh: '三分相', angle: 120 },
  { type: 'Opposition', type_zh: '对分相', angle: 180 },
];

export interface TransitPlanet {
  planet: string; planet_en: string;
  longitude: number; sign: string; sign_en: string; degree: number;
  retrograde: boolean;
  natalHouse?: number; // which natal house it is passing through
}
export interface TransitAspect {
  transit: string; transit_en: string;
  natal: string; natal_en: string;
  type: string; type_zh: string;
  orb: number; applying: boolean;
}
export interface TransitResult {
  period: TransitPeriod;
  /** ISO date range this reading covers */
  from: string; to: string;
  /** moment the positions were sampled at (UTC ISO) */
  sampledAt: string;
  planets: TransitPlanet[];   // outer ring
  aspects: TransitAspect[];   // transit → natal lines, tightest first
}

const norm = (x: number) => ((x % 360) + 360) % 360;
const lonOf = (b: Astronomy.Body, d: Date) =>
  b === Astronomy.Body.Sun ? Astronomy.SunPosition(d).elon : Astronomy.Ecliptic(Astronomy.GeoVector(b, d, true)).elon;
const natalLon = (p: { sign_en: string; degree: number }) => SIGNS_EN.indexOf(p.sign_en) * 30 + p.degree;

/** Reference window for a period, from a YYYY-MM-DD date. */
export function periodWindow(period: TransitPeriod, date: string) {
  const [y, m, d] = date.split('-').map(Number);
  if (period === 'day') return { from: date, to: date, sample: new Date(Date.UTC(y, m - 1, d, 4)) }; // ~noon MYT
  if (period === 'month') {
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const mm = String(m).padStart(2, '0');
    return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${last}`, sample: new Date(Date.UTC(y, m - 1, 15, 4)) };
  }
  return { from: `${y}-01-01`, to: `${y}-12-31`, sample: new Date(Date.UTC(y, 6, 1, 4)) };
}

export function calculateTransits(natal: BirthChartData, period: TransitPeriod, date: string): TransitResult {
  const { from, to, sample } = periodWindow(period, date);
  const later = new Date(sample.getTime() + 86400000);
  const asc = natal.rising ? natalLon(natal.rising) : undefined;

  const planets: TransitPlanet[] = BODIES.filter(b => PERIOD_BODIES[period].includes(b.name_en)).map(b => {
    const lon = norm(lonOf(b.body, sample));
    const next = norm(lonOf(b.body, later));
    const retro = b.name_en !== 'Sun' && b.name_en !== 'Moon' && ((next - lon + 540) % 360) - 180 < 0;
    const i = Math.floor(lon / 30);
    return {
      planet: b.name, planet_en: b.name_en, longitude: lon,
      sign: SIGNS[i], sign_en: SIGNS_EN[i], degree: lon % 30, retrograde: retro,
      natalHouse: asc === undefined ? undefined : Math.floor(norm(lon - asc) / 30) + 1,
    };
  });

  const natalPoints = [...natal.planets, ...(natal.rising ? [natal.rising] : [])];
  const aspects: TransitAspect[] = [];
  for (const t of planets) {
    const b = BODIES.find(x => x.name_en === t.planet_en)!;
    const tNext = norm(lonOf(b.body, later));
    for (const n of natalPoints) {
      const nl = natalLon(n);
      const sep = Math.abs(((t.longitude - nl + 540) % 360) - 180);
      const sepNext = Math.abs(((tNext - nl + 540) % 360) - 180);
      for (const a of ASPECTS) {
        const orb = Math.abs(sep - a.angle);
        if (orb <= ORB[period]) {
          aspects.push({
            transit: t.planet, transit_en: t.planet_en, natal: n.planet, natal_en: n.planet_en,
            type: a.type, type_zh: a.type_zh, orb: Math.round(orb * 10) / 10,
            applying: Math.abs(sepNext - a.angle) < orb,
          });
        }
      }
    }
  }
  aspects.sort((a, b) => a.orb - b.orb);
  return { period, from, to, sampledAt: sample.toISOString(), planets, aspects };
}

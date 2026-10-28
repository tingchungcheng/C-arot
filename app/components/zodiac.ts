import astrology from '@/lib/data/astrology.json';
import type { AstrologyData, ZodiacSign, Element } from '@/lib/data/types';

const data = astrology as unknown as AstrologyData;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const ELEMENT_ZH: Record<Element, string> = { fire: '火象', earth: '土象', air: '风象', water: '水象' };

function parseEnd(s: string): [number, number] | null {
  const m = s.trim().match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})$/);
  if (!m) return null;
  const mi = MONTHS.indexOf(m[1].toLowerCase());
  return mi < 0 ? null : [mi + 1, Number(m[2])];
}

/** Parsed sign ranges from lib/data/astrology.json signs[].date_range, e.g. "Mar 21 – Apr 19". */
const RANGES = data.signs.map((sign) => {
  const [a, b] = sign.date_range.split(/\s*[–—-]\s*/);
  return { sign, start: parseEnd(a ?? ''), end: parseEnd(b ?? '') };
});

const key = (m: number, d: number) => m * 100 + d;

export function zodiacFor(month: number, day: number): ZodiacSign | null {
  const k = key(month, day);
  for (const r of RANGES) {
    if (!r.start || !r.end) continue;
    const s = key(...r.start), e = key(...r.end);
    if (s <= e ? k >= s && k <= e : k >= s || k <= e) return r.sign;
  }
  return null;
}

export function zodiacById(id: string): ZodiacSign | undefined {
  return data.signs.find((s) => s.id === id || s.name_en.toLowerCase() === id.toLowerCase() || s.name_zh === id);
}

export function formatRangeZh(range: string): string {
  const [a, b] = range.split(/\s*[–—-]\s*/).map(parseEnd);
  if (!a || !b) return range;
  return `${a[0]}月${a[1]}日 – ${b[0]}月${b[1]}日`;
}

export const SIGNS = data.signs;
export const PLANETS = data.planets;

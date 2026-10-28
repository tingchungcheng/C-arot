import * as Astronomy from 'astronomy-engine';

const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_ZH = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
const D2R = Math.PI / 180;
const norm = (d: number) => ((d % 360) + 360) % 360;

/** Ecliptic longitude (0–360) from a sign name + degree-in-sign as returned by lib/astrology. */
export function eclipticLon(p: { sign_en: string; degree: number }) {
  const i = SIGN_IDS.indexOf(p.sign_en.toLowerCase());
  return norm((i < 0 ? 0 : i) * 30 + p.degree);
}

/**
 * Ecliptic longitude -> wheel angle in standard math degrees (0 = 3 o'clock, CCW positive).
 * Ascendant is pinned at 180° (9 o'clock) and the zodiac runs counter-clockwise.
 */
export function wheelAngle(lon: number, asc: number) {
  return norm(180 + lon - asc);
}

/** Wheel angle -> SVG point (y axis points down, so subtract sin). */
export function polar(angleDeg: number, r: number, c: number) {
  return { x: c + r * Math.cos(angleDeg * D2R), y: c - r * Math.sin(angleDeg * D2R) };
}

/** UTC offset (minutes) of an IANA zone at a given instant. */
function tzOffsetMinutes(tz: string, at: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - at.getTime()) / 60000;
}

/** Local wall-clock date/time in an IANA zone -> UTC Date. */
export function zonedToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffsetMinutes(tz, new Date(guess));
  return new Date(guess - off * 60000);
}

/**
 * Ascendant (ecliptic longitude) from the local sidereal time and latitude.
 * UI-side because lib/astrology's ascendant uses the Sun's hour angle + 90°, which is not an ascendant.
 */
export function computeAscendant(utc: Date, latitude: number, longitude: number) {
  const gast = Astronomy.SiderealTime(utc); // hours
  const ramc = norm(gast * 15 + longitude) * D2R;
  const eps = 23.4393 * D2R;
  const phi = latitude * D2R;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / D2R;
  return norm(asc);
}

export function signOf(lon: number) {
  const i = Math.floor(norm(lon) / 30);
  return { sign: SIGN_ZH[i], sign_en: SIGN_IDS[i][0].toUpperCase() + SIGN_IDS[i].slice(1), degree: norm(lon) % 30 };
}

/** Equal-house number (1–12) of a longitude relative to the ascendant. */
export function houseOf(lon: number, asc: number) {
  return Math.floor(norm(lon - asc) / 30) + 1;
}

/** Spread glyph angles so neighbours are at least `gap` degrees apart (circular, keeps order). */
export function spreadAngles(angles: number[], gap = 9) {
  const idx = angles.map((a, i) => ({ a: norm(a), i })).sort((p, q) => p.a - q.a);
  const out = idx.map((p) => p.a);
  for (let pass = 0; pass < 6; pass++) {
    for (let k = 0; k < out.length; k++) {
      const n = (k + 1) % out.length;
      let diff = norm(out[n] - out[k]);
      if (out.length > 1 && diff < gap) {
        const push = (gap - diff) / 2;
        out[k] = norm(out[k] - push);
        out[n] = norm(out[n] + push);
      }
    }
  }
  const res = new Array<number>(angles.length);
  idx.forEach((p, k) => { res[p.i] = out[k]; });
  return res;
}

import { calculateBirthChart } from '@/lib/astrology/calculator';
import { eclipticLon, wheelAngle, polar, computeAscendant, zonedToUtc, houseOf, spreadAngles } from '@/app/components/natal-geometry';

describe('natal wheel geometry', () => {
  // Real chart: 1998-06-14 08:30 Kuala Lumpur
  const utc = zonedToUtc('1998-06-14', '08:30', 'Asia/Kuala_Lumpur');
  const asc = computeAscendant(utc, 3.139, 101.687);
  const chart = calculateBirthChart({ date: '1998-06-14', time: '08:30', latitude: 3.139, longitude: 101.687, timezone: 'Asia/Kuala_Lumpur' } as never);

  it('converts local time with the zone offset', () => {
    expect(utc.toISOString()).toBe('1998-06-14T00:30:00.000Z');
  });

  it('puts the ascendant at 9 o\'clock and runs counter-clockwise', () => {
    expect(wheelAngle(asc, asc)).toBeCloseTo(180);
    const p = polar(wheelAngle(asc, asc), 100, 200);
    expect(p.x).toBeCloseTo(100); expect(p.y).toBeCloseTo(200);
    // 90° further along the zodiac (IC side) is at the bottom (6 o'clock)
    const q = polar(wheelAngle(asc + 90, asc), 100, 200);
    expect(q.y).toBeGreaterThan(299);
  });

  it('computes a plausible ascendant: morning sun sits just above the ascendant in house 12', () => {
    // ~1.5h after sunrise the ascendant is in Cancer and the Sun is in the 12th house
    expect(Math.floor(asc / 30)).toBe(3);
    expect(houseOf(eclipticLon(chart.sun), asc)).toBe(12);
    const sunAngle = wheelAngle(eclipticLon(chart.sun), asc);
    expect(sunAngle).toBeGreaterThan(180 - 45); expect(sunAngle).toBeLessThan(180);
  });

  it('spreads planets over both halves of the wheel', () => {
    const xs = chart.planets.map((p) => polar(wheelAngle(eclipticLon(p), asc), 100, 200).x);
    expect(xs.some((x) => x < 200)).toBe(true);
    expect(xs.some((x) => x > 200)).toBe(true);
  });

  it('aspect endpoints match the angular separation the aspect claims', () => {
    const lon = new Map(chart.planets.map((p) => [p.planet_en, eclipticLon(p)]));
    for (const a of chart.aspects) {
      const s = wheelAngle(lon.get(a.planet1)!, asc), e = wheelAngle(lon.get(a.planet2)!, asc);
      let sep = Math.abs(s - e) % 360; if (sep > 180) sep = 360 - sep;
      expect(Math.abs(sep - a.angle)).toBeLessThanOrEqual(a.orb + 0.01);
    }
  });

  it('spreadAngles keeps a minimum gap', () => {
    const out = spreadAngles([10, 11, 12, 200], 9);
    expect(Math.abs(out[1] - out[0])).toBeGreaterThanOrEqual(8.9);
    expect(out[3]).toBeCloseTo(200);
  });
});

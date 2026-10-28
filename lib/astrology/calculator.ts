import * as Astronomy from 'astronomy-engine';

const SIGNS = [
  '白羊座', '金牛座', '双子座', '巨蟹座',
  '狮子座', '处女座', '天秤座', '天蝎座',
  '射手座', '摩羯座', '水瓶座', '双鱼座'
];

const SIGNS_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const PLANETS = [
  { key: 'sun', name: '太阳', name_en: 'Sun' },
  { key: 'moon', name: '月亮', name_en: 'Moon' },
  { key: 'mercury', name: '水星', name_en: 'Mercury' },
  { key: 'venus', name: '金星', name_en: 'Venus' },
  { key: 'mars', name: '火星', name_en: 'Mars' },
  { key: 'jupiter', name: '木星', name_en: 'Jupiter' },
  { key: 'saturn', name: '土星', name_en: 'Saturn' },
  { key: 'uranus', name: '天王星', name_en: 'Uranus' },
  { key: 'neptune', name: '海王星', name_en: 'Neptune' },
  { key: 'pluto', name: '冥王星', name_en: 'Pluto' }
];

export interface BirthData {
  date: string;
  time?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PlanetPosition {
  planet: string;
  planet_en: string;
  sign: string;
  sign_en: string;
  degree: number;
  house?: number;
}

export interface BirthChartData {
  sun: PlanetPosition;
  moon: PlanetPosition;
  rising?: PlanetPosition;
  planets: PlanetPosition[];
  houses?: number[];
  aspects: Aspect[];
}

export interface Aspect {
  planet1: string;
  planet2: string;
  type: string;
  type_zh: string;
  angle: number;
  orb: number;
}

function getZodiacSign(longitude: number): { sign: string; sign_en: string; degree: number } {
  const normalizedLon = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLon / 30);
  const degree = normalizedLon % 30;

  return {
    sign: SIGNS[signIndex],
    sign_en: SIGNS_EN[signIndex],
    degree
  };
}

/**
 * Ecliptic longitude of the Ascendant (degrees, 0-360).
 * RAMC = local sidereal time; ε = mean obliquity of the ecliptic.
 * λ_asc = atan2(cos RAMC, -(sin RAMC·cos ε + tan φ·sin ε))
 */
export function calculateAscendant(date: Date, latitude: number, longitude: number): number {
  const rad = Math.PI / 180;
  const gstHours = Astronomy.SiderealTime(date);
  const ramc = (((gstHours * 15 + longitude) % 360) + 360) % 360;
  const T = Astronomy.MakeTime(date).tt / 36525;
  const eps = 23.439291 - 0.0130042 * T;
  const y = Math.cos(ramc * rad);
  const x = -(Math.sin(ramc * rad) * Math.cos(eps * rad) + Math.tan(latitude * rad) * Math.sin(eps * rad));
  return ((Math.atan2(y, x) / rad) % 360 + 360) % 360;
}

function calculateHouseNumber(longitude: number, ascendant: number): number {
  let diff = ((longitude - ascendant) % 360 + 360) % 360;
  return Math.floor(diff / 30) + 1;
}

function calculateAspects(positions: { [key: string]: number }): Aspect[] {
  const aspects: Aspect[] = [];
  const aspectTypes = [
    { angle: 0, name: 'Conjunction', name_zh: '合相', orb: 8 },
    { angle: 60, name: 'Sextile', name_zh: '六分相', orb: 6 },
    { angle: 90, name: 'Square', name_zh: '四分相', orb: 8 },
    { angle: 120, name: 'Trine', name_zh: '三分相', orb: 8 },
    { angle: 180, name: 'Opposition', name_zh: '对分相', orb: 8 }
  ];

  const planetKeys = Object.keys(positions);
  for (let i = 0; i < planetKeys.length; i++) {
    for (let j = i + 1; j < planetKeys.length; j++) {
      const p1 = planetKeys[i];
      const p2 = planetKeys[j];
      const lon1 = positions[p1];
      const lon2 = positions[p2];

      let diff = Math.abs(lon1 - lon2);
      if (diff > 180) diff = 360 - diff;

      for (const aspectType of aspectTypes) {
        const orb = Math.abs(diff - aspectType.angle);
        if (orb <= aspectType.orb) {
          aspects.push({
            planet1: p1,
            planet2: p2,
            type: aspectType.name,
            type_zh: aspectType.name_zh,
            angle: aspectType.angle,
            orb
          });
          break;
        }
      }
    }
  }

  return aspects;
}

export function calculateBirthChart(birthData: BirthData): BirthChartData {
  const { date, time, latitude, longitude } = birthData;

  const dateTimeStr = time ? `${date}T${time}` : `${date}T12:00:00`;
  const birthDate = new Date(dateTimeStr);

  const planetPositions: { [key: string]: number } = {};
  const planetData: PlanetPosition[] = [];

  for (const planet of PLANETS) {
    try {
      let longitude: number;
      if (planet.key === 'sun') {
        const ecliptic = Astronomy.SunPosition(birthDate);
        longitude = ecliptic.elon;
      } else if (planet.key === 'moon') {
        const vector = Astronomy.GeoMoon(birthDate);
        const ecliptic = Astronomy.Ecliptic(vector);
        longitude = ecliptic.elon;
      } else {
        const bodyMap: { [key: string]: Astronomy.Body } = {
          mercury: Astronomy.Body.Mercury,
          venus: Astronomy.Body.Venus,
          mars: Astronomy.Body.Mars,
          jupiter: Astronomy.Body.Jupiter,
          saturn: Astronomy.Body.Saturn,
          uranus: Astronomy.Body.Uranus,
          neptune: Astronomy.Body.Neptune,
          pluto: Astronomy.Body.Pluto
        };
        const equatorial = Astronomy.GeoVector(bodyMap[planet.key], birthDate, false);
        const ecliptic = Astronomy.Ecliptic(equatorial);
        longitude = ecliptic.elon;
      }
      planetPositions[planet.name_en] = longitude;

      const zodiacInfo = getZodiacSign(longitude);
      planetData.push({
        planet: planet.name,
        planet_en: planet.name_en,
        sign: zodiacInfo.sign,
        sign_en: zodiacInfo.sign_en,
        degree: zodiacInfo.degree
      });
    } catch (error) {
      console.error(`Error calculating ${planet.name}:`, error);
    }
  }

  let risingSign: PlanetPosition | undefined;
  let houses: number[] | undefined;

  if (time) {
    try {
      const ascendantLon = calculateAscendant(birthDate, latitude, longitude);

      const zodiacInfo = getZodiacSign(ascendantLon);
      risingSign = {
        planet: '上升',
        planet_en: 'Ascendant',
        sign: zodiacInfo.sign,
        sign_en: zodiacInfo.sign_en,
        degree: zodiacInfo.degree
      };

      houses = Array.from({ length: 12 }, (_, i) => (ascendantLon + i * 30) % 360);

      planetData.forEach(p => {
        const pLon = planetPositions[p.planet_en];
        if (pLon !== undefined && ascendantLon !== undefined) {
          p.house = calculateHouseNumber(pLon, ascendantLon);
        }
      });
    } catch (error) {
      console.error('Error calculating rising sign:', error);
    }
  }

  const aspects = calculateAspects(planetPositions);

  return {
    sun: planetData[0],
    moon: planetData[1],
    rising: risingSign,
    planets: planetData,
    houses,
    aspects
  };
}

export function formatBirthChartSummary(chart: BirthChartData): string {
  let summary = `太阳: ${chart.sun.sign} ${chart.sun.degree.toFixed(1)}°\n`;
  summary += `月亮: ${chart.moon.sign} ${chart.moon.degree.toFixed(1)}°\n`;
  if (chart.rising) {
    summary += `上升: ${chart.rising.sign} ${chart.rising.degree.toFixed(1)}°\n`;
  }

  summary += '\n主要行星:\n';
  chart.planets.slice(2).forEach(p => {
    const houseStr = p.house ? ` (第${p.house}宫)` : '';
    summary += `${p.planet}: ${p.sign} ${p.degree.toFixed(1)}°${houseStr}\n`;
  });

  if (chart.aspects.length > 0) {
    summary += '\n主要相位:\n';
    chart.aspects.slice(0, 10).forEach(a => {
      summary += `${a.planet1} ${a.type_zh} ${a.planet2} (容差: ${a.orb.toFixed(1)}°)\n`;
    });
  }

  return summary;
}

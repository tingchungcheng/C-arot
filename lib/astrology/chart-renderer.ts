import type { BirthChartData } from './calculator';

const SIGNS_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const PLANET_SYMBOLS: { [key: string]: string } = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  Ascendant: 'ASC'
};

export function renderBirthChartSVG(chart: BirthChartData, width: number = 600, height: number = 600): string {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
  
  svg += `<defs>
    <style>
      .zodiac-line { stroke: #4a5568; stroke-width: 1; }
      .zodiac-text { fill: #2d3748; font-size: 16px; font-weight: bold; }
      .planet-symbol { fill: #3182ce; font-size: 20px; font-weight: bold; }
      .house-line { stroke: #cbd5e0; stroke-width: 1; stroke-dasharray: 2,2; }
      .outer-circle { stroke: #2d3748; stroke-width: 2; fill: none; }
      .inner-circle { stroke: #4a5568; stroke-width: 1; fill: none; }
    </style>
  </defs>`;
  
  svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" class="outer-circle"/>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${radius * 0.7}" class="inner-circle"/>`;
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const x1 = cx + radius * 0.7 * Math.cos(angle);
    const y1 = cy + radius * 0.7 * Math.sin(angle);
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="zodiac-line"/>`;
    
    const signAngle = (i * 30 + 15 - 90) * Math.PI / 180;
    const signX = cx + radius * 0.85 * Math.cos(signAngle);
    const signY = cy + radius * 0.85 * Math.sin(signAngle);
    
    svg += `<text x="${signX}" y="${signY}" text-anchor="middle" dominant-baseline="middle" class="zodiac-text">${SIGNS_SYMBOLS[i]}</text>`;
  }
  
  if (chart.houses && chart.rising) {
    for (let i = 0; i < 12; i++) {
      const houseAngle = (chart.houses[i] - 90) * Math.PI / 180;
      const x1 = cx;
      const y1 = cy;
      const x2 = cx + radius * 0.7 * Math.cos(houseAngle);
      const y2 = cy + radius * 0.7 * Math.sin(houseAngle);
      
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="house-line"/>`;
    }
  }
  
  const allPlanets = [...chart.planets];
  if (chart.rising) {
    allPlanets.push(chart.rising);
  }
  
  allPlanets.forEach((planet, index) => {
    const planetLon = planet.degree + (SIGNS_SYMBOLS.indexOf(planet.sign.charAt(0)) !== -1 
      ? Array.from(planet.sign)[0] === '白' ? 0
      : planet.sign === '金牛座' ? 30
      : planet.sign === '双子座' ? 60
      : planet.sign === '巨蟹座' ? 90
      : planet.sign === '狮子座' ? 120
      : planet.sign === '处女座' ? 150
      : planet.sign === '天秤座' ? 180
      : planet.sign === '天蝎座' ? 210
      : planet.sign === '射手座' ? 240
      : planet.sign === '摩羯座' ? 270
      : planet.sign === '水瓶座' ? 300
      : 330
      : 0);
    
    const signIndex = Math.floor(planetLon / 30) % 12;
    const actualLon = signIndex * 30 + planet.degree;
    
    const angle = (actualLon - 90) * Math.PI / 180;
    const planetRadius = radius * 0.55;
    const planetX = cx + planetRadius * Math.cos(angle);
    const planetY = cy + planetRadius * Math.sin(angle);
    
    const symbol = PLANET_SYMBOLS[planet.planet_en] || planet.planet_en.substring(0, 2);
    svg += `<text x="${planetX}" y="${planetY}" text-anchor="middle" dominant-baseline="middle" class="planet-symbol">${symbol}</text>`;
  });
  
  svg += '</svg>';
  
  return svg;
}

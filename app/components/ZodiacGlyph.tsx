/** Zodiac sign glyphs drawn as SVG strokes (24 viewBox, currentColor) — never Unicode characters. */
export const GLYPHS: Record<string, string> = {
  aries: 'M12 21V10M12 10C12 5 9 3 6.5 3.5 4 4 3.5 7 5 9M12 10c0-5 3-7 5.5-6.5 2.5.5 3 3.5 1.5 5.5',
  taurus: 'M4 4c1 3 4 5 8 5s7-2 8-5M12 9a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
  gemini: 'M5 4c4 1.3 10 1.3 14 0M5 20c4-1.3 10-1.3 14 0M9 5v14M15 5v14',
  cancer: 'M19 9.5C17 6 13.5 5 10 5.5 7 6 4.5 7.5 4 9.5M5 14.5C7 18 10.5 19 14 18.5c3-.5 5.5-2 6-4M7.5 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM16.5 11.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  leo: 'M8 15a3 3 0 1 1-3 3M8 18c0-4-3-6-3-10a5 5 0 0 1 10 0c0 4-3 6-3 9a3 3 0 0 0 6 0',
  virgo: 'M4 6c1.5 0 2 1 2 2.5V18M6 9c0-2 1-3 2.3-3S10.5 7 10.5 9v9M10.5 9c0-2 1-3 2.3-3s2.2 1 2.2 3v6c0 3 2 4.5 4.5 3M15 13c1.5-2 4.5-2 4.5 1S17 19 14 20',
  libra: 'M4 20h16M4 16h5.5a4 4 0 1 1 5 0H20',
  scorpio: 'M4 6c1.5 0 2 1 2 2.5V18M6 9c0-2 1-3 2.3-3S10.5 7 10.5 9v9M10.5 9c0-2 1-3 2.3-3s2.2 1 2.2 3v8c0 1.5 1 2 2 2h3M18 17l2 2-2 2',
  sagittarius: 'M5 19L19 5M12 5h7v7M8 12l4 4',
  capricorn: 'M4 6l3 10 3-10v9c0 2 1.5 4 4 4M10 9c1-3 6-3 6 1s-3 5-2 7c1 2.5 4.5 2 5 0s-1.5-3.5-3-2.5',
  aquarius: 'M3 10l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5M3 16l3-2.5 3 2.5 3-2.5 3 2.5 3-2.5 3 2.5',
  pisces: 'M6 4c3 4 3 12 0 16M18 4c-3 4-3 12 0 16M5 12h14',
};

export const ZODIAC_IDS = Object.keys(GLYPHS);

export default function ZodiacGlyph({ sign, size = 24, className, strokeWidth = 1.75 }: { sign: string; size?: number; className?: string; strokeWidth?: number }) {
  const d = GLYPHS[sign.toLowerCase()];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

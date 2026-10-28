export type Element = 'fire' | 'water' | 'air' | 'earth';
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

export interface TarotCardData {
  id: string;
  slug: string;
  name_en: string;
  name_zh: string;
  arcana_type: 'major' | 'minor';
  number: number;
  suit?: Suit;
  element: Element;
  astro: string | null;
  upright_keywords: string[];
  upright_meaning: string;
  reversed_keywords: string[];
  reversed_meaning: string;
  wonderland_motif: string;
}

export interface ZodiacSign {
  id: string;
  name_en: string;
  name_zh: string;
  symbol: string;
  element: Element;
  modality: 'cardinal' | 'fixed' | 'mutable';
  ruler: string;
  date_range: string;
  keywords_zh: string[];
  description_zh: string;
  wonderland_motif: string;
}

export interface Planet {
  id: string;
  name_en: string;
  name_zh: string;
  symbol: string;
  governs_zh: string;
  keywords_zh: string[];
  wonderland_motif: string;
}

export interface House {
  number: number;
  name_zh: string;
  theme_en: string;
  theme_zh: string;
  keywords_zh: string[];
}

export interface AstrologyData {
  signs: ZodiacSign[];
  planets: Planet[];
  houses: House[];
}

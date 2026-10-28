import deckData from '@/lib/data/tarot-deck.json';

export interface TarotCard {
  id: string;
  name_en: string;
  name_zh: string;
  arcana_type: 'major' | 'minor';
  number?: number;
  suit?: string;
  upright_keywords: string[];
  upright_meaning: string;
  reversed_keywords: string[];
  reversed_meaning: string;
}

export interface DrawnCard {
  card: TarotCard;
  position: number;
  position_label: string;
  orientation: 'upright' | 'reversed';
}

export const TAROT_DECK: TarotCard[] = deckData as TarotCard[];

export function validateDeck(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (TAROT_DECK.length !== 78) {
    errors.push(`Expected 78 cards, got ${TAROT_DECK.length}`);
  }
  
  const ids = new Set<string>();
  TAROT_DECK.forEach((card, index) => {
    if (ids.has(card.id)) {
      errors.push(`Duplicate card ID: ${card.id}`);
    }
    ids.add(card.id);
    
    if (!card.name_en || !card.name_zh) {
      errors.push(`Card at index ${index} missing names`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function getCardById(id: string): TarotCard | undefined {
  return TAROT_DECK.find(card => card.id === id);
}

import { webcrypto } from 'crypto';
import { TAROT_DECK, type TarotCard, type DrawnCard } from './deck';

const POSITION_LABELS = ['past', 'present', 'future'] as const;
const POSITION_LABELS_ZH = ['过去', '现在', '未来'] as const;

function getSecureRandomInt(max: number): number {
  const randomBuffer = new Uint32Array(1);
  webcrypto.getRandomValues(randomBuffer);
  
  const range = max;
  const maxValid = Math.floor(0xFFFFFFFF / range) * range;
  
  let randomValue = randomBuffer[0];
  while (randomValue >= maxValid) {
    webcrypto.getRandomValues(randomBuffer);
    randomValue = randomBuffer[0];
  }
  
  return randomValue % range;
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

function getSecureOrientation(): 'upright' | 'reversed' {
  const randomBuffer = new Uint8Array(1);
  webcrypto.getRandomValues(randomBuffer);
  return (randomBuffer[0] & 1) === 0 ? 'upright' : 'reversed';
}

export interface ThreeCardDrawResult {
  cards: DrawnCard[];
  timestamp: number;
}

export function drawThreeCards(): ThreeCardDrawResult {
  const shuffled = fisherYatesShuffle(TAROT_DECK);
  const selectedCards = shuffled.slice(0, 3);
  
  const drawnCards: DrawnCard[] = selectedCards.map((card, index) => ({
    card,
    position: index + 1,
    position_label: POSITION_LABELS[index],
    orientation: getSecureOrientation()
  }));
  
  return {
    cards: drawnCards,
    timestamp: Date.now()
  };
}

export function formatPositionLabel(label: string, language: 'en' | 'zh' = 'zh'): string {
  if (language === 'zh') {
    const index = POSITION_LABELS.indexOf(label as typeof POSITION_LABELS[number]);
    return index >= 0 ? POSITION_LABELS_ZH[index] : label;
  }
  return label;
}

import { drawThreeCards } from '../lib/tarot/draw';
import { validateDeck, TAROT_DECK } from '../lib/tarot/deck';

describe('Tarot Draw', () => {
  test('deck validation - should have exactly 78 cards', () => {
    const validation = validateDeck();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(TAROT_DECK.length).toBe(78);
  });

  test('deck validation - all cards have unique IDs', () => {
    const ids = TAROT_DECK.map(card => card.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(78);
  });

  test('deck validation - all cards have required fields', () => {
    TAROT_DECK.forEach(card => {
      expect(card.id).toBeTruthy();
      expect(card.name_en).toBeTruthy();
      expect(card.name_zh).toBeTruthy();
      expect(card.arcana_type).toMatch(/^(major|minor)$/);
      expect(Array.isArray(card.upright_keywords)).toBe(true);
      expect(card.upright_meaning).toBeTruthy();
      expect(Array.isArray(card.reversed_keywords)).toBe(true);
      expect(card.reversed_meaning).toBeTruthy();
    });
  });

  test('drawThreeCards - should return exactly 3 cards', () => {
    const result = drawThreeCards();
    expect(result.cards).toHaveLength(3);
  });

  test('drawThreeCards - should return unique cards', () => {
    const result = drawThreeCards();
    const cardIds = result.cards.map(dc => dc.card.id);
    const uniqueIds = new Set(cardIds);
    expect(uniqueIds.size).toBe(3);
  });

  test('drawThreeCards - cards should have correct positions', () => {
    const result = drawThreeCards();
    expect(result.cards[0].position).toBe(1);
    expect(result.cards[1].position).toBe(2);
    expect(result.cards[2].position).toBe(3);
    expect(result.cards[0].position_label).toBe('past');
    expect(result.cards[1].position_label).toBe('present');
    expect(result.cards[2].position_label).toBe('future');
  });

  test('drawThreeCards - each card should have orientation', () => {
    const result = drawThreeCards();
    result.cards.forEach(card => {
      expect(['upright', 'reversed']).toContain(card.orientation);
    });
  });

  test('drawThreeCards - should return timestamp', () => {
    const result = drawThreeCards();
    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  test('drawThreeCards - multiple draws should be different', () => {
    const result1 = drawThreeCards();
    const result2 = drawThreeCards();
    
    const cards1 = result1.cards.map(dc => dc.card.id).join(',');
    const cards2 = result2.cards.map(dc => dc.card.id).join(',');
    
    // Statistically, two random draws should almost never be identical
    // (though theoretically possible, probability is very low)
    expect(cards1).not.toBe(cards2);
  });

  test('drawThreeCards - orientation distribution should be somewhat balanced over many draws', () => {
    let uprightCount = 0;
    let reversedCount = 0;
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const result = drawThreeCards();
      result.cards.forEach(card => {
        if (card.orientation === 'upright') uprightCount++;
        else reversedCount++;
      });
    }

    // With 300 total orientations, expect roughly 150 each (within reasonable variance)
    // Allow 40-60% range for statistical variance
    const total = uprightCount + reversedCount;
    expect(total).toBe(iterations * 3);
    expect(uprightCount / total).toBeGreaterThan(0.35);
    expect(uprightCount / total).toBeLessThan(0.65);
  });
});

import { shuffleDeck, drawAt } from '../lib/tarot/draw';
import { createDrawSession, consumeDrawSession } from '../lib/tarot/draw-session';

describe('shuffleDeck / drawAt', () => {
  it('shuffles all 78 unique cards with orientations', () => {
    const d = shuffleDeck();
    expect(d).toHaveLength(78);
    expect(new Set(d.map(c => c.card.id)).size).toBe(78);
    d.forEach(c => expect(['upright', 'reversed']).toContain(c.orientation));
  });
  it('maps chosen positions to past/present/future in click order', () => {
    const d = shuffleDeck();
    const r = drawAt(d, [40, 2, 77]);
    expect(r.map(c => c.card.id)).toEqual([d[40].card.id, d[2].card.id, d[77].card.id]);
    expect(r.map(c => c.position_label)).toEqual(['past', 'present', 'future']);
    expect(r[0].orientation).toBe(d[40].orientation);
  });
  it('rejects bad positions', () => {
    const d = shuffleDeck();
    expect(() => drawAt(d, [1, 1, 2])).toThrow();
    expect(() => drawAt(d, [1, 2, 78])).toThrow();
    expect(() => drawAt(d, [1, 2])).toThrow();
  });
  it('draw sessions are single use', () => {
    const { drawId, deckSize } = createDrawSession();
    expect(deckSize).toBe(78);
    expect(consumeDrawSession(drawId)).toHaveLength(78);
    expect(consumeDrawSession(drawId)).toBeUndefined();
  });
});

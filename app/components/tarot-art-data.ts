// Shared, DOM-free card-art constants.
/** Major Arcana illustrations live in public/cards/<slug>.webp (slug = deck id with '_' → '-'). Minor Arcana have no art yet. */
export const MAJOR = new Set([
  'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor', 'the-hierophant', 'the-lovers', 'the-chariot',
  'strength', 'the-hermit', 'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance', 'the-devil', 'the-tower',
  'the-star', 'the-moon', 'the-sun', 'judgement', 'the-world',
]);

export const CARD_BACK_SRC = '/cards/card-back.webp';

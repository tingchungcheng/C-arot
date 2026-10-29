// Shared, DOM-free card-art constants.
/** Major Arcana illustrations live in public/cards/<slug>.webp (slug = deck id with '_' → '-'). Minor Arcana art (cropped from the suit sheets) uses the same slug scheme; see MINOR. */
export const MAJOR = new Set([
  'the-fool', 'the-magician', 'the-high-priestess', 'the-empress', 'the-emperor', 'the-hierophant', 'the-lovers', 'the-chariot',
  'strength', 'the-hermit', 'wheel-of-fortune', 'justice', 'the-hanged-man', 'death', 'temperance', 'the-devil', 'the-tower',
  'the-star', 'the-moon', 'the-sun', 'judgement', 'the-world',
]);

/** Minor Arcana art in public/cards/<rank>-of-<suit>.webp (cropped from the *_v2 suit sheets): all 56. */
const RANKS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king'];
const SUITS = ['cups', 'pentacles', 'swords', 'wands'];
export const MINOR = new Set(SUITS.flatMap((suit) => RANKS.map((r) => `${r}-of-${suit}`)));

export const CARD_BACK_SRC = '/cards/card-back.webp';

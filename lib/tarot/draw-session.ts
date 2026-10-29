import { randomUUID } from 'crypto';
import { shuffleDeck, type ShuffledCard } from './draw';

// Server-only store: the shuffled order never leaves the server, so the client cannot pick known cards.
const TTL_MS = 30 * 60 * 1000;
type Session = { deck: ShuffledCard[]; expires: number };
const g = globalThis as unknown as { __carotDraws?: Map<string, Session> };
const store: Map<string, Session> = (g.__carotDraws ??= new Map());

function sweep(now = Date.now()) {
  for (const [id, s] of store) if (s.expires <= now) store.delete(id);
}

export function createDrawSession(): { drawId: string; deckSize: number; expiresAt: number } {
  sweep();
  const drawId = randomUUID();
  const deck = shuffleDeck();
  const expires = Date.now() + TTL_MS;
  store.set(drawId, { deck, expires });
  return { drawId, deckSize: deck.length, expiresAt: expires };
}

/** Single use: returns the deck and deletes the session. undefined if unknown or expired. */
export function consumeDrawSession(drawId: string): ShuffledCard[] | undefined {
  const s = store.get(drawId);
  store.delete(drawId);
  if (!s || s.expires <= Date.now()) return undefined;
  return s.deck;
}

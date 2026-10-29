'use client';

import { getLocale } from '../i18n';

/**
 * 综合解读 history. Storage sits behind `HistoryStore` so the localStorage
 * implementation can be swapped for a DB/API-backed one later without touching the UI.
 */

export interface HistoryCard {
  id: string;
  position_label: string;
  orientation: 'upright' | 'reversed';
  name_zh: string;
  name_en?: string;
}

export interface CombinedHistoryEntry {
  id: string;
  createdAt: string; // ISO
  readingId: string;
  topic?: string;
  question: string;
  cards: HistoryCard[];
  result: string; // markdown
}

export interface HistoryStore {
  list(): Promise<CombinedHistoryEntry[]>; // newest first
  get(id: string): Promise<CombinedHistoryEntry | null>;
  add(entry: Omit<CombinedHistoryEntry, 'id' | 'createdAt'>): Promise<CombinedHistoryEntry>;
  remove(id: string): Promise<void>;
}

export const HISTORY_KEY = 'combinedHistory';
export const HISTORY_CAP = 50;

function read(): CombinedHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list: CombinedHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_CAP)));
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const localHistoryStore: HistoryStore = {
  async list() {
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(id) {
    return read().find((e) => e.id === id) ?? null;
  },
  async add(entry) {
    const e: CombinedHistoryEntry = { ...entry, id: newId(), createdAt: new Date().toISOString() };
    write([e, ...read()]);
    return e;
  },
  async remove(id) {
    write(read().filter((e) => e.id !== id));
  },
};

/** The active store. Swap this for a DB-backed implementation later. */
export const historyStore: HistoryStore = localHistoryStore;

const LAST_READING_KEY = 'lastReadingId';
/** Remember the most recent completed tarot reading (used by /combined). */
export function setLastReadingId(id: string) {
  try { localStorage.setItem(LAST_READING_KEY, id); } catch { /* private mode */ }
}
export function getLastReadingId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(LAST_READING_KEY); } catch { return null; }
}

/** zh: 2026年10月28日 19:00; en: 28 Oct 2026, 19:00; ms: 28 Okt 2026, 19:00 (local time) */
export function formatZhDateTime(iso: string) {
  const d = new Date(iso);
  const loc = getLocale();
  if (loc !== 'zh') return d.toLocaleString(loc === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Plain-text snippet from markdown. */
export function snippet(md: string, n = 80) {
  const t = md.replace(/[#>*_`~]/g, '').replace(/[\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

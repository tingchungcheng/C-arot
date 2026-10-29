import type { Locale } from '@/lib/ai/locale';

// The interpretations table is keyed by readingId only (lib/ is off-limits), so one row holds every language:
// { ...latest legacy fields, locale, byLocale: { zh: {...}, en: {...} } }. Rows written before this have no
// `byLocale` and were generated in Chinese, so they count as the zh entry.
type Entry = Record<string, unknown>;
type Row = Entry & { locale?: Locale; byLocale?: Partial<Record<Locale, Entry>> };

function parse(raw: string | undefined): Row | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Row; } catch { return null; }
}

/** The cached interpretation for this locale, or undefined (=> generate). */
export function cachedFor(raw: string | undefined, locale: Locale): Entry | undefined {
  const row = parse(raw);
  if (!row) return undefined;
  if (row.byLocale) return row.byLocale[locale];
  return locale === 'zh' ? row : undefined;
}

/** Merge a fresh interpretation into the row; top-level fields mirror the latest one for legacy readers. */
export function mergeFor(raw: string | undefined, locale: Locale, entry: Entry): string {
  const row = parse(raw);
  const byLocale: Partial<Record<Locale, Entry>> = row?.byLocale ? { ...row.byLocale } : row ? { zh: stripMeta(row) } : {};
  byLocale[locale] = entry;
  return JSON.stringify({ ...entry, locale, byLocale });
}

function stripMeta(r: Row): Entry { const { byLocale: _b, locale: _l, ...rest } = r; void _b; void _l; return rest; }

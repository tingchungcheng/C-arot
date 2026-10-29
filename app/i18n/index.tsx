'use client';

/**
 * Lightweight client i18n.
 * - Source language is 中文: the zh UI strings themselves are the dictionary keys,
 *   so `t('开始占卜')` returns the zh text as-is, or the en / ms entry.
 * - `{0}`, `{name}` placeholders are filled from `vars`.
 * - The choice is stored in localStorage ('locale') and mirrored to <html lang>.
 */
import { Fragment, createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { zh } from './zh';
import { en } from './en';
import { ms } from './ms';

export type Locale = 'zh' | 'en' | 'ms';
export const LOCALES: { value: Locale; label: string; short: string; htmlLang: string }[] = [
  { value: 'zh', label: '中文', short: '中', htmlLang: 'zh-CN' },
  { value: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { value: 'ms', label: 'Bahasa Melayu', short: 'BM', htmlLang: 'ms' },
];
const DICTS: Record<Locale, Record<string, string>> = { zh, en, ms };
const KEY = 'locale';

let current: Locale = 'zh';
const listeners = new Set<() => void>();
let hydrated = false;

function readStored(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'ms' || v === 'zh' ? v : 'zh';
  } catch {
    return 'zh';
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!hydrated) {
    hydrated = true;
    const s = readStored();
    if (s !== current) { current = s; queueMicrotask(() => listeners.forEach((l) => l())); }
  }
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) setLocale(readStored()); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage); };
}

export function getLocale(): Locale { return current; }

export function setLocale(l: Locale) {
  if (l === current) return;
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* private mode */ }
  listeners.forEach((fn) => fn());
}

type Vars = Record<string, string | number> | (string | number)[];

/** Translate a zh source string for the current locale. Safe to call anywhere during render. */
export function t(s: string, vars?: Vars): string {
  // keys are the zh text with whitespace collapsed; '@ctx:文本' disambiguates a short key (zh shows 文本)
  const key = s.replace(/\s+/g, ' ').trim();
  const zhText = key.startsWith('@') ? key.slice(key.indexOf(':') + 1) : s;
  const out = (current === 'zh' ? undefined : DICTS[current][key]) ?? zhText;
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (m, k) => {
    const v = (vars as Record<string, string | number>)[k];
    return v === undefined ? m : String(v);
  });
}

/** Locale-aware tarot card name: zh → name_zh; en → name_en; ms → Malay if known, else English. */
/** Headers for API calls so the server can answer in the UI language (body also carries `locale`). */
export function localeHeaders(json = true): Record<string, string> {
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), 'X-Locale': current };
}

export function cardName(c: { name_zh: string; name_en?: string }): string {
  if (current === 'zh' || !c.name_en) return c.name_zh;
  if (current === 'ms') return ms[`card:${c.name_en}`] ?? c.name_en;
  return c.name_en;
}

const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: typeof t }>({ locale: 'zh', setLocale, t });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, () => 'zh' as Locale);
  useEffect(() => {
    document.documentElement.lang = LOCALES.find((x) => x.value === locale)!.htmlLang;
    document.title = t('C-arot | AI 塔罗与星盘');
  }, [locale]);
  // Keyed so the whole UI re-renders in the new language (module-level t() calls included).
  return (
    <Ctx.Provider value={{ locale, setLocale, t }}>
      <Fragment key={locale}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export function useT() { return useContext(Ctx); }

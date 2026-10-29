'use client';

import { LOCALES, useT, type Locale } from '../i18n';

/** full: segmented control (Settings). compact: small select for the nav. */
export default function LanguageSwitcher({ variant = 'compact', className = '' }: { variant?: 'full' | 'compact'; className?: string }) {
  const { locale, setLocale, t } = useT();
  if (variant === 'compact') {
    return (
      <label className={`relative inline-flex items-center ${className}`}>
        <span className="sr-only">{t('语言')}</span>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          data-testid="lang-compact"
          className="appearance-none cursor-pointer rounded-full border border-border bg-bg pl-3 pr-7 py-1.5 text-[13px] font-bold text-text-2 hover:border-primary hover:text-text focus:border-primary focus:outline-none"
        >
          {LOCALES.map((l) => <option key={l.value} value={l.value}>{l.short}</option>)}
        </select>
        <span aria-hidden className="pointer-events-none absolute right-2.5 text-[10px] text-text-3">▾</span>
      </label>
    );
  }
  return (
    <div role="radiogroup" aria-label={t('语言')} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${className}`}>
      {LOCALES.map((l) => {
        const on = l.value === locale;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l.htmlLang}
            onClick={() => setLocale(l.value)}
            data-testid={`lang-${l.value}`}
            className={`rounded-xl border px-4 py-3 text-left transition-colors ${on ? 'border-primary bg-primary-soft text-text' : 'border-border text-text-2 hover:border-primary/60 hover:text-text'}`}
          >
            <span className="block font-bold">{l.label}</span>
            <span className="block text-xs text-text-3">{l.value === 'zh' ? '默认' : l.value.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

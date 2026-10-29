export type Locale = 'zh' | 'en' | 'ms';
export const LOCALES: Locale[] = ['zh', 'en', 'ms'];
export const DEFAULT_LOCALE: Locale = 'zh';

/** Body `locale` wins, then the `x-locale` header; anything else falls back to zh. */
export function resolveLocale(bodyLocale?: unknown, headerLocale?: string | null): Locale {
  for (const v of [bodyLocale, headerLocale]) {
    if (typeof v === 'string') {
      const l = v.trim().toLowerCase().slice(0, 2);
      if ((LOCALES as string[]).includes(l)) return l as Locale;
    }
  }
  return DEFAULT_LOCALE;
}

/** Appended to every system prompt so all user-facing text is written in the chosen language. */
export function languageDirective(locale: Locale): string {
  switch (locale) {
    case 'en':
      return '\n\nOUTPUT LANGUAGE: Write ALL user-facing text in natural, warm English. Use English card names (e.g. "The Moon"), "upright"/"reversed", and "Past/Present/Future". Keep JSON keys and any required headings structure unchanged. Ignore the language of these instructions.';
    case 'ms':
      return '\n\nBAHASA OUTPUT: Tulis SEMUA teks untuk pengguna dalam Bahasa Melayu yang semula jadi dan mesra (gaya Malaysia). Kekalkan nama kad dalam bahasa Inggeris (cth. "The Moon"), guna "tegak"/"terbalik" dan "Masa Lalu/Masa Kini/Masa Depan". Kekalkan kunci JSON dan struktur tajuk yang diperlukan. Abaikan bahasa arahan ini.';
    default:
      return '\n\n输出语言:所有面向用户的内容使用自然的简体中文。';
  }
}

export const LABELS: Record<Locale, {
  positions: [string, string, string];
  upright: string; reversed: string; unknown: string;
  topics: Record<string, string>;
}> = {
  zh: { positions: ['过去', '现在', '未来'], upright: '正位', reversed: '逆位', unknown: '未知',
    topics: { love: '爱情', career: '事业', personal_growth: '个人成长' } },
  en: { positions: ['Past', 'Present', 'Future'], upright: 'Upright', reversed: 'Reversed', unknown: 'Unknown',
    topics: { love: 'Love', career: 'Career', personal_growth: 'Personal growth' } },
  ms: { positions: ['Masa Lalu', 'Masa Kini', 'Masa Depan'], upright: 'Tegak', reversed: 'Terbalik', unknown: 'Tidak diketahui',
    topics: { love: 'Cinta', career: 'Kerjaya', personal_growth: 'Pertumbuhan diri' } },
};

'use client';
import { t as tx } from '../i18n';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import ZodiacGlyph from './ZodiacGlyph';
import { ELEMENT_ZH, formatRangeZh } from './zodiac';
import type { ZodiacSign } from '@/lib/data/types';

/** Live zodiac card under the date wheels. 0.28s cross-fade + glyph scale .9→1 when the sign changes. */
export default function ZodiacReveal({ sign }: { sign: ZodiacSign | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = sign?.id ?? 'none';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, () => {
        gsap.fromTo('.zr-body', { opacity: 0 }, { opacity: 1, duration: 0.28, ease: 'power2.out' });
        gsap.fromTo('.zr-glyph', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' });
      });
    }, el);
    return () => ctx.revert();
  }, [id]);

  return (
    <div ref={ref} className="ob-field rounded-[14px] px-[14px] py-3 flex items-center gap-4 min-h-[96px]" aria-live="polite">
      <div className="zr-glyph w-14 h-14 shrink-0 rounded-full border border-gold text-gold flex items-center justify-center"
        style={{ boxShadow: sign ? 'var(--glow-gold)' : undefined }}>
        {sign ? <ZodiacGlyph sign={sign.id} size={28} /> : <span className="w-2 h-2 rounded-full bg-current opacity-60" />}
      </div>
      <div className="zr-body min-w-0">
        {sign ? (
          <>
            <p className="text-[16px] font-bold text-text">{tx(sign.name_zh)}{tx(sign.name_zh) === sign.name_zh ? ` · ${sign.name_en}` : ''}</p>
            <p className="text-[13px] text-text-ob-2">{formatRangeZh(sign.date_range)} · {ELEMENT_ZH()[sign.element]}</p>
            <p className="text-[13px] text-text mt-0.5">{tx('奇境意象:')}{sign.wonderland_motif}</p>
          </>
        ) : (
          <p className="text-[15px] text-text-ob-2">{tx('选好日期后,这里会显示你的太阳星座。')}</p>
        )}
      </div>
    </div>
  );
}

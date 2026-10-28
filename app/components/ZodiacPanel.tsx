'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import ZodiacGlyph from './ZodiacGlyph';
import { ELEMENT_ZH, formatRangeZh } from './zodiac';
import type { ZodiacSign } from '@/lib/data/types';

const MODALITY_ZH = { cardinal: '本位', fixed: '固定', mutable: '变动' } as const;

/** Desktop zodiac reveal panel (right column of the DOB step). */
export default function ZodiacPanel({ sign }: { sign: ZodiacSign | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, () => {
        gsap.fromTo('.zp-glyph', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' });
        gsap.fromTo('.zp-text', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out' });
      });
    }, el);
    return () => ctx.revert();
  }, [sign?.id]);

  return (
    <div ref={ref} className="flex flex-col h-full" aria-live="polite">
      <p className="overline text-text">Your sign · 星座</p>
      <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
        <div className="zp-glyph w-28 h-28 xl:w-32 xl:h-32 rounded-full border border-gold text-gold flex items-center justify-center relative"
          style={{ boxShadow: sign ? 'var(--glow-gold)' : undefined }}>
          <span className="absolute inset-2 rounded-full border border-dashed border-gold/40" aria-hidden="true" />
          {sign ? <ZodiacGlyph sign={sign.id} size={56} strokeWidth={1.5} /> : <span className="num italic text-[28px] text-text-ob-2">?</span>}
        </div>
        {sign ? (
          <>
            <h2 className="zp-text text-[28px] text-text mt-6">{sign.name_zh}</h2>
            <p className="zp-text font-display italic text-[17px] text-text-ob-2">{sign.name_en}</p>
            <p className="zp-text text-[15px] text-text-ob-2 mt-3">{formatRangeZh(sign.date_range)} · {ELEMENT_ZH[sign.element]} · {MODALITY_ZH[sign.modality]}</p>
            <hr className="zp-text w-full border-ob-border my-6" />
            <p className="zp-text text-[15px] text-text">奇境意象</p>
            <p className="zp-text font-display italic text-[16px] text-text-ob-2 mt-1 max-w-[36ch]">{sign.wonderland_motif}</p>
          </>
        ) : (
          <p className="text-[15px] text-text-ob-2 mt-6 max-w-[28ch]">滚动左侧的日期,你的太阳星座会在这里实时显示。</p>
        )}
      </div>
      <p className="text-[13px] text-text-ob-2 text-center">滚动日期时实时更新</p>
    </div>
  );
}

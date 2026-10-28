'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { LOADER_SVG } from './loader-svg';

/** Pocket-watch loader (design handoff illustration). GSAP drives the hands; reduced motion shows a static watch + progress text. */
export default function LoadingWatch({ message = '探索中...' }: { message?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, () => {
        const origin = { svgOrigin: '120 130' };
        gsap.to('#hand-minute', { rotation: 360, duration: 2, ease: 'none', repeat: -1, ...origin });
        gsap.to('#hand-hour', { rotation: 360, duration: 24, ease: 'none', repeat: -1, ...origin });
        gsap.to('#watch-glow', { opacity: 0.05, scale: 1.08, duration: 1, ease: 'sine.inOut', repeat: -1, yoyo: true, ...origin });
        gsap.fromTo('#loader-rabbit', { y: 6 }, { y: -2, duration: 1, ease: 'sine.inOut', repeat: -1, yoyo: true });
        gsap.from('.loader-text', { opacity: 0, y: 16, duration: 0.5, stagger: 0.06, ease: 'power3.out' });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center gap-6 text-center" role="status" aria-live="polite">
      <div className="w-40 h-40 md:w-48 md:h-48 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: LOADER_SVG }} />
      <div>
        <p className="loader-text text-text text-[19px] font-[family-name:var(--font-display-zh)] font-medium">{message}</p>
        <p className="loader-text overline text-primary mt-2">Following the white rabbit</p>
      </div>
    </div>
  );
}

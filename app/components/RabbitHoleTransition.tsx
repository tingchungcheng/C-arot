'use client';
import { t as tx } from '../i18n';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { hasCompleteProfile } from './profile-store';

/*
 * Full-screen "falling down the rabbit hole" transition for the 进入兔子洞 / 开始占卜 CTAs.
 * Any element with data-rabbit-hole="<href>" (or an <a data-rabbit-hole> using its href) triggers it.
 * Lives in the root layout so it survives the route change: the overlay stays opaque while the
 * router pushes, then fades out once the new pathname has mounted.
 * The video plays on every CTA press; reduced motion, Save-Data or a 2G connection get a quick fade instead. Load/play failure navigates immediately.
 */
const LEAD = 0.4; // push this long before the video ends
export const CARDS_EVENT = 'rabbithole:cards'; // detail: 'hide' | 'show' (landing HeroShuffle listens)

type Phase = 'idle' | 'in' | 'playing' | 'leaving' | 'out';
const cards = (d: 'hide' | 'show') => window.dispatchEvent(new CustomEvent(CARDS_EVENT, { detail: d }));

function wantsQuick() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!(c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ''));
}

export default function RabbitHoleTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<'video' | 'quick'>('quick');
  const overlay = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const skipBtn = useRef<HTMLButtonElement>(null);
  const run = useRef<{ href: string; from: string; pushed: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const preloaded = useRef(false);

  const preload = useCallback(() => {
    const v = video.current;
    if (!v || preloaded.current || wantsQuick()) return;
    preloaded.current = true; v.preload = 'auto'; v.load();
  }, []);

  // fade the overlay away and release everything (also the hard reset used by back/forward)
  const finish = useCallback((instant = false) => {
    const r = run.current; if (r?.timer) clearTimeout(r.timer);
    run.current = null;
    const el = overlay.current;
    const done = () => {
      setPhase('idle');
      document.documentElement.style.overflow = ''; document.body.style.overflow = '';
      video.current?.pause();
      cards('show');
    };
    if (!el || instant) { if (el) gsap.set(el, { opacity: 0 }); done(); return; }
    setPhase('out');
    gsap.to(el, { opacity: 0, duration: mode === 'video' ? 0.6 : 0.3, ease: 'power2.out', onComplete: done });
  }, [mode]);

  // overlay stays opaque; navigate, then finish() once the new route is mounted (or after a 2s cap)
  const go = useCallback(() => {
    const r = run.current; if (!r || r.pushed) return;
    r.pushed = true; setPhase('leaving');
    if (r.href === r.from) { finish(); return; }
    router.push(r.href);
    r.timer = setTimeout(() => finish(), 2000);
  }, [router, finish]);

  // new pathname mounted → fade out
  useEffect(() => {
    const r = run.current;
    if (r?.pushed && pathname !== r.from) requestAnimationFrame(() => requestAnimationFrame(() => finish()));
  }, [pathname, finish]);

  const start = useCallback((target: string) => {
    if (run.current) return;
    // returning users with a complete profile skip onboarding (edit via /settings or /onboarding?edit=1)
    const href = target === '/onboarding' && hasCompleteProfile() ? '/tarot' : target;
    router.prefetch(href);
    const quick = wantsQuick() || !video.current;
    run.current = { href, from: window.location.pathname, pushed: false };
    setMode(quick ? 'quick' : 'video');
    setPhase('in');
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
    cards('hide');
    const el = overlay.current!;
    if (quick) { gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.in', onComplete: go }); return; }
    const v = video.current!;
    v.currentTime = 0;
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    setPhase('playing');
    v.play().then(() => skipBtn.current?.focus()).catch(() => go()); // can't play → navigate now
  }, [router, go]);

  // delegated CTA handling: click (capture, so Next <Link> sees defaultPrevented), preload on hover/pointerdown/focus
  useEffect(() => {
    const target = (e: Event) => (e.target as Element | null)?.closest?.('[data-rabbit-hole]') as HTMLElement | null;
    const onClick = (e: MouseEvent) => {
      const t = target(e); if (!t) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let new-tab clicks through
      const href = t.dataset.rabbitHole || t.getAttribute('href'); if (!href) return;
      e.preventDefault(); e.stopPropagation();
      start(href);
    };
    const onWarm = (e: Event) => { if (target(e)) preload(); };
    document.addEventListener('click', onClick, true);
    ['pointerover', 'pointerdown', 'focusin'].forEach((t) => document.addEventListener(t, onWarm, true));
    return () => {
      document.removeEventListener('click', onClick, true);
      ['pointerover', 'pointerdown', 'focusin'].forEach((t) => document.removeEventListener(t, onWarm, true));
    };
  }, [start, preload]);

  // Esc skips; back/forward tears the overlay down at once
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && run.current) { e.preventDefault(); video.current?.pause(); go(); } };
    const onPop = () => { if (run.current || phase !== 'idle') finish(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    window.addEventListener('pageshow', onPop);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('popstate', onPop); window.removeEventListener('pageshow', onPop); };
  }, [go, finish, phase]);

  const onTime = () => {
    const v = video.current; if (!v || !v.duration) return;
    if (v.currentTime >= v.duration - LEAD) go();
  };

  const active = phase !== 'idle';
  return (
    <div
      ref={overlay}
      role={active ? 'dialog' : undefined}
      aria-modal={active ? true : undefined}
      aria-label={active ? tx('正在进入兔子洞') : undefined}
      aria-hidden={!active}
      data-phase={phase}
      className={`rabbit-hole fixed inset-0 z-[100] bg-[#0B0A09] ${active ? '' : 'pointer-events-none invisible'}`}
      style={{ opacity: 0 }}
    >
      <video
        ref={video}
        className={`absolute inset-0 w-full h-full object-cover object-center ${mode === 'video' ? '' : 'hidden'}`}
        muted playsInline preload="none" disablePictureInPicture
        poster="/video/rabbit-hole-poster.jpg"
        onTimeUpdate={onTime} onEnded={go} onError={() => { if (run.current) go(); }}
      >
        <source src="/video/rabbit-hole.webm" type="video/webm" />
        <source src="/video/rabbit-hole.mp4" type="video/mp4" />
      </video>
      {active && mode === 'video' && (
        <button ref={skipBtn} type="button" onClick={() => { video.current?.pause(); go(); }}
          className="btn btn-secondary absolute right-5 bottom-[max(20px,env(safe-area-inset-bottom))] md:right-10 md:bottom-10 min-h-[44px]">
          {tx('跳过')}
        </button>
      )}
    </div>
  );
}

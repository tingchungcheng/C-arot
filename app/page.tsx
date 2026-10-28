'use client';

import { useLayoutEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import Icon, { type IconName } from './components/Icon';
import { HERO_SVG } from './components/hero-svg';
import HeroShuffle from './components/HeroShuffle';

const index: { href: string; title: string; desc: string; icon: IconName }[] = [
  { href: '/tarot', title: '塔罗占卜', desc: '三张牌,看清当下', icon: 'tarot_cards' },
  { href: '/birth-chart', title: '出生星盘', desc: '行星在出生时的位置', icon: 'chart_wheel' },
  { href: '/combined', title: '综合解读', desc: '牌面与星盘的对话', icon: 'crystal_ball' },
];

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // the resting state is always visible: wipe any inline styles left from an earlier visit
    // (a kept-alive route or an interrupted intro), animate with from(), and force-show after 2.5s
    gsap.set(['.hero-content', '.hero-art', '.reveal'], { clearProps: 'opacity,visibility,transform' });
    const safety = setTimeout(() => gsap.set(['.hero-content', '.hero-art', '.reveal'], { opacity: 1, y: 0, visibility: 'visible' }), 2500);
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ reduce: '(prefers-reduced-motion: reduce)', ok: '(prefers-reduced-motion: no-preference)' }, (c) => {
        if (c.conditions?.reduce) { gsap.set('.reveal', { opacity: 1, y: 0 }); return; }
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.from('.hero-art', { opacity: 0, duration: 1.2 }) // opacity only: the card layout measures this box
          .from('.reveal', { opacity: 0, y: 16, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, 0.2);
        gsap.fromTo('#hero-img', { y: -4 }, { y: 4, duration: 2.5, ease: 'sine.inOut', repeat: -1, yoyo: true }); // ±4px over a 5s cycle
        const px = gsap.quickTo('.hero-img-px', 'x', { duration: 0.6, ease: 'power3.out' });
        const py = gsap.quickTo('.hero-img-px', 'y', { duration: 0.6, ease: 'power3.out' });
        const onMove = (e: PointerEvent) => {
          if (e.pointerType === 'touch') return;
          px(((e.clientX / window.innerWidth) * 2 - 1) * 8); py(((e.clientY / window.innerHeight) * 2 - 1) * 8);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
        gsap.to('#hero-rings', { rotation: 360, svgOrigin: '300 300', duration: 60, ease: 'none', repeat: -1 });
      });
    }, rootRef);
    return () => { clearTimeout(safety); ctx.revert(); };
  }, []);

  return (
    <div ref={rootRef} className="relative bg-bg pt-16 md:pt-20 overflow-hidden">
      <div className="hero-content mx-auto max-w-[1312px] px-5 md:px-10 xl:px-16 pb-12 md:py-12 xl:py-10 md:grid md:grid-cols-12 md:gap-6 md:items-center md:content-center xl:min-h-[calc(100svh-80px)]">
        <div className="relative hero-art md:col-span-12 xl:col-span-5 md:order-1 xl:order-2 mb-44 xl:mb-0 xl:aspect-square">
          {/* Stage = the hero image's box; rings, back cards, image and front cards are positioned against it. */}
          <div className="hero-stage relative left-1/2 -translate-x-1/2 w-[90vw] aspect-[1521/1309] xl:absolute xl:top-1/2 xl:-translate-y-1/2 xl:translate-x-0 xl:left-auto xl:right-[calc(-1*clamp(20px,calc(50vw-620px),96px))] xl:w-[min(49vw,720px,calc((100vh-120px)*1.16))]">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] aspect-square z-0 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: HERO_SVG }} />
            <HeroShuffle layer="back" />
            <div className="hero-img-px absolute inset-0 z-[1]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="hero-img" src="/illustrations/hero-rabbit.webp" alt="" width={1521} height={1309} draggable={false} className="block w-full h-auto select-none" />
            </div>
            <HeroShuffle layer="front" />
          </div>
        </div>

        <div className="hero-text md:col-span-12 xl:col-span-7 xl:max-w-[540px] md:order-2 xl:order-1 relative z-10">
          <p className="reveal overline text-primary">Down the rabbit hole · 奇境</p>
          <h1 className="reveal wordmark text-[length:var(--fs-display)] text-text mt-3">
            C<span className="text-primary">-</span>arot
          </h1>
          <p className="reveal text-[length:var(--fs-h1)] leading-[var(--lh-h1)] font-[family-name:var(--font-display-zh)] font-bold tracking-[0.04em] text-text mt-3">奇境塔罗与星盘</p>
          <p className="reveal text-text-2 mt-4 max-w-[30em] text-[16px] leading-[1.7]">跟随白兔,踏入时光兔洞。<br />探索塔罗与星盘的神秘奇境<span className="hidden md:inline">——三张牌与你的出生星盘,为当下提供一面镜子</span>。</p>

          <div className="reveal mt-8 flex flex-col sm:flex-row gap-3">
            <button type="button" data-rabbit-hole="/onboarding" className="btn btn-primary w-full sm:w-auto">
              进入兔子洞 <Icon name="arrow_right" size={20} />
            </button>
            <Link href="/profile" className="btn btn-secondary w-full sm:w-auto md:hidden">
              <Icon name="user" size={20} /> 先建立我的资料
            </Link>
            <Link href="/birth-chart" className="btn btn-secondary hidden md:inline-flex">
              <Icon name="chart_wheel" size={20} /> 查看我的星盘
            </Link>
          </div>

          <section className="mt-12" aria-labelledby="index-title">
            <p id="index-title" className="reveal md:hidden overline text-primary mb-3">Index · 目录</p>
            <ul className="border-t border-border md:border-0 md:grid md:grid-cols-3 md:gap-4">
              {index.map((it, i) => (
                <li key={it.href} className="reveal border-b border-border md:border-0">
                  <Link href={it.href} className="group flex items-center gap-4 py-4 min-h-[76px]">
                    <span className="num italic text-gold text-[22px] w-8 md:hidden">{String(i + 1).padStart(2, '0')}</span>
                    <span className="w-12 h-12 rounded-[12px] bg-primary-soft text-primary flex items-center justify-center">
                      <Icon name={it.icon} size={24} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-[family-name:var(--font-display-zh)] font-bold text-[19px] text-text group-hover:text-primary transition-colors">{it.title}</span>
                      <span className="block text-[15px] md:text-[13px] text-text-2">{it.desc}</span>
                    </span>
                    <Icon name="arrow_right" size={20} className="md:hidden text-text-2 group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="reveal mt-8 flex gap-3 items-start bg-surface-1 border border-border rounded-[var(--r-card)] p-4 text-[15px] leading-[1.6] text-text-3">
            <Icon name="info" size={20} className="text-gold mt-0.5" />
            塔罗与星盘是探索与反思的工具,非预测或专业建议。
          </p>
        </div>
      </div>
    </div>
  );
}

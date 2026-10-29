'use client';
import { t as tx } from '../i18n';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import CarrotWordmark from './CarrotWordmark';
import { usePathname, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import Icon, { type IconName } from './Icon';
import LanguageSwitcher from './LanguageSwitcher';

const navItems = (): { href: string; label: string; en: string; icon: IconName }[] => ([
  { href: '/tarot', label: tx('塔罗占卜'), en: 'Tarot', icon: 'tarot_cards' },
  { href: '/birth-chart', label: tx('出生星盘'), en: 'Natal chart', icon: 'chart_wheel' },
  { href: '/combined', label: tx('综合解读'), en: 'Combined', icon: 'crystal_ball' },
  { href: '/about', label: tx('关于'), en: 'About', icon: 'info' },
  { href: '/settings', label: tx('设置'), en: 'Settings', icon: 'settings' },
]);

const tarotTopics = (): { topic: string; label: string; desc: string; icon: IconName; tone: string }[] => ([
  { topic: 'love', label: tx('爱情'), desc: tx('感情关系与心灵连接'), icon: 'love', tone: 'text-primary' },
  { topic: 'career', label: tx('事业'), desc: tx('职业发展与工作机会'), icon: 'career', tone: 'text-gold' },
  { topic: 'personal_growth', label: tx('个人成长'), desc: tx('自我探索与内在成长'), icon: 'growth', tone: 'text-green' },
]);

/** Desktop "塔罗占卜" link with a hover/focus dropdown of topics (ArrowDown opens, Escape closes). */
function TarotNavItem({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true); };
  const hide = () => { closeTimer.current = setTimeout(() => setOpen(false), 120); };
  const focusItem = (i: number) => wrap.current?.querySelectorAll<HTMLAnchorElement>('[data-dd-item]')[i]?.focus();
  return (
    <div ref={wrap} className="relative flex items-stretch" onMouseEnter={show} onMouseLeave={hide}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={(e) => {
        const items = Array.from(wrap.current?.querySelectorAll<HTMLAnchorElement>('[data-dd-item]') ?? []);
        const idx = items.indexOf(document.activeElement as HTMLAnchorElement);
        if (e.key === 'Escape') { setOpen(false); (wrap.current?.querySelector('a') as HTMLElement)?.focus(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); requestAnimationFrame(() => focusItem(Math.min(idx + 1, items.length - 1))); }
        else if (e.key === 'ArrowUp' && idx >= 0) { e.preventDefault(); if (idx === 0) (wrap.current?.querySelector('a') as HTMLElement)?.focus(); else focusItem(idx - 1); }
      }}>
      <Link href="/tarot" aria-current={active ? 'page' : undefined} aria-haspopup="true" aria-expanded={open}
        className={`relative px-2 xl:px-4 inline-flex items-center gap-2 text-[14px] xl:text-[15px] transition-colors after:absolute after:left-2 after:right-2 xl:after:left-4 xl:after:right-4 after:bottom-0 after:h-0.5 after:bg-primary after:transition-opacity ${active ? 'text-primary font-medium after:opacity-100' : 'text-text-2 hover:text-text after:opacity-0'}`}>
        <Icon name="tarot_cards" size={18} />{tx('塔罗占卜')}
      </Link>
      <div role="menu" aria-label={tx('塔罗主题')}
        className={`absolute left-0 top-full w-[400px] bg-surface-1 border border-border rounded-[var(--r-card)] shadow-[var(--shadow-1)] p-3 transition-[opacity,transform] duration-150 motion-reduce:transition-none ${open ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-1 invisible pointer-events-none'}`}>
        <p className="overline text-primary px-3 pt-1 pb-2">{tx('Tarot · 塔罗占卜')}</p>
        {tarotTopics().map((t) => (
          <Link key={t.topic} href={`/tarot?topic=${t.topic}`} role="menuitem" data-dd-item
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab clicks through
              e.preventDefault();
              setOpen(false);
              // fresh nonce so picking the current topic again still advances to step 2/2
              router.push(`/tarot?topic=${t.topic}&go=${Date.now().toString(36)}`);
            }}
            className="group flex items-center gap-4 rounded-[12px] px-3 py-3 hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none">
            <Icon name={t.icon} size={22} className={t.tone} />
            <span className="flex-1">
              <span className="block text-[15px] font-bold text-text">{t.label}</span>
              <span className="block text-[13px] text-text-2">{t.desc}</span>
            </span>
            <Icon name="arrow_right" size={18} className="text-text-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return <CarrotWordmark className={`text-text ${className}`} />;
}

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // #site-menu is only in the DOM while open (kept mounted through the exit fade)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { if (isOpen) setMounted(true); }, [isOpen]);

  // close on route change
  useEffect(() => { setIsOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    const el = overlayRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ reduce: '(prefers-reduced-motion: reduce)', ok: '(prefers-reduced-motion: no-preference)' }, (c) => {
        const reduce = c.conditions?.reduce;
        if (isOpen) {
          gsap.set(el, { visibility: 'visible' });
          if (reduce) { gsap.set(el, { opacity: 1 }); gsap.set('.nav-item', { opacity: 1, y: 0 }); return; }
          gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'expo.out' });
          gsap.fromTo('.nav-item', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'expo.out', delay: 0.05 });
        } else {
          if (reduce) { gsap.set(el, { opacity: 0, visibility: 'hidden' }); setMounted(false); return; }
          gsap.to(el, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => { gsap.set(el, { visibility: 'hidden' }); setMounted(false); } });
        }
      });
    }, el);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); ctx.revert(); if (!isOpen) gsap.set(el, { visibility: 'hidden', opacity: 0 }); };
  }, [isOpen, mounted]);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 h-16 md:h-20 bg-bg border-b border-border">
        <div className="mx-auto h-full max-w-[1312px] px-5 md:px-10 xl:px-16 flex items-center justify-between">
          <Link href="/" className="text-[28px] leading-none" aria-label="C-arot">
            <Wordmark />
          </Link>
          <nav aria-label={tx('主导航')} className="hidden md:flex items-stretch h-full gap-1 xl:gap-2">
            {navItems().map((item) => {
              const active = pathname?.startsWith(item.href);
              if (item.href === '/tarot') return <TarotNavItem key={item.href} active={!!active} />;
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                  className={`relative px-2 xl:px-4 inline-flex items-center gap-2 text-[14px] xl:text-[15px] transition-colors after:absolute after:left-2 after:right-2 xl:after:left-4 xl:after:right-4 after:bottom-0 after:h-0.5 after:bg-primary after:transition-opacity ${active ? 'text-primary font-medium after:opacity-100' : 'text-text-2 hover:text-text after:opacity-0'}`}>
                  <Icon name={item.icon} size={18} />{item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
          <LanguageSwitcher />
          <Link href="/tarot" data-rabbit-hole="/tarot" className="hidden md:inline-flex btn btn-primary min-h-[44px] xl:min-h-[48px] px-3 xl:px-5 text-[15px]" aria-label={tx('开始占卜')}>
            <Icon name="sparkle" size={20} /><span className="hidden xl:inline">{tx('开始占卜')}</span>
          </Link>
          <button
            ref={btnRef}
            type="button"
            onClick={() => setIsOpen((o) => !o)}
            className={`icon-btn w-11 h-11 md:hidden ${isOpen ? 'border-primary text-primary' : ''}`}
            aria-label={isOpen ? tx('关闭菜单') : tx('打开菜单')}
            aria-expanded={isOpen}
            aria-controls="site-menu"
          >
            <Icon name={isOpen ? 'close' : 'menu'} size={24} />
          </button>
          </div>
        </div>
      </header>

      {mounted && (<div
        id="site-menu"
        ref={overlayRef}
        role="dialog"
        aria-modal="true"
        aria-label={tx('网站目录')}
        className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-bg checkerboard flex flex-col overflow-y-auto"
        style={{ visibility: 'hidden', opacity: 0 }}
      >
        <nav className="mx-auto w-full max-w-[1200px] px-5 md:px-16 pt-8 flex-1">
          <p className="overline text-primary mb-4">{tx('Contents · 目录')}</p>
          <ul>
            {navItems().map((item, i) => {
              const active = pathname?.startsWith(item.href);
              return (
                <li key={item.href} className="nav-item border-b border-border">
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center gap-5 py-5 min-h-[88px] ${active ? 'text-primary' : 'text-text hover:text-primary'} transition-colors`}
                  >
                    <span className="num italic text-gold text-[22px] w-8">{String(i + 1).padStart(2, '0')}</span>
                    <Icon name={item.icon} size={24} className={active ? 'text-primary' : 'text-text-2 group-hover:text-primary'} />
                    <span className="flex-1">
                      <span className="block font-[family-name:var(--font-display-zh)] font-bold text-[28px] leading-tight">{item.label}</span>
                      <span className="block font-display italic text-[15px] text-text-2">{item.en}</span>
                    </span>
                    <Icon name="arrow_right" size={24} className={`${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mx-auto w-full max-w-[1200px] px-5 md:px-16 py-8 flex items-center gap-4">
          <Icon name="pocket_watch" size={48} className="text-primary" />
          <div>
            <p className="text-text font-bold text-[16px]">{tx('跟随白兔的脚步')}</p>
            <p className="text-text-2 text-[15px]">{tx('时光兔洞 · v1.0')}</p>
          </div>
        </div>
      </div>)}
    </>
  );
}

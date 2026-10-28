'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';

const navItems = [
  { href: '/tarot', label: '塔罗占卜', icon: '🃏' },
  { href: '/birth-chart', label: '星盘', icon: '✨' },
  { href: '/profile', label: '我的资料', icon: '🐰' },
  { href: '/combined', label: '综合解读', icon: '🔮' },
  { href: '/about', label: '关于', icon: '🕐' }
];

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      gsap.to('.nav-overlay', {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to('.nav-menu', {
        x: 0,
        duration: 0.4,
        ease: 'power3.out'
      });
      gsap.from('.nav-item', {
        x: -30,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
        delay: 0.2
      });
    } else {
      gsap.to('.nav-menu', {
        x: '-100%',
        duration: 0.3,
        ease: 'power3.in'
      });
      gsap.to('.nav-overlay', {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in'
      });
    }
  }, [isOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-[#ff6b35]/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="text-2xl transition-transform group-hover:scale-110">🥕</div>
            <h1 className="text-xl font-bold text-[#ff6b35]">C-arot</h1>
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-10 h-10 flex flex-col items-center justify-center space-y-1.5 group"
            aria-label="Menu"
          >
            <span className={`block w-6 h-0.5 bg-[#f5e6d3] transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#ff6b35] transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-[#f5e6d3] transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={`nav-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-40 opacity-0 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Slide-out menu */}
      <nav className="nav-menu fixed top-0 left-0 h-full w-80 bg-[#1a1a1a] z-50 -translate-x-full shadow-2xl border-r border-[#ff6b35]/30">
        <div className="p-6 border-b border-[#ff6b35]/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-[#ff6b35]/10 rounded-full flex items-center justify-center text-2xl border-2 border-[#ff6b35]/30">
              🐰
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#ff6b35]">奇境之门</h2>
              <p className="text-xs text-[#f5e6d3]/60">进入兔子洞</p>
            </div>
          </div>
        </div>

        <ul className="py-4">
          {navItems.map((item, index) => (
            <li key={item.href} className="nav-item">
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-4 px-6 py-4 text-[#f5e6d3] hover:bg-[#ff6b35]/10 hover:text-[#ff6b35] transition-all duration-200 border-l-4 border-transparent hover:border-[#ff6b35]"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#ff6b35]/20">
          <div className="text-center">
            <div className="inline-block px-4 py-2 bg-[#ff6b35]/10 rounded-lg border border-[#ff6b35]/30">
              <p className="text-xs text-[#f5e6d3]/60">🕐 时光兔洞</p>
              <p className="text-sm text-[#ff6b35] font-semibold">跟随白兔的脚步</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

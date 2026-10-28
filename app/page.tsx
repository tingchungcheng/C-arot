'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';

export default function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const rabbitHoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.3
      });

      gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power2.out',
        delay: 0.6
      });

      gsap.from('.hero-cta', {
        opacity: 0,
        scale: 0.8,
        duration: 0.8,
        ease: 'back.out(1.7)',
        delay: 1
      });

      gsap.to('.floating-card', {
        y: -20,
        rotation: 5,
        duration: 2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });

      gsap.to('.rabbit-icon', {
        y: -10,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });

      gsap.to('.pocket-watch', {
        rotation: 360,
        duration: 60,
        ease: 'none',
        repeat: -1
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleEnter = () => {
    if (!rabbitHoleRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => router.push('/onboarding')
    });

    tl.to(rabbitHoleRef.current, {
      scale: 100,
      opacity: 1,
      duration: 1.5,
      ease: 'power2.in'
    });

    tl.to('.hero-content', {
      opacity: 0,
      scale: 0.8,
      duration: 0.8,
      ease: 'power2.in'
    }, 0);
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Rabbit hole portal */}
      <div
        ref={rabbitHoleRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full opacity-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, #ff6b35 0%, #0a0a0a 70%)'
        }}
      />

      {/* Checkerboard pattern overlay */}
      <div className="absolute inset-0 checkerboard opacity-20" />

      {/* Floating decorative elements */}
      <div className="absolute top-20 left-10 floating-card text-6xl opacity-20">🃏</div>
      <div className="absolute top-40 right-20 floating-card text-5xl opacity-20 delay-100">🎴</div>
      <div className="absolute bottom-20 left-20 floating-card text-5xl opacity-20 delay-200">🥕</div>
      <div className="absolute bottom-40 right-10 rabbit-icon text-6xl opacity-30">🐰</div>

      {/* Main content */}
      <div className="hero-content relative z-10 container mx-auto px-4 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center max-w-3xl">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="text-8xl mb-4">🥕</div>
              <div className="pocket-watch absolute -top-4 -right-4 text-3xl">🕐</div>
            </div>
          </div>

          {/* Title */}
          <h1 className="hero-title text-6xl md:text-7xl font-bold mb-6 text-[#f5e6d3]">
            <span className="block mb-2">C-arot</span>
            <span className="block text-4xl md:text-5xl text-[#ff6b35]">奇境塔罗与星盘</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle text-xl md:text-2xl text-[#f5e6d3]/80 mb-12 leading-relaxed">
            跟随白兔,踏入时光兔洞<br/>
            探索塔罗与星盘的神秘奇境
          </p>

          {/* CTA Button */}
          <button
            onClick={handleEnter}
            className="hero-cta group relative px-12 py-6 bg-[#ff6b35] text-[#0a0a0a] text-xl font-bold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,107,53,0.6)] hover:scale-105"
          >
            <span className="relative z-10 flex items-center space-x-3">
              <span>🐰</span>
              <span>进入兔子洞</span>
              <span className="group-hover:translate-x-2 transition-transform">→</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b35] via-[#ff8555] to-[#ff6b35] bg-[length:200%_100%] group-hover:animate-pulse" />
          </button>

          {/* Disclaimer */}
          <p className="mt-12 text-sm text-[#f5e6d3]/50">
            🃏 塔罗与星盘是探索与反思的工具,非预测或专业建议 ✨
          </p>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#1a1a1a]/50 to-transparent pointer-events-none" />
    </div>
  );
}

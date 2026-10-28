'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function LoadingWatch({ message = '探索中...' }: { message?: string }) {
  const watchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!watchRef.current) return;

    const ctx = gsap.context(() => {
      gsap.to('.watch-hand-hour', {
        rotation: 360,
        duration: 4,
        ease: 'none',
        repeat: -1,
        transformOrigin: 'center bottom'
      });

      gsap.to('.watch-hand-minute', {
        rotation: 360,
        duration: 2,
        ease: 'none',
        repeat: -1,
        transformOrigin: 'center bottom'
      });

      gsap.to('.watch-glow', {
        scale: 1.2,
        opacity: 0.3,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      });
    }, watchRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-6" ref={watchRef}>
      <div className="relative w-32 h-32">
        {/* Glow effect */}
        <div className="watch-glow absolute inset-0 rounded-full bg-[#ff6b35] opacity-20 blur-xl" />

        {/* Pocket watch */}
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="watchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#ff8555" />
            </linearGradient>
          </defs>

          {/* Chain */}
          <line x1="50" y1="5" x2="50" y2="20" stroke="#f5e6d3" strokeWidth="1" opacity="0.6" />

          {/* Outer circle */}
          <circle cx="50" cy="50" r="35" fill="#1a1a1a" stroke="url(#watchGradient)" strokeWidth="3" />

          {/* Inner circle */}
          <circle cx="50" cy="50" r="30" fill="#0a0a0a" stroke="#ff6b35" strokeWidth="1" opacity="0.5" />

          {/* Hour markers */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
            const rad = (angle - 90) * (Math.PI / 180);
            const x1 = 50 + 25 * Math.cos(rad);
            const y1 = 50 + 25 * Math.sin(rad);
            const x2 = 50 + 28 * Math.cos(rad);
            const y2 = 50 + 28 * Math.sin(rad);
            return (
              <line
                key={angle}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ff6b35"
                strokeWidth="1.5"
                opacity="0.6"
              />
            );
          })}

          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="#ff6b35" />

          {/* Hour hand */}
          <line
            className="watch-hand-hour"
            x1="50"
            y1="50"
            x2="50"
            y2="35"
            stroke="#ff6b35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Minute hand */}
          <line
            className="watch-hand-minute"
            x1="50"
            y1="50"
            x2="50"
            y2="28"
            stroke="#f5e6d3"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p className="text-[#f5e6d3] text-lg animate-pulse">{message}</p>
      <p className="text-[#ff6b35] text-sm">🐰 跟随白兔的脚步...</p>
    </div>
  );
}

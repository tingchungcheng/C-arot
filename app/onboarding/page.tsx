'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="text-[#f5e6d3]/60 py-4 text-center">加载地图...</div>
  )
});

interface LocationData {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface BirthData {
  nickname: string;
  date: string;
  time: string;
  timeUnknown: boolean;
  place: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [birthData, setBirthData] = useState<BirthData>({
    nickname: '',
    date: '',
    time: '',
    timeUnknown: false,
    place: ''
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.step-card', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'power2.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, [step]);

  const handleNext = () => {
    if (step < 4) {
      gsap.to('.step-card', {
        x: -50,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          setStep(step + 1);
          gsap.fromTo('.step-card', { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3 });
        }
      });
    }
  };

  const handleComplete = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('birthData', JSON.stringify(birthData));
    }
    router.push('/tarot');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return birthData.nickname.trim() !== '';
      case 2: return birthData.date !== '';
      case 3: return birthData.timeUnknown || birthData.time !== '';
      case 4: return birthData.place.trim() !== '';
      default: return false;
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  s === step
                    ? 'bg-[#ff6b35] text-[#0a0a0a] scale-110 shadow-[0_0_20px_rgba(255,107,53,0.6)]'
                    : s < step
                    ? 'bg-[#4a5f4f] text-[#f5e6d3]'
                    : 'bg-[#1a1a1a] text-[#f5e6d3]/40 border-2 border-[#f5e6d3]/20'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
          <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ff6b35] transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Step card */}
        <div className="step-card bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-[#ff6b35]/20">
          {/* Step 1: Nickname */}
          {step === 1 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🐰</div>
                <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">你的名字?</h2>
                <p className="text-[#f5e6d3]/60">让我们认识你</p>
              </div>
              <input
                type="text"
                value={birthData.nickname}
                onChange={(e) => setBirthData({ ...birthData, nickname: e.target.value })}
                placeholder="昵称或名字"
                className="w-full px-6 py-4 bg-[#0a0a0a] text-[#f5e6d3] text-lg rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Birth date */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🕐</div>
                <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">出生日期</h2>
                <p className="text-[#f5e6d3]/60">时光兔洞的起点</p>
              </div>
              <input
                type="date"
                value={birthData.date}
                onChange={(e) => setBirthData({ ...birthData, date: e.target.value })}
                className="w-full px-6 py-4 bg-[#0a0a0a] text-[#f5e6d3] text-lg rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          )}

          {/* Step 3: Birth time */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">⏰</div>
                <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">出生时间</h2>
                <p className="text-[#f5e6d3]/60">精确的时刻让星盘更准确</p>
              </div>
              <input
                type="time"
                value={birthData.time}
                onChange={(e) => setBirthData({ ...birthData, time: e.target.value })}
                disabled={birthData.timeUnknown}
                className="w-full px-6 py-4 bg-[#0a0a0a] text-[#f5e6d3] text-lg rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none transition-colors disabled:opacity-40"
                autoFocus={!birthData.timeUnknown}
              />
              <label className="flex items-center mt-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={birthData.timeUnknown}
                  onChange={(e) => setBirthData({ ...birthData, timeUnknown: e.target.checked, time: '' })}
                  className="w-5 h-5 mr-3 accent-[#ff6b35]"
                />
                <span className="text-[#f5e6d3]/80">不知道出生时间</span>
              </label>
            </div>
          )}

          {/* Step 4: Birth place */}
          {step === 4 && (
            <div>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">🌍</div>
                <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">出生地点</h2>
                <p className="text-[#f5e6d3]/60">奇境入口的坐标</p>
              </div>
              <LocationPicker
                value={birthData.place ? {
                  place: birthData.place,
                  latitude: birthData.latitude || 3.139,
                  longitude: birthData.longitude || 101.687,
                  timezone: birthData.timezone || 'Asia/Kuala_Lumpur'
                } : null}
                onChange={(location: LocationData) => {
                  setBirthData({
                    ...birthData,
                    place: location.place,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    timezone: location.timezone
                  });
                }}
              />
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex space-x-4 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 px-6 py-4 bg-[#1a1a1a] text-[#f5e6d3] rounded-xl border-2 border-[#f5e6d3]/20 hover:border-[#f5e6d3]/40 transition-all"
              >
                ← 上一步
              </button>
            )}
            <button
              onClick={step === 4 ? handleComplete : handleNext}
              disabled={!canProceed()}
              className="flex-1 px-6 py-4 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {step === 4 ? '完成 ✓' : '下一步 →'}
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="mt-8 text-center text-[#f5e6d3]/40 text-sm">
          <p>🥕 你的资料将安全保存在本地</p>
        </div>
      </div>
    </div>
  );
}

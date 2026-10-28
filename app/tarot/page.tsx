'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import TarotCardBack from '../components/TarotCardBack';
import LoadingWatch from '../components/LoadingWatch';

type Topic = 'love' | 'career' | 'personal_growth';

interface DrawnCard {
  id: string;
  name_zh: string;
  name_en: string;
  position: number;
  position_label: string;
  orientation: string;
  keywords: string[];
}

export default function TarotPage() {
  const router = useRouter();
  const [step, setStep] = useState<'topic' | 'question' | 'draw' | 'reveal'>('topic');
  const [topic, setTopic] = useState<Topic>('love');
  const [question, setQuestion] = useState('');
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [readingId, setReadingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [revealedCards, setRevealedCards] = useState<boolean[]>([false, false, false]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'reveal' && cards.length === 3) {
      animateReveal();
    }
  }, [step, cards]);

  const animateReveal = () => {
    const tl = gsap.timeline();

    // Shuffle animation
    tl.to('.card-wrapper', {
      x: () => gsap.utils.random(-50, 50),
      y: () => gsap.utils.random(-30, 30),
      rotation: () => gsap.utils.random(-15, 15),
      duration: 0.3,
      stagger: 0.05,
      repeat: 5,
      ease: 'power1.inOut'
    });

    // Spread animation
    tl.to('.card-wrapper', {
      x: (index) => (index - 1) * 140,
      y: 0,
      rotation: (index) => (index - 1) * 5,
      duration: 0.8,
      stagger: 0.1,
      ease: 'back.out(1.2)'
    });

    // Reveal cards one by one
    cards.forEach((_, index) => {
      tl.add(() => {
        setRevealedCards(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, `+=${index * 0.8}`);
    });
  };

  const handleDrawCards = async () => {
    if (!question.trim()) return;

    setIsLoading(true);

    try {
      const birthDataStr = typeof window !== 'undefined' ? localStorage.getItem('birthData') : null;
      const birthData = birthDataStr ? JSON.parse(birthDataStr) : undefined;

      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, question, birthData })
      });

      if (!response.ok) throw new Error('Failed to create reading');

      const data = await response.json();
      setCards(data.cards);
      setReadingId(data.readingId);
      setStep('reveal');
    } catch (error) {
      console.error('Error drawing cards:', error);
      alert('抱歉,抽牌时出现问题。请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterpret = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/readings/${readingId}/interpret`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to interpret');

      router.push(`/tarot/reading/${readingId}`);
    } catch (error) {
      console.error('Error interpreting:', error);
      alert('解读失败,请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Topic selection */}
        {step === 'topic' && (
          <div className="text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🃏</div>
              <h1 className="text-4xl font-bold text-[#f5e6d3] mb-2">选择占卜主题</h1>
              <p className="text-[#f5e6d3]/60">牌灵在等待你的问题</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { value: 'love' as Topic, label: '爱情', icon: '💕', desc: '感情关系与心灵连接' },
                { value: 'career' as Topic, label: '事业', icon: '💼', desc: '职业发展与工作机会' },
                { value: 'personal_growth' as Topic, label: '个人成长', icon: '🌱', desc: '自我探索与内在成长' }
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setTopic(t.value);
                    setStep('question');
                  }}
                  className="bg-[#1a1a1a] p-8 rounded-2xl border-2 border-[#ff6b35]/20 hover:border-[#ff6b35] hover:shadow-[0_0_30px_rgba(255,107,53,0.3)] transition-all group"
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{t.icon}</div>
                  <h3 className="text-xl font-bold text-[#f5e6d3] mb-2">{t.label}</h3>
                  <p className="text-sm text-[#f5e6d3]/60">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question input */}
        {step === 'question' && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🥕</div>
              <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">你的问题是?</h2>
              <p className="text-[#f5e6d3]/60">诚心提问,牌灵会给予指引</p>
            </div>

            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-[#ff6b35]/20">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="在此输入你的问题..."
                className="w-full h-32 px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none resize-none"
                maxLength={500}
                autoFocus
              />

              <p className="mt-4 text-sm text-[#f5e6d3]/40 flex items-center">
                <span className="mr-2">🔒</span>
                你的问题是私密的,仅用于生成解读
              </p>

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setStep('topic')}
                  className="flex-1 px-6 py-3 bg-[#1a1a1a] text-[#f5e6d3] rounded-xl border-2 border-[#f5e6d3]/20 hover:border-[#f5e6d3]/40"
                >
                  ← 返回
                </button>
                <button
                  onClick={handleDrawCards}
                  disabled={!question.trim() || isLoading}
                  className="flex-1 px-6 py-3 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading ? '抽牌中...' : '开始抽牌 🃏'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card reveal */}
        {step === 'reveal' && (
          <div>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#f5e6d3] mb-2">你的牌阵</h2>
              <p className="text-[#f5e6d3]/60">过去 · 现在 · 未来</p>
            </div>

            <div className="relative h-96 flex items-center justify-center mb-12">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className="card-wrapper absolute w-40"
                  style={{ zIndex: index }}
                >
                  <div className="relative perspective-1000">
                    <div
                      className={`transition-all duration-700 preserve-3d ${
                        revealedCards[index] ? 'rotate-y-180' : ''
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: revealedCards[index] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Card back */}
                      <div className="absolute inset-0 backface-hidden">
                        <TarotCardBack className="w-full drop-shadow-2xl" />
                      </div>

                      {/* Card front */}
                      <div
                        className="absolute inset-0 backface-hidden bg-[#f5e6d3] rounded-lg p-4 shadow-2xl border-2 border-[#ff6b35]"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                        <div className="text-center h-full flex flex-col justify-between">
                          <div>
                            <p className="text-xs text-[#ff6b35] font-bold mb-1">
                              {['过去', '现在', '未来'][index]}
                            </p>
                            <h3 className="text-lg font-bold text-[#0a0a0a] mb-1">{card.name_zh}</h3>
                            <p className="text-xs text-[#0a0a0a]/60 mb-2">{card.name_en}</p>
                          </div>
                          <div className="text-4xl my-4">
                            {card.orientation === 'reversed' ? '🔄' : '✨'}
                          </div>
                          <div>
                            <p className="text-xs text-[#0a0a0a]/80 mb-1">
                              {card.orientation === 'upright' ? '正位' : '逆位'}
                            </p>
                            <p className="text-xs text-[#0a0a0a]/60">
                              {card.keywords.slice(0, 3).join(' · ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {revealedCards.every(r => r) && (
              <div className="text-center">
                {isLoading ? (
                  <LoadingWatch message="AI 正在解读你的牌..." />
                ) : (
                  <button
                    onClick={handleInterpret}
                    className="px-12 py-4 bg-[#ff6b35] text-[#0a0a0a] text-lg font-bold rounded-full hover:shadow-[0_0_30px_rgba(255,107,53,0.6)] transition-all"
                  >
                    查看解读 🔮
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

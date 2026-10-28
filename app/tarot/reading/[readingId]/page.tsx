'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingWatch from '@/app/components/LoadingWatch';

interface Interpretation {
  overall_theme: string;
  past_interpretation: string;
  present_interpretation: string;
  future_interpretation: string;
  relationship: string;
  practical_suggestions: string;
  reflection_question: string;
}

function ReadingResultContent() {
  const params = useParams();
  const router = useRouter();
  const readingId = params?.readingId as string;
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (readingId) {
      loadInterpretation();
    }
  }, [readingId]);

  const loadInterpretation = async () => {
    try {
      const response = await fetch(`/api/readings/${readingId}/interpret`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to load interpretation');

      const data = await response.json();
      setInterpretation(data.interpretation);
    } catch (error) {
      console.error('Error loading interpretation:', error);
      alert('加载解读失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <LoadingWatch message="正在加载解读..." />
      </div>
    );
  }

  if (!interpretation) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#f5e6d3] mb-4">解读未找到</p>
          <button
            onClick={() => router.push('/tarot')}
            className="px-6 py-3 bg-[#ff6b35] text-[#0a0a0a] rounded-xl"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🔮</div>
          <h1 className="text-4xl font-bold text-[#f5e6d3] mb-2">你的塔罗解读</h1>
          <p className="text-[#f5e6d3]/60">倾听牌灵的声音</p>
        </div>

        {/* Interpretation sections */}
        <div className="space-y-6">
          {/* Overall theme */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">✨</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">整体主题</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.overall_theme}</p>
          </section>

          {/* Past */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">⏪</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">过去</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.past_interpretation}</p>
          </section>

          {/* Present */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">⏺</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">现在</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.present_interpretation}</p>
          </section>

          {/* Future */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">⏩</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">未来</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.future_interpretation}</p>
          </section>

          {/* Relationship */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🔗</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">牌之间的关系</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.relationship}</p>
          </section>

          {/* Practical suggestions */}
          <section className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">💡</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">实用建议</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed">{interpretation.practical_suggestions}</p>
          </section>

          {/* Reflection question */}
          <section className="bg-gradient-to-br from-[#ff6b35]/20 to-[#4a5f4f]/20 p-6 rounded-2xl border border-[#ff6b35]/40">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🤔</span>
              <h2 className="text-xl font-bold text-[#ff6b35]">反思问题</h2>
            </div>
            <p className="text-[#f5e6d3] leading-relaxed italic">{interpretation.reflection_question}</p>
          </section>
        </div>

        {/* Actions */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/tarot')}
            className="px-8 py-3 bg-[#1a1a1a] text-[#f5e6d3] rounded-xl border-2 border-[#f5e6d3]/20 hover:border-[#ff6b35]/40 transition-all"
          >
            再次占卜
          </button>
          <button
            onClick={() => router.push('/combined')}
            className="px-8 py-3 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] transition-all"
          >
            查看综合解读 🔮
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 text-center text-sm text-[#f5e6d3]/40">
          <p>🃏 塔罗是探索与反思的工具,非预测或专业建议</p>
        </div>
      </div>
    </div>
  );
}

export default function ReadingResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <LoadingWatch message="正在加载..." />
      </div>
    }>
      <ReadingResultContent />
    </Suspense>
  );
}

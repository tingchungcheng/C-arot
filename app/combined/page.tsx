'use client';

import { useState } from 'react';
import LoadingWatch from '../components/LoadingWatch';

export default function CombinedPage() {
  const [combined, setCombined] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // Get the most recent reading ID from localStorage or prompt user
      const readingId = prompt('请输入你的塔罗解读 ID (可以从URL中获取):');
      if (!readingId) return;

      const response = await fetch('/api/combined', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId })
      });

      if (!response.ok) throw new Error('Failed to generate combined reading');

      const data = await response.json();
      setCombined(data.combinedInterpretation);
    } catch (error) {
      console.error('Error generating combined reading:', error);
      alert('生成综合解读失败。请确保你已完成塔罗占卜和星盘生成。');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <LoadingWatch message="正在综合塔罗与星盘..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔮</div>
          <h1 className="text-4xl font-bold text-[#f5e6d3] mb-2">综合解读</h1>
          <p className="text-[#f5e6d3]/60">塔罗与星盘的对话</p>
        </div>

        {!combined ? (
          <div className="text-center">
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-[#ff6b35]/20 mb-8">
              <p className="text-[#f5e6d3] mb-6">
                综合解读将你的塔罗解读与出生星盘结合,揭示当前趋势与长期特质的对话。
              </p>
              <p className="text-[#f5e6d3]/60 text-sm mb-6">
                请确保你已完成塔罗占卜和星盘生成
              </p>
              <button
                onClick={handleGenerate}
                className="px-8 py-4 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] transition-all"
              >
                生成综合解读 ✨
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#ff6b35]/20 to-[#4a5f4f]/20 p-8 rounded-2xl border border-[#ff6b35]/40">
            <div className="text-[#f5e6d3] leading-relaxed whitespace-pre-wrap">{combined}</div>
            <div className="mt-8 text-center">
              <button
                onClick={() => setCombined(null)}
                className="px-6 py-3 bg-[#1a1a1a] text-[#f5e6d3] rounded-xl border-2 border-[#f5e6d3]/20 hover:border-[#ff6b35]/40"
              >
                重新生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import LoadingWatch from '../components/LoadingWatch';

export default function BirthChartPage() {
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [birthData, setBirthData] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('birthData');
      if (data) {
        const parsed = JSON.parse(data);
        setBirthData(parsed);
        // Auto-generate if we have the data
        if (parsed.place) {
          handleGenerate(parsed);
        }
      }
    }
  }, []);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    try {
      // For demo: use approximate coordinates
      const latitude = data.latitude || 3.139; // KL default
      const longitude = data.longitude || 101.687;
      const timezone = data.timezone || 'Asia/Kuala_Lumpur';

      const response = await fetch('/api/birth-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: data.nickname,
          date: data.date,
          time: data.time || undefined,
          place: data.place,
          latitude,
          longitude,
          timezone
        })
      });

      if (!response.ok) throw new Error('Failed to generate chart');

      const result = await response.json();
      setChartData(result);
    } catch (error) {
      console.error('Error generating chart:', error);
      alert('生成星盘失败');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 flex items-center justify-center">
        <LoadingWatch message="正在计算星盘..." />
      </div>
    );
  }

  if (!birthData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-2xl text-[#f5e6d3] mb-4">请先完成个人资料</h2>
          <a href="/profile" className="px-6 py-3 bg-[#ff6b35] text-[#0a0a0a] rounded-xl inline-block">
            前往资料页面
          </a>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-4xl font-bold text-[#f5e6d3] mb-8">你的星盘</h1>
          <button
            onClick={() => handleGenerate(birthData)}
            className="px-8 py-4 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl"
          >
            生成星盘
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✨</div>
          <h1 className="text-4xl font-bold text-[#f5e6d3] mb-2">你的出生星盘</h1>
          <p className="text-[#f5e6d3]/60">宇宙在你出生时的快照</p>
        </div>

        {/* Chart SVG */}
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-[#ff6b35]/20 mb-8">
          <div dangerouslySetInnerHTML={{ __html: chartData.chartSvg }} className="max-w-md mx-auto" />
        </div>

        {/* Summary */}
        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#ff6b35]/20 mb-8">
          <h2 className="text-xl font-bold text-[#ff6b35] mb-4">主要星体位置</h2>
          <pre className="text-[#f5e6d3] whitespace-pre-wrap font-mono text-sm">{chartData.summary}</pre>
        </div>

        {/* AI Interpretation */}
        <div className="bg-gradient-to-br from-[#ff6b35]/20 to-[#4a5f4f]/20 p-6 rounded-2xl border border-[#ff6b35]/40">
          <h2 className="text-xl font-bold text-[#ff6b35] mb-4">🔮 AI 解读</h2>
          <div className="text-[#f5e6d3] leading-relaxed whitespace-pre-wrap">{chartData.interpretation}</div>
        </div>
      </div>
    </div>
  );
}

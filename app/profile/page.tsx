'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="text-[#f5e6d3]/60 py-4">加载地图...</div>
  )
});

interface LocationData {
  place: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export default function ProfilePage() {
  const [birthData, setBirthData] = useState({
    nickname: '',
    date: '',
    time: '',
    timeUnknown: false,
    place: '',
    latitude: 3.139,
    longitude: 101.687,
    timezone: 'Asia/Kuala_Lumpur'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('birthData');
      if (data) {
        setBirthData(JSON.parse(data));
      }
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('birthData', JSON.stringify(birthData));
      alert('资料已保存 ✓');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐰</div>
          <h1 className="text-4xl font-bold text-[#f5e6d3] mb-2">我的资料</h1>
          <p className="text-[#f5e6d3]/60">更新你的出生信息</p>
        </div>

        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-[#ff6b35]/20 space-y-6">
          <div>
            <label className="block text-[#f5e6d3] mb-2">昵称</label>
            <input
              type="text"
              value={birthData.nickname}
              onChange={(e) => setBirthData({ ...birthData, nickname: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#f5e6d3] mb-2">出生日期</label>
            <input
              type="date"
              value={birthData.date}
              onChange={(e) => setBirthData({ ...birthData, date: e.target.value })}
              className="w-full px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#f5e6d3] mb-2">出生时间</label>
            <input
              type="time"
              value={birthData.time}
              onChange={(e) => setBirthData({ ...birthData, time: e.target.value })}
              disabled={birthData.timeUnknown}
              className="w-full px-4 py-3 bg-[#0a0a0a] text-[#f5e6d3] rounded-xl border-2 border-[#ff6b35]/30 focus:border-[#ff6b35] focus:outline-none disabled:opacity-40"
            />
            <label className="flex items-center mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={birthData.timeUnknown}
                onChange={(e) => setBirthData({ ...birthData, timeUnknown: e.target.checked, time: '' })}
                className="w-5 h-5 mr-3 accent-[#ff6b35]"
              />
              <span className="text-[#f5e6d3]/80">不知道出生时间</span>
            </label>
          </div>

          <div>
            <label className="block text-[#f5e6d3] mb-2">出生地点</label>
            <LocationPicker
              value={birthData.place ? {
                place: birthData.place,
                latitude: birthData.latitude,
                longitude: birthData.longitude,
                timezone: birthData.timezone
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

          <button
            onClick={handleSave}
            className="w-full px-6 py-4 bg-[#ff6b35] text-[#0a0a0a] font-bold rounded-xl hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] transition-all"
          >
            保存资料 ✓
          </button>
        </div>
      </div>
    </div>
  );
}

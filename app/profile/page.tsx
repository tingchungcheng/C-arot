'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Icon from '../components/Icon';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="text-text/60 py-4">加载地图...</div>
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
      alert('资料已保存');
    }
  };

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Icon name="rabbit" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">我的资料</h1>
          <p className="text-text/60">更新你的出生信息</p>
        </div>

        <div className="bg-surface-1 p-8 rounded-2xl border border-primary/20 space-y-6">
          <div>
            <label className="block text-text mb-2">昵称</label>
            <input
              type="text"
              value={birthData.nickname}
              onChange={(e) => setBirthData({ ...birthData, nickname: e.target.value })}
              className="w-full px-4 py-3 bg-bg text-text rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-text mb-2">出生日期</label>
            <input
              type="date"
              value={birthData.date}
              onChange={(e) => setBirthData({ ...birthData, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg text-text rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-text mb-2">出生时间</label>
            <input
              type="time"
              value={birthData.time}
              onChange={(e) => setBirthData({ ...birthData, time: e.target.value })}
              disabled={birthData.timeUnknown}
              className="w-full px-4 py-3 bg-bg text-text rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none disabled:opacity-40"
            />
            <label className="flex items-center mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={birthData.timeUnknown}
                onChange={(e) => setBirthData({ ...birthData, timeUnknown: e.target.checked, time: '' })}
                className="w-5 h-5 mr-3 accent-primary"
              />
              <span className="text-text/80">不知道出生时间</span>
            </label>
          </div>

          <div>
            <label className="block text-text mb-2">出生地点</label>
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
            className="w-full px-6 py-4 bg-primary text-on-primary font-bold rounded-xl hover:shadow-[0_0_20px_rgba(242,118,46,0.6)] transition-all"
          >
            保存资料 <Icon name="check" size={20} className="inline align-[-4px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

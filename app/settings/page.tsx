'use client';
import { t as tx } from '../i18n';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useProfilePrefill, profileStore } from '../components/profile-store';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="text-text/60 py-4">{tx('加载地图...')}</div>
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

  useProfilePrefill((p) => setBirthData((b) => ({ ...b, ...p, latitude: p.latitude ?? b.latitude, longitude: p.longitude ?? b.longitude, timezone: p.timezone ?? b.timezone })));

  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await profileStore.save(birthData);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Icon name="settings" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">{tx('设置')}</h1>
          <p className="text-text/60">{tx('个人资料与语言偏好')}</p>
        </div>

        <section aria-labelledby="sec-lang" className="bg-surface-1 p-6 md:p-8 rounded-2xl border border-border mb-8">
          <h2 id="sec-lang" className="flex items-center gap-2 text-xl font-bold text-text mb-1"><Icon name="globe" size={22} className="text-gold" />{tx('语言 / Language')}</h2>
          <p className="text-text-2 text-sm mb-4">{tx('界面语言会保存在此设备上。')}</p>
          <LanguageSwitcher variant="full" />
        </section>

        <section aria-labelledby="sec-profile" className="bg-surface-1 p-6 md:p-8 rounded-2xl border border-primary/20 space-y-6">
          <h2 id="sec-profile" className="flex items-center gap-2 text-xl font-bold text-text"><Icon name="user" size={22} className="text-primary" />{tx('个人资料')}</h2>
          <p className="-mt-4 text-text-2 text-sm">{tx('更新你的出生信息')}</p>
          <div>
            <label className="block text-text mb-2">{tx('昵称')}</label>
            <input
              type="text"
              value={birthData.nickname}
              onChange={(e) => setBirthData({ ...birthData, nickname: e.target.value })}
              className="w-full px-4 py-3 bg-bg text-text rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-text mb-2">{tx('出生日期')}</label>
            <input
              type="date"
              value={birthData.date}
              onChange={(e) => setBirthData({ ...birthData, date: e.target.value })}
              className="w-full px-4 py-3 bg-bg text-text rounded-xl border-2 border-primary/30 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-text mb-2">{tx('出生时间')}</label>
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
              <span className="text-text/80">{tx('不知道出生时间')}</span>
            </label>
          </div>

          <div>
            <label className="block text-text mb-2">{tx('出生地点')}</label>
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
            {tx('保存资料')} <Icon name="check" size={20} className="inline align-[-4px]" />
          </button>
        </section>
      </div>
      <Modal
        open={saved}
        onClose={() => setSaved(false)}
        tone="gold"
        title={tx('资料已保存')}
        message={tx('你的出生资料已更新，之后的占卜和星盘会使用这份资料。')}
        primary={{ label: tx('好的') }}
        secondary={{ label: tx('去占卜'), onClick: () => { setSaved(false); window.location.href = '/tarot'; } }}
      />
    </div>
  );
}

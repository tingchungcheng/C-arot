'use client';
import { t as tx } from '../i18n';

import { useState } from 'react';
import Link from 'next/link';
import Icon from '../components/Icon';
import AccountSection from '../components/AccountSection';
import { useAuthGate } from '../components/AuthGateProvider';
import { useProfilePrefill } from '../components/profile-store';

export default function ProfilePage() {
  const { status: authStatus } = useAuthGate();
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

  return (
    <div className="min-h-screen bg-bg pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Icon name="settings" size={48} className="mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-bold text-text mb-2">{tx('设置')}</h1>
          <p className="text-text/60">{tx('个人资料与语言偏好')}</p>
        </div>

        <AccountSection />

        {authStatus === 'authenticated' && <section aria-labelledby="sec-profile" className="bg-surface-1 p-6 md:p-8 rounded-2xl border border-primary/20 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 id="sec-profile" className="flex items-center gap-2 text-xl font-bold text-text"><Icon name="user" size={22} className="text-primary" />{tx('个人资料')}</h2>
            <Link href="/onboarding?edit=1" className="icon-btn" aria-label={tx('修改')} title={tx('修改')}>
              <Icon name="edit" size={20} />
            </Link>
          </div>
          <p className="-mt-4 text-text-2 text-sm">{tx('你的资料仅用于生成星盘与解读。')}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg px-4 py-3">
              <dt className="text-xs text-text-3">{tx('昵称')}</dt>
              <dd className="mt-1 text-text">{birthData.nickname || '—'}</dd>
            </div>
            <div className="rounded-xl border border-border bg-bg px-4 py-3">
              <dt className="text-xs text-text-3">{tx('出生日期')}</dt>
              <dd className="mt-1 text-text">{birthData.date || '—'}</dd>
            </div>
            <div className="rounded-xl border border-border bg-bg px-4 py-3">
              <dt className="text-xs text-text-3">{tx('出生时间')}</dt>
              <dd className="mt-1 text-text">{birthData.timeUnknown ? tx('不知道出生时间') : birthData.time || tx('未知')}</dd>
            </div>
            <div className="rounded-xl border border-border bg-bg px-4 py-3 sm:col-span-2">
              <dt className="text-xs text-text-3">{tx('出生地点')}</dt>
              <dd className="mt-1 text-text">{birthData.place || '—'}</dd>
            </div>
          </dl>
        </section>}
      </div>
    </div>
  );
}

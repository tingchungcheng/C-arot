'use client';
import { t as tx } from '../i18n';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import dynamic from 'next/dynamic';
import Icon, { type IconName } from '../components/Icon';
import BirthDatePicker, { parseISO } from '../components/BirthDatePicker';
import BirthTimePicker from '../components/BirthTimePicker';
import ZodiacPanel from '../components/ZodiacPanel';
import { zodiacFor } from '../components/zodiac';
import { useProfilePrefill, hasCompleteProfile, profileStore } from '../components/profile-store';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="text-text-ob-2 py-4 text-center text-[15px]">{tx('加载地图...')}</div>,
});

interface LocationData { place: string; latitude: number; longitude: number; timezone: string }

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

const STEPS = (): { label: string; title: string; sub: string; icon: IconName }[] => ([
  { label: tx('名字'), title: tx('你的名字?'), sub: tx('让我们认识你'), icon: 'rabbit' },
  { label: tx('日期'), title: tx('你的出生日期?'), sub: tx('用于计算你的出生星盘'), icon: 'calendar' },
  { label: tx('时间'), title: tx('你的出生时间?'), sub: tx('精确的时刻让星盘更准确'), icon: 'clock' },
  { label: tx('地点'), title: tx('你的出生地点?'), sub: tx('奇境入口的坐标'), icon: 'globe' },
]);

const pad = (n: number) => String(n).padStart(2, '0');

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [birthData, setBirthData] = useState<BirthData>({ nickname: '', date: '', time: '', timeUnknown: false, place: '' });
  // complete profile → straight to /tarot (unless ?edit=1); the form stays invisible until this check ran
  const [gate, setGate] = useState<'checking' | 'show'>('checking');
  useLayoutEffect(() => {
    const edit = new URLSearchParams(window.location.search).get('edit') === '1';
    if (!edit && hasCompleteProfile()) { router.replace('/tarot'); return; }
    setGate('show'); // eslint-disable-line react-hooks/set-state-in-effect
  }, [router]);
  // saved profile → prefill every field (still editable); fresh users keep the empty form
  useProfilePrefill((p) => setBirthData((b) => ({ ...b, ...p })));
  const rootRef = useRef<HTMLDivElement>(null);
  const dir = useRef(1);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ ok: '(prefers-reduced-motion: no-preference)' }, () => {
        gsap.fromTo('.step-body', { x: 40 * dir.current, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power2.inOut' });
      });
    }, rootRef);
    return () => ctx.revert();
  }, [step]);

  const go = (next: number) => {
    dir.current = next > step ? 1 : -1;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setStep(next); return; }
    gsap.to('.step-body', { x: -40 * dir.current, opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: () => setStep(next) });
  };

  const handleComplete = async () => {
    await profileStore.save(birthData);
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

  const summaries: { label: string; value: string }[] = [];
  if (step > 1) summaries.push({ label: tx('名字'), value: birthData.nickname });
  if (step > 2) { const p = parseISO(birthData.date); summaries.push({ label: tx('出生日期'), value: p ? tx('{0}年{1}月{2}日', [p.y, p.m, p.d]) : '' }); }
  if (step > 3) summaries.push({ label: tx('出生时间'), value: birthData.timeUnknown ? tx('未知') : birthData.time });
  const lastSummary = summaries[summaries.length - 1];

  const current = STEPS()[step - 1];

  const sign = step === 2 ? (() => { const p = parseISO(birthData.date); return p ? zodiacFor(p.m, p.d) : null; })() : null;

  return (
    <div ref={rootRef} className="ob min-h-screen pt-16 md:pt-20" style={gate === 'checking' ? { visibility: 'hidden' } : undefined} aria-busy={gate === 'checking'}>
      <div className="mx-auto max-w-[560px] md:max-w-[1312px] px-5 md:px-10 xl:px-16 pt-6 md:py-10 xl:py-12 md:grid md:grid-cols-12 md:gap-6 md:items-stretch min-h-[calc(100vh-64px)] md:min-h-0 flex flex-col">
        <section className="md:col-span-6 xl:col-span-7 flex-1 flex flex-col md:bg-ob-sheet md:border md:border-ob-border md:rounded-[20px] md:p-8 md:shadow-[0_12px_32px_rgba(0,0,0,.3)]">
          {/* Step header */}
          <div className="flex items-baseline justify-between">
            <p className="overline text-text">Onboarding</p>
            <p className="num italic text-[24px] text-text" aria-label={tx('第 {0} 步,共 4 步', [step])}>{pad(step)} / 04</p>
          </div>
          <ol className="grid grid-cols-4 gap-3 mt-4" aria-label={tx('进度')}>
            {STEPS().map((s, i) => {
              const n = i + 1;
              const state = n < step ? 'done' : n === step ? 'current' : 'upcoming';
              return (
                <li key={s.label} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className={`block h-1 rounded-full ${state === 'upcoming' ? 'bg-ob-border' : 'bg-primary'}`} />
                  <span className={`mt-2 flex items-center gap-1 text-[13px] ${state === 'current' ? 'text-text font-semibold' : state === 'done' ? 'text-text' : 'text-text-ob-2'}`}>
                    {state === 'done' && <Icon name="check" size={14} className="text-leaf" />}
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="step-body flex-1 flex flex-col">
            {lastSummary && (
              <div className="ob-field rounded-[14px] px-4 py-3 mt-6 flex items-center gap-4 md:hidden">
                <Icon name="check" size={20} className="text-leaf" />
                <div>
                  <p className="text-[13px] text-text-ob-2">{lastSummary.label}</p>
                  <p className="text-[16px] text-text">{lastSummary.value}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mt-6 md:mt-8">
              <span className="w-14 h-14 rounded-[14px] ob-field flex items-center justify-center text-primary shrink-0">
                <Icon name={current.icon} size={28} />
              </span>
              <div>
                <h1 className="text-[24px] md:text-[28px] leading-[1.3] text-text">{current.title}</h1>
                <p className="text-[15px] text-text-ob-2">
                  {current.sub}
                  {lastSummary && <span className="hidden md:inline"> · {lastSummary.label}:{lastSummary.value} <Icon name="check" size={14} className="inline text-leaf align-[-2px]" /></span>}
                </p>
              </div>
            </div>

            {/* Sheet (mobile) / inline (desktop card) */}
            <div className="mt-6 flex-1 md:flex-none -mx-5 md:mx-0 bg-ob-sheet md:bg-transparent border-t md:border-0 border-ob-border rounded-t-[20px] md:rounded-none px-5 md:px-0 pt-3 md:pt-0 pb-6 md:pb-0 shadow-[0_-8px_24px_rgba(0,0,0,.3)] md:shadow-none flex flex-col">
              <span className="mx-auto mb-4 block w-10 h-1 rounded-full bg-ob-border md:hidden" aria-hidden="true" />

              <div className="flex-1">
                {step === 1 && (
                  <div>
                    <label htmlFor="nickname" className="block text-[13px] font-medium text-text-ob-2 mb-2">{tx('昵称或名字')}</label>
                    <input id="nickname" type="text" className="ob-input" value={birthData.nickname} autoFocus placeholder={tx('例如:爱丽丝')}
                      onChange={(e) => setBirthData({ ...birthData, nickname: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && canProceed()) go(2); }} />
                    <p className="mt-2 text-[13px] text-text-ob-2">{tx('只用于在解读中称呼你。')}</p>
                  </div>
                )}
                {step === 2 && (
                  <BirthDatePicker value={birthData.date} onChange={(date) => setBirthData((b) => ({ ...b, date }))} />
                )}
                {step === 3 && (
                  <BirthTimePicker
                    value={birthData.time}
                    unknown={birthData.timeUnknown}
                    onChange={(time) => setBirthData((b) => ({ ...b, time }))}
                    onUnknownChange={(timeUnknown) => setBirthData((b) => ({ ...b, timeUnknown, time: timeUnknown ? '' : b.time }))}
                  />
                )}
                {step === 4 && (
                  <LocationPicker
                    value={birthData.place ? {
                      place: birthData.place,
                      latitude: birthData.latitude || 3.139,
                      longitude: birthData.longitude || 101.687,
                      timezone: birthData.timezone || 'Asia/Kuala_Lumpur',
                    } : null}
                    onChange={(l: LocationData) => setBirthData((b) => ({ ...b, place: l.place, latitude: l.latitude, longitude: l.longitude, timezone: l.timezone }))}
                  />
                )}
              </div>

              <div className="flex gap-3 mt-6 md:justify-end">
                {step > 1 && (
                  <button type="button" onClick={() => go(step - 1)} className="btn btn-secondary flex-1 md:flex-none md:w-[160px]"><Icon name="arrow_left" size={20} className="hidden md:inline" />{tx('上一步')}</button>
                )}
                <button
                  type="button"
                  onClick={() => (step < 4 ? go(step + 1) : handleComplete())}
                  disabled={!canProceed()}
                  className="btn btn-primary flex-[1.6] md:flex-none md:w-[260px]"
                >
                  {step < 4 ? tx('确定 · 下一步') : tx('完成 · 进入兔子洞')}
                  <Icon name={step < 4 ? 'arrow_right' : 'check'} size={20} />
                </button>
              </div>
              {step === 4 && (
                <p className="mt-4 flex items-center gap-2 text-[15px] text-text-ob-2"><Icon name="lock" size={16} />{tx('你的资料仅用于生成星盘与解读。')}</p>
              )}
            </div>
          </div>
        </section>

        {/* Right panel (tablet/desktop) */}
        <aside className="hidden md:flex md:col-span-6 xl:col-span-5 flex-col bg-ob-sheet border border-ob-border rounded-[20px] p-6 xl:p-8">
          {step === 2 ? <ZodiacPanel sign={sign} /> : (
            <>
              <p className="overline text-text">{tx('Your details · 你的资料')}</p>
              <dl className="mt-6 space-y-3">
                {summaries.length === 0 && <p className="text-[15px] text-text-ob-2">{tx('完成每一步后,你填写的内容会在这里汇总。')}</p>}
                {summaries.map((s) => (
                  <div key={s.label} className="ob-field rounded-[14px] px-4 py-3 flex items-center gap-4">
                    <Icon name="check" size={20} className="text-leaf" />
                    <div><dt className="text-[13px] text-text-ob-2">{s.label}</dt><dd className="text-[16px] text-text">{s.value}</dd></div>
                  </div>
                ))}
              </dl>
              <div className="mt-auto pt-8 flex items-center gap-3 text-text-ob-2 text-[15px]"><Icon name="rabbit" size={24} className="text-primary" />{tx('跟随白兔,一步步走进你的星盘。')}</div>
            </>
          )}
        </aside>

        {/* Reassurance row (tablet/desktop) */}
        <ul className="hidden md:grid md:col-span-12 grid-cols-3 gap-6">
          {([
            { icon: 'lock', t: tx('资料仅用于生成解读'), d: tx('不会公开或出售') },
            { icon: 'clock', t: tx('不知道出生时间?'), d: tx('下一步可以跳过,仍能生成星盘') },
            { icon: 'info', t: tx('可随时修改'), d: tx('在「设置」中更新') },
          ] as const).map((c) => (
            <li key={c.t} className="ob-field rounded-[16px] px-5 py-4 flex items-center gap-4">
              <Icon name={c.icon} size={22} className="text-gold" />
              <div><p className="text-[15px] font-bold text-text">{c.t}</p><p className="text-[15px] text-text-ob-2">{c.d}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

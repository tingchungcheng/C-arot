'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import EmailAuthModal from './EmailAuthModal';
import { t as tx } from '../i18n';

type AuthStatus = 'loading' | 'guest' | 'authenticated';

type AuthGateContextValue = {
  status: AuthStatus;
  requireAuth: (href?: string) => boolean;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate() {
  const value = useContext(AuthGateContext);
  if (!value) throw new Error('useAuthGate must be used inside AuthGateProvider');
  return value;
}

function safeTarget(href?: string) {
  return href && href.startsWith('/') && !href.startsWith('//') ? href : '/';
}

export default function AuthGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [open, setOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState('/');

  useEffect(() => {
    let active = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((res) => res.ok ? res.json() : { authenticated: false })
      .then((data: { authenticated?: boolean }) => { if (active) setStatus(data.authenticated ? 'authenticated' : 'guest'); })
      .catch(() => { if (active) setStatus('guest'); });
    return () => { active = false; };
  }, []);

  const requireAuth = useCallback((href?: string) => {
    if (status === 'authenticated') return true;
    setPendingHref(safeTarget(href));
    setOpen(true);
    return false;
  }, [status]);

  const finishEmailAuth = useCallback(() => {
    const target = pendingHref;
    setEmailOpen(false);
    setOpen(false);
    setStatus('authenticated');
    router.push(target);
    router.refresh();
  }, [pendingHref, router]);

  const googleHref = `/api/auth/login?provider=Google&returnTo=${encodeURIComponent(pendingHref)}`;
  const context = useMemo(() => ({ status, requireAuth }), [status, requireAuth]);

  return (
    <AuthGateContext.Provider value={context}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-bg/55 p-4 backdrop-blur-md" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-auth-title"
            className="relative w-full max-w-md rounded-2xl border border-primary bg-surface-1 p-6 shadow-[var(--shadow-1)] sm:p-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-2xl leading-none text-text-3 transition-colors hover:text-text"
              aria-label={tx('关闭')}
            >
              ×
            </button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon name="user" size={25} />
            </div>
            <p className="overline text-primary">{tx('C-arot · 奇境')}</p>
            <h2 id="guest-auth-title" className="mt-2 text-2xl font-bold text-text">{tx('登录后继续')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-2">{tx('请先登录，才能开始占卜、查看出生星盘或进入综合解读。')}</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => setEmailOpen(true)} className="btn btn-primary w-full justify-center">
                <Icon name="user" size={19} /> {tx('使用邮箱登录 / 注册')}
              </button>
              <a href={googleHref} className="btn btn-secondary w-full justify-center">
                <span className="text-base font-bold">G</span> {tx('使用 Google 登录')}
              </a>
              {status === 'guest' && (
                <a href="/tarot?demo=1" className="btn btn-secondary w-full justify-center border-gold/50 text-gold hover:bg-gold/10">
                  <Icon name="sparkle" size={19} /> {tx('试玩塔罗')}
                </a>
              )}
            </div>
            <p className="mt-5 text-center text-xs text-text-3">{tx('登录由 AWS Cognito 安全处理。')}</p>
          </div>
        </div>
      )}
      <EmailAuthModal open={emailOpen} onClose={() => setEmailOpen(false)} onSuccess={finishEmailAuth} />
    </AuthGateContext.Provider>
  );
}

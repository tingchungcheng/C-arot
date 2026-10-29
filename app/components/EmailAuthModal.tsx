'use client';

import { FormEvent, useState } from 'react';
import Modal from './Modal';
import { t as tx } from '../i18n';
import { authErrorMessage } from './auth-errors';

type Mode = 'signIn' | 'signUp' | 'confirm' | 'forgot' | 'reset';

const titleFor = (mode: Mode) => ({
  signIn: tx('跳进兔子洞吧'),
  signUp: tx('邮箱注册'),
  confirm: tx('确认邮箱'),
  forgot: tx('找回密码'),
  reset: tx('重设密码'),
}[mode]);

export default function EmailAuthModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resetState = () => { setPassword(''); setCode(''); setMessage(''); setError(''); };
  const switchMode = (next: Mode) => { resetState(); setMode(next); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('email_invalid');
      if ((mode === 'signIn' || mode === 'signUp' || mode === 'reset') && password.length < 8) throw new Error('password_too_short');
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, email, password: password || undefined, code: code || undefined }),
      });
      const data = await res.json().catch(() => ({})) as { errorCode?: string };
      if (!res.ok) throw new Error(data.errorCode || 'auth_unavailable');
      if (mode === 'signUp') { setMode('confirm'); setMessage('验证码已发送，请检查你的邮箱。'); }
      else if (mode === 'confirm') { setMode('signIn'); setMessage('邮箱已验证，请登录。'); }
      else if (mode === 'forgot') { setMode('reset'); setMessage('验证码已发送，请检查你的邮箱。'); }
      else if (mode === 'reset') { setMode('signIn'); setMessage('密码已重置，请登录。'); }
      else { onClose(); onSuccess(); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'auth_unavailable');
    } finally { setBusy(false); }
  };

  const close = () => { resetState(); setMode('signIn'); onClose(); };
  const showCredentials = mode === 'signIn' || mode === 'signUp';
  const showCode = mode === 'confirm' || mode === 'reset';

  return (
    <Modal open={open} onClose={close} title={titleFor(mode)} tone="orange" message={(
      <form onSubmit={submit} className="space-y-4" noValidate>
        <button type="button" onClick={close} className="absolute right-4 top-4 text-text-3 hover:text-text" aria-label={tx('关闭')}>×</button>
        {(showCredentials || mode === 'forgot' || showCode) && (
          <label className="block">
            <span className="mb-1.5 block text-text-2">{tx('邮箱')}</span>
            <input data-autofocus type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-text outline-none focus:border-primary" required />
          </label>
        )}
        {showCredentials && (
          <label className="block">
            <span className="mb-1.5 block text-text-2">{tx('密码')}</span>
            <input type="password" minLength={8} autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tx('密码至少 8 个字符')} className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-text outline-none focus:border-primary" required />
          </label>
        )}
        {showCode && (
          <label className="block">
            <span className="mb-1.5 block text-text-2">{tx('验证码')}</span>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={tx('请输入验证码')} className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-text outline-none focus:border-primary" required />
          </label>
        )}
        {mode === 'reset' && (
          <label className="block">
            <span className="mb-1.5 block text-text-2">{tx('新密码')}</span>
            <input type="password" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tx('密码至少 8 个字符')} className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-text outline-none focus:border-primary" required />
          </label>
        )}
        {message && <p className="text-sm text-leaf">{tx(message)}</p>}
        {error && <p role="alert" className="text-sm text-danger">{authErrorMessage(error)}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center disabled:opacity-50">{busy ? tx('处理中…') : mode === 'signIn' ? tx('登录') : mode === 'signUp' ? tx('注册') : mode === 'confirm' ? tx('确认邮箱') : mode === 'forgot' ? tx('发送验证码') : tx('重设密码')}</button>
        {mode === 'signIn' && <div className="flex justify-between gap-3 text-xs text-text-3"><button type="button" onClick={() => switchMode('signUp')} className="hover:text-primary">{tx('没有账户？注册')}</button><button type="button" onClick={() => switchMode('forgot')} className="hover:text-primary">{tx('忘记密码？')}</button></div>}
        {mode === 'signUp' && <button type="button" onClick={() => switchMode('signIn')} className="w-full text-center text-xs text-text-3 hover:text-primary">{tx('已有账户？登录')}</button>}
        {mode === 'confirm' && <button type="button" disabled={busy} onClick={async () => {
          setBusy(true); setError(''); setMessage('');
          try {
            const res = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resend', email }) });
            const data = await res.json().catch(() => ({})) as { errorCode?: string };
            if (!res.ok) throw new Error(data.errorCode || 'auth_unavailable');
            setMessage('验证码已发送，请检查你的邮箱。');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'auth_unavailable');
          } finally { setBusy(false); }
        }} className="w-full text-center text-xs text-text-3 hover:text-primary disabled:opacity-50">{tx('重新发送验证码')}</button>}
        {(mode === 'forgot' || mode === 'reset') && <button type="button" onClick={() => switchMode('signIn')} className="w-full text-center text-xs text-text-3 hover:text-primary">{tx('返回登录')}</button>}
      </form>
    )} />
  );
}


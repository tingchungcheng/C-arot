'use client';

import { t as tx } from '../i18n';

/** API returns stable codes; the browser translates them using the selected UI language. */
const ERROR_KEYS: Record<string, string> = {
  invalid_input: '请输入有效的邮箱和资料。',
  email_invalid: '请输入有效的邮箱地址。',
  password_required: '请输入密码。',
  password_too_short: '密码至少需要 8 个字符。',
  code_required: '请输入验证码。',
  cognito_not_configured: '认证服务暂时不可用，请稍后再试。',
  invalid_credentials: '邮箱或密码不正确。',
  user_not_found: '找不到这个邮箱账户。',
  user_exists: '这个邮箱已经注册，请直接登录。',
  unconfirmed: '请先确认邮箱验证码。',
  code_mismatch: '验证码不正确。',
  code_expired: '验证码已过期，请重新发送。',
  invalid_password: '密码不符合要求。',
  too_many_requests: '请求太频繁，请稍后再试。',
  mfa_required: '此账户需要额外验证，请使用 Google 或联系管理员。',
  auth_unavailable: '认证暂时不可用，请稍后再试。',
};

export function authErrorMessage(code?: unknown) {
  const key = typeof code === 'string' ? ERROR_KEYS[code] : undefined;
  return tx(key ?? '认证暂时不可用，请稍后再试。');
}

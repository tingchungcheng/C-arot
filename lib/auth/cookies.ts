import type { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_COOKIE, AUTH_REFRESH_COOKIE } from './config';

export type CognitoTokens = {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

export function setSessionCookies(response: NextResponse, tokens: CognitoTokens) {
  if (!tokens.idToken || !tokens.accessToken) throw new Error('Cognito did not return the required tokens');
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = Math.max(300, Math.min(tokens.expiresIn || 3600, 3600));
  const base = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
  response.cookies.set(AUTH_COOKIE, tokens.idToken, { ...base, maxAge });
  response.cookies.set(AUTH_ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge });
  if (tokens.refreshToken) response.cookies.set(AUTH_REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}


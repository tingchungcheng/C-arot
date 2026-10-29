import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig, AUTH_ACCESS_COOKIE, AUTH_COOKIE, AUTH_REFRESH_COOKIE, AUTH_RETURN_COOKIE, AUTH_STATE_COOKIE, AUTH_VERIFIER_COOKIE } from '@/lib/auth/config';
import { verifyIdToken } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get(AUTH_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(AUTH_VERIFIER_COOKIE)?.value;
  const returnTo = request.cookies.get(AUTH_RETURN_COOKIE)?.value || '/settings';
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings';

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.json({ error: 'Invalid authentication callback' }, { status: 400 });
  }

  let config;
  try {
    config = getAuthConfig();
  } catch {
    return NextResponse.json({ error: 'Cognito is not configured' }, { status: 503 });
  }

  const tokenResponse = await fetch(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: config.callbackUrl,
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    console.error('auth callback: token exchange failed', tokenResponse.status);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 502 });
  }

  const tokens = await tokenResponse.json() as { id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number };
  if (!tokens.id_token || !tokens.access_token) return NextResponse.json({ error: 'Authentication response incomplete' }, { status: 502 });
  try {
    await verifyIdToken(tokens.id_token);
  } catch {
    return NextResponse.json({ error: 'Authentication token rejected' }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL(safeReturnTo, request.url));
  const secure = process.env.NODE_ENV === 'production';
  const accessMaxAge = Math.max(300, Math.min(tokens.expires_in || 3600, 3600));
  response.cookies.set(AUTH_COOKIE, tokens.id_token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: accessMaxAge });
  response.cookies.set(AUTH_ACCESS_COOKIE, tokens.access_token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: accessMaxAge });
  if (tokens.refresh_token) response.cookies.set(AUTH_REFRESH_COOKIE, tokens.refresh_token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  response.cookies.delete(AUTH_STATE_COOKIE);
  response.cookies.delete(AUTH_VERIFIER_COOKIE);
  response.cookies.delete(AUTH_RETURN_COOKIE);
  return response;
}


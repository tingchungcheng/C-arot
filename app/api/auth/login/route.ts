import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig, AUTH_RETURN_COOKIE, AUTH_STATE_COOKIE, AUTH_VERIFIER_COOKIE } from '@/lib/auth/config';
import { createOAuthState, createPkcePair } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  let config;
  try {
    config = getAuthConfig();
  } catch {
    return Response.json({ error: 'Cognito is not configured' }, { status: 503 });
  }

  const provider = request.nextUrl.searchParams.get('provider');
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings';
  const safeReturnTo = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/settings';
  const state = createOAuthState();
  const { verifier, challenge } = createPkcePair();
  const authorization = new URL(`${config.domain}/oauth2/authorize`);
  authorization.searchParams.set('client_id', config.clientId);
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('scope', 'openid email profile');
  authorization.searchParams.set('redirect_uri', config.callbackUrl);
  authorization.searchParams.set('state', state);
  authorization.searchParams.set('code_challenge_method', 'S256');
  authorization.searchParams.set('code_challenge', challenge);
  if (provider === 'Google') authorization.searchParams.set('identity_provider', 'Google');

  const response = NextResponse.redirect(authorization);
  const common = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 600 };
  response.cookies.set(AUTH_STATE_COOKIE, state, common);
  response.cookies.set(AUTH_VERIFIER_COOKIE, verifier, common);
  response.cookies.set(AUTH_RETURN_COOKIE, safeReturnTo, common);
  return response;
}


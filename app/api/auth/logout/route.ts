import { NextRequest, NextResponse } from 'next/server';
import { getAuthConfig, AUTH_ACCESS_COOKIE, AUTH_COOKIE, AUTH_REFRESH_COOKIE } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    const config = getAuthConfig();
    const logout = new URL(`${config.domain}/logout`);
    logout.searchParams.set('client_id', config.clientId);
    logout.searchParams.set('logout_uri', config.logoutUrl);
    response = NextResponse.redirect(logout);
  } catch {
    response = NextResponse.redirect(new URL('/', request.url));
  }
  response.cookies.delete(AUTH_COOKIE);
  response.cookies.delete(AUTH_ACCESS_COOKIE);
  response.cookies.delete(AUTH_REFRESH_COOKIE);
  return response;
}


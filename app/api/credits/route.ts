import { NextRequest } from 'next/server';
import { creditIdentity, withCreditCookie, getCreditState } from '@/lib/credits/request';

export async function GET(request: NextRequest) {
  const ident = await creditIdentity(request);
  const state = getCreditState(ident.key, ident.tier, ident.tz);
  return withCreditCookie(Response.json(state, { headers: { 'Cache-Control': 'no-store' } }), ident);
}

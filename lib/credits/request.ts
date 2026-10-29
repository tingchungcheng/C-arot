import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';
import { safeTimeZone, spendCredits, refundCredits, getCreditState, type Feature, type Tier, type SpendResult } from './ledger';

export const ANON_COOKIE = 'carot_anon';

export interface CreditIdentity { key: string; tier: Tier; tz: string; newAnonId?: string }

/** Signed-in users are keyed by Cognito sub; guests by an httpOnly anon cookie (free tier). */
export async function creditIdentity(request: NextRequest): Promise<CreditIdentity> {
  const tz = safeTimeZone(request.headers.get('x-timezone'));
  const user = await getUserFromRequest(request);
  if (user) return { key: `user:${user.id}`, tier: user.tier, tz };
  const existing = request.cookies.get(ANON_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return { key: `anon:${existing}`, tier: 'free', tz };
  const id = randomUUID();
  return { key: `anon:${id}`, tier: 'free', tz, newAnonId: id };
}

/** Attach the guest cookie (if newly minted) to any Response. */
export function withCreditCookie<T extends Response>(res: T, ident: CreditIdentity): T {
  if (ident.newAnonId) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.headers.append('Set-Cookie', `${ANON_COOKIE}=${ident.newAnonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`);
  }
  return res;
}

export function creditHeaders(r: Extract<SpendResult, { ok: true }>): Record<string, string> {
  return { 'X-Carrots-Balance': String(r.state.balance), 'X-Carrots-Charged': String(r.charged ? r.cost : 0) };
}

/** Charge or return a ready-made 402/429 Response. */
export async function chargeOrDeny(request: NextRequest, feature: Feature, ref?: string) {
  const ident = await creditIdentity(request);
  const result = await spendCredits(ident.key, ident.tier, ident.tz, feature, ref);
  if (!result.ok) return { ident, denied: withCreditCookie(Response.json(result.body, { status: result.status }), ident) };
  return { ident, result, refund: () => { refundCredits(ident.key, result.receipt).catch((e) => console.error('credits: refund failed', e)); } };
}

export { getCreditState };

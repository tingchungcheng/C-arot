import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { NextRequest } from 'next/server';
import { getAuthConfig, getCognitoIssuer, AUTH_COOKIE } from './config';

export type UserTier = 'free' | 'paid';

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  tier: UserTier;
  claims: JWTPayload;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function base64url(value: Buffer): string {
  return value.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createPkcePair() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomUUID();
}

function getJwks(issuer: string) {
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    jwksCache.set(issuer, jwks);
  }
  return jwks;
}

function developmentUser(): AuthUser | null {
  if (process.env.NODE_ENV === 'production') return null;
  const tier = process.env.DEV_AUTH_TIER;
  if (tier !== 'free' && tier !== 'paid') return null;
  return {
    id: process.env.DEV_AUTH_USER_ID?.trim() || 'local-development-user',
    email: 'local@example.test',
    name: 'Local development user',
    tier,
    claims: { sub: process.env.DEV_AUTH_USER_ID?.trim() || 'local-development-user' },
  };
}

export async function verifyIdToken(token: string): Promise<AuthUser | null> {
  const config = getAuthConfig();
  const issuer = getCognitoIssuer(config);
  const { payload } = await jwtVerify(token, getJwks(issuer), {
    issuer,
    audience: config.clientId,
  });

  if (payload.token_use !== 'id' || typeof payload.sub !== 'string') return null;
  const rawTier = payload['custom:tier'];
  const tier: UserTier = rawTier === 'paid' ? 'paid' : 'free';
  return {
    id: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    tier,
    claims: payload,
  };
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return developmentUser();
  try {
    return await verifyIdToken(token);
  } catch (error) {
    console.warn('auth: invalid session', error instanceof Error ? error.message : 'unknown error');
    return null;
  }
}

export async function requireUser(request: NextRequest, paidOnly = false): Promise<{ user?: AuthUser; response?: Response }> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (paidOnly && user.tier !== 'paid') {
    return { response: Response.json({ error: 'Paid plan required', code: 'PAID_REQUIRED' }, { status: 403 }) };
  }
  return { user };
}


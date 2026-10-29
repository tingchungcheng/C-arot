import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE } from '@/lib/auth/config';
import { requireUser } from '@/lib/auth/session';
import { getCloudProfile, isDynamoHistoryEnabled, putCloudProfile, type CloudProfile } from '@/lib/store/dynamo';

const Profile = z.object({
  nickname: z.string().trim().max(100),
  date: z.string().max(20),
  time: z.string().max(20),
  timeUnknown: z.boolean(),
  place: z.string().trim().max(200),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  timezone: z.string().max(100).optional(),
}).strict();

function upstreamBase() { return process.env.USER_API_URL?.replace(/\/$/, ''); }

async function forward(request: NextRequest, method: 'GET' | 'PUT', body?: unknown) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  return fetch(`${upstreamBase()}/profile`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const base = upstreamBase();
  if (base) {
    const upstream = await forward(request, 'GET');
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Profile storage is not configured' }, { status: 503 });
  try {
    return Response.json({ profile: await getCloudProfile(auth.user!.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('profile load failed', error);
    return Response.json({ error: 'Profile unavailable' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const payload = await request.json().catch(() => null);
  const parsed = Profile.safeParse(payload);
  if (!parsed.success) return Response.json({ error: 'Invalid profile' }, { status: 400 });
  const profile = parsed.data as CloudProfile;
  const base = upstreamBase();
  if (base) {
    const upstream = await forward(request, 'PUT', profile);
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Profile storage is not configured' }, { status: 503 });
  try {
    await putCloudProfile(auth.user!.id, profile);
    return Response.json({ profile });
  } catch (error) {
    console.error('profile save failed', error);
    return Response.json({ error: 'Profile unavailable' }, { status: 503 });
  }
}

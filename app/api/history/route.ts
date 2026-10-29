import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE } from '@/lib/auth/config';
import { requireUser } from '@/lib/auth/session';
import { isDynamoHistoryEnabled, listCloudHistory, putCloudHistory } from '@/lib/store/dynamo';

const Card = z.object({
  id: z.string().min(1).max(100),
  position_label: z.string().min(1).max(50),
  orientation: z.enum(['upright', 'reversed']),
  name_zh: z.string().min(1).max(100),
  name_en: z.string().max(100).optional(),
});

const Entry = z.object({
  readingId: z.string().min(1).max(100),
  topic: z.string().max(50).optional(),
  question: z.string().max(500),
  cards: z.array(Card).max(3),
  result: z.string().min(1).max(200_000),
});

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, true);
  if (auth.response) return auth.response;
  const upstreamBase = process.env.USER_API_URL?.replace(/\/$/, '');
  if (upstreamBase) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const upstream = await fetch(`${upstreamBase}/history`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Cloud history is not configured' }, { status: 503 });
  try {
    return Response.json(await listCloudHistory(auth.user!.id), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('history list failed', error);
    return Response.json({ error: 'History unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, true);
  if (auth.response) return auth.response;
  const payload = await request.json().catch(() => null);
  const upstreamBase = process.env.USER_API_URL?.replace(/\/$/, '');
  if (upstreamBase) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const upstream = await fetch(`${upstreamBase}/history`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), cache: 'no-store' });
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Cloud history is not configured' }, { status: 503 });
  const parsed = Entry.safeParse(payload);
  if (!parsed.success) return Response.json({ error: 'Invalid history entry', details: parsed.error.issues }, { status: 400 });
  const entry = { ...parsed.data, id: randomUUID(), createdAt: new Date().toISOString() };
  try {
    await putCloudHistory(auth.user!.id, entry);
    return Response.json(entry, { status: 201 });
  } catch (error) {
    console.error('history save failed', error);
    return Response.json({ error: 'History unavailable' }, { status: 503 });
  }
}


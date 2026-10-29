import { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth/config';
import { requireUser } from '@/lib/auth/session';
import { deleteCloudHistory, getCloudHistory, isDynamoHistoryEnabled } from '@/lib/store/dynamo';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, true);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const upstreamBase = process.env.USER_API_URL?.replace(/\/$/, '');
  if (upstreamBase) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const upstream = await fetch(`${upstreamBase}/history/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Cloud history is not configured' }, { status: 503 });
  const entry = await getCloudHistory(auth.user!.id, id);
  return entry ? Response.json(entry) : Response.json({ error: 'History entry not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, true);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const upstreamBase = process.env.USER_API_URL?.replace(/\/$/, '');
  if (upstreamBase) {
    const token = request.cookies.get(AUTH_COOKIE)?.value;
    const upstream = await fetch(`${upstreamBase}/history/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    return new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' } });
  }
  if (!isDynamoHistoryEnabled()) return Response.json({ error: 'Cloud history is not configured' }, { status: 503 });
  await deleteCloudHistory(auth.user!.id, id);
  return new Response(null, { status: 204 });
}


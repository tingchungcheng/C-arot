import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ authenticated: false, user: null });
  return Response.json({ authenticated: true, user: { id: user.id, email: user.email, name: user.name, tier: user.tier } }, { headers: { 'Cache-Control': 'no-store' } });
}


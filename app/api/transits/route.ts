import { NextRequest } from 'next/server';
import { BirthBody, computeBoth } from './_shared';

// Transit positions/aspects for a period (day | month | year) against the natal chart.
export async function POST(request: NextRequest) {
  const parsed = BirthBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });
  try {
    const { transit } = computeBoth(parsed.data);
    return Response.json(transit, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('transits failed', (e as Error).message);
    return Response.json({ error: 'Transit calculation failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import tzlookup from 'tz-lookup';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const timezone = tzlookup(latitude, longitude);

    return NextResponse.json({ timezone });
  } catch (error) {
    console.error('Error looking up timezone:', error);
    return NextResponse.json(
      { timezone: 'Asia/Kuala_Lumpur', error: 'Fallback to default' },
      { status: 200 }
    );
  }
}

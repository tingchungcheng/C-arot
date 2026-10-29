import { NextResponse } from 'next/server';
import { createDrawSession } from '@/lib/tarot/draw-session';
import { createCloudDrawSession, isDynamoReadingsEnabled } from '@/lib/store/dynamo';

export async function POST() {
  return NextResponse.json(isDynamoReadingsEnabled() ? await createCloudDrawSession() : createDrawSession());
}

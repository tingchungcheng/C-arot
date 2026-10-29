import { NextResponse } from 'next/server';
import { createDrawSession } from '@/lib/tarot/draw-session';

export async function POST() {
  return NextResponse.json(createDrawSession());
}

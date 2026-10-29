import { NextRequest, NextResponse } from 'next/server';
import { getReading, getReadingCards, saveInterpretation, getInterpretation } from '@/lib/store/db';
import { getCardById } from '@/lib/tarot/deck';
import { interpretTarotReading } from '@/lib/ai/interpreter';
import { resolveLocale } from '@/lib/ai/locale';
import { cachedFor, mergeFor } from '../../../_locale-cache';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ readingId: string }> }
) {
  try {
    const { readingId } = await context.params;

    const body = await request.json().catch(() => null);
    const locale = resolveLocale(body?.locale, request.headers.get('x-locale'));
    const existingRaw = getInterpretation(readingId)?.full_interpretation;
    const cached = cachedFor(existingRaw, locale);
    if (cached) {
      return NextResponse.json({
        interpretation: cached,
        cached: true
      });
    }

    const reading = getReading(readingId);
    if (!reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    const readingCards = getReadingCards(readingId);
    if (readingCards.length !== 3) {
      return NextResponse.json({ error: 'Invalid reading cards' }, { status: 400 });
    }

    const drawnCards = readingCards.map(rc => {
      const card = getCardById(rc.card_id);
      if (!card) throw new Error(`Card not found: ${rc.card_id}`);
      
      return {
        card,
        position: rc.position,
        position_label: rc.position_label,
        orientation: rc.orientation as 'upright' | 'reversed'
      };
    });

    const interpretation = await interpretTarotReading(
      reading.question,
      reading.topic,
      drawnCards,
      locale
    );

    saveInterpretation(readingId, mergeFor(existingRaw, locale, interpretation));

    return NextResponse.json({
      interpretation,
      cached: false
    });
  } catch (error) {
    console.error('Error interpreting reading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

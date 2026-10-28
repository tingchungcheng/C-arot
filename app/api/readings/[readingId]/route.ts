import { NextRequest, NextResponse } from 'next/server';
import { getReading, getReadingCards } from '@/lib/store/db';
import { getCardById } from '@/lib/tarot/deck';

/** Reading metadata (question, topic, cards) for the result page. */
export async function GET(_req: NextRequest, context: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await context.params;
  const reading = getReading(readingId);
  if (!reading) return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
  const cards = getReadingCards(readingId)
    .sort((a, b) => a.position - b.position)
    .map((rc) => {
      const c = getCardById(rc.card_id);
      return {
        id: rc.card_id, position: rc.position, position_label: rc.position_label, orientation: rc.orientation,
        name_zh: c?.name_zh ?? rc.card_id, name_en: c?.name_en ?? '', number: c?.number, arcana: c?.arcana_type,
      };
    });
  return NextResponse.json({ readingId, topic: reading.topic, question: reading.question, cards });
}

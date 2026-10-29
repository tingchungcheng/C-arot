import { NextRequest, NextResponse } from 'next/server';
import { getCardById } from '@/lib/tarot/deck';
import { creditIdentity } from '@/lib/credits/request';
import { getCloudReading, isDynamoReadingsEnabled } from '@/lib/store/dynamo';

/** Reading metadata (question, topic, cards) for the result page. */
export async function GET(_req: NextRequest, context: { params: Promise<{ readingId: string }> }) {
  const { readingId } = await context.params;
  if (readingId.startsWith('demo_')) return NextResponse.json({ error: 'Demo reading is stored in the browser session' }, { status: 404 });
  if (isDynamoReadingsEnabled()) {
    const owner = await creditIdentity(_req);
    const reading = await getCloudReading(owner.key, readingId);
    if (!reading) return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    const cards = reading.cards
      .sort((a, b) => a.position - b.position)
      .map((rc) => {
        const c = getCardById(rc.id);
        return {
          id: rc.id, position: rc.position, position_label: rc.position_label, orientation: rc.orientation,
          name_zh: c?.name_zh ?? rc.id, name_en: c?.name_en ?? '', number: c?.number, arcana: c?.arcana_type,
        };
      });
    return NextResponse.json({ readingId, topic: reading.topic, question: reading.question, cards });
  }
  const { getReading, getReadingCards } = await import('@/lib/store/db');
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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { drawThreeCards, drawAt } from '@/lib/tarot/draw';
import { chargeOrDeny, withCreditCookie, creditHeaders } from '@/lib/credits/request';
import { consumeDrawSession } from '@/lib/tarot/draw-session';
import { createReading } from '@/lib/store/db';

const CreateReadingSchema = z.object({
  topic: z.enum(['love', 'career', 'personal_growth']),
  question: z.string().min(1).max(500),
  birthData: z.object({
    date: z.string(),
    time: z.string().optional(),
    place: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string()
  }).optional(),
  drawId: z.string().uuid().optional(),
  positions: z.array(z.number().int().min(0).max(77)).length(3).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateReadingSchema.parse(body);

    const charge = await chargeOrDeny(request, 'tarot', validated.drawId);
    if (charge.denied) return charge.denied;
    let drawResult;
    if (validated.drawId || validated.positions) {
      if (!validated.drawId || !validated.positions) {
        return NextResponse.json({ error: 'drawId and positions must be sent together' }, { status: 400 });
      }
      const deck = consumeDrawSession(validated.drawId);
      if (!deck) { charge.refund(); return NextResponse.json({ error: 'Draw expired or already used' }, { status: 410 }); }
      try {
        drawResult = { cards: drawAt(deck, validated.positions), timestamp: Date.now() };
      } catch (e) {
        charge.refund();
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
    } else {
      drawResult = drawThreeCards();
    }
    
    const readingId = createReading(
      validated.topic,
      validated.question,
      drawResult.cards,
      validated.birthData
    );

    return withCreditCookie(NextResponse.json({
      readingId,
      cards: drawResult.cards.map(dc => ({
        id: dc.card.id,
        name_zh: dc.card.name_zh,
        name_en: dc.card.name_en,
        position: dc.position,
        position_label: dc.position_label,
        orientation: dc.orientation,
        keywords: dc.orientation === 'upright' 
          ? dc.card.upright_keywords 
          : dc.card.reversed_keywords
      })),
      timestamp: drawResult.timestamp
    }, { headers: creditHeaders(charge.result) }), charge.ident);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating reading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { drawThreeCards } from '@/lib/tarot/draw';
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
  }).optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateReadingSchema.parse(body);

    const drawResult = drawThreeCards();
    
    const readingId = createReading(
      validated.topic,
      validated.question,
      drawResult.cards,
      validated.birthData
    );

    return NextResponse.json({
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
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating reading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

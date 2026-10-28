import { NextRequest, NextResponse } from 'next/server';
import { getInterpretation, getLatestBirthChart, getReading, getReadingCards } from '@/lib/store/db';
import { getCardById } from '@/lib/tarot/deck';
import { interpretCombinedReading } from '@/lib/ai/interpreter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { readingId } = body;

    if (!readingId) {
      return NextResponse.json({ error: 'Reading ID required' }, { status: 400 });
    }

    const reading = getReading(readingId);
    if (!reading) {
      return NextResponse.json({ error: 'Reading not found' }, { status: 404 });
    }

    const tarotInterpretation = getInterpretation(readingId);
    if (!tarotInterpretation) {
      return NextResponse.json({ error: 'Tarot interpretation not found' }, { status: 404 });
    }

    const birthChart = getLatestBirthChart();
    if (!birthChart) {
      return NextResponse.json({ error: 'Birth chart not found' }, { status: 404 });
    }

    const readingCards = getReadingCards(readingId);
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

    const tarotData = JSON.parse(tarotInterpretation.full_interpretation);
    const chartData = JSON.parse(birthChart.chart_data);

    const combinedInterpretation = await interpretCombinedReading(
      tarotData,
      chartData,
      drawnCards
    );

    return NextResponse.json({
      combinedInterpretation,
      tarotInterpretation: tarotData,
      birthChart: chartData
    });
  } catch (error) {
    console.error('Error generating combined reading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

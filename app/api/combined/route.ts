import { NextRequest, NextResponse } from 'next/server';
import { getInterpretation, getLatestBirthChart, getReading, getReadingCards } from '@/lib/store/db';
import { getCardById } from '@/lib/tarot/deck';
import { interpretCombinedReading } from '@/lib/ai/interpreter';
import { resolveLocale } from '@/lib/ai/locale';
import { chargeOrDeny, withCreditCookie, creditHeaders } from '@/lib/credits/request';
import { cachedFor } from '../_locale-cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { readingId } = body;
    const locale = resolveLocale(body?.locale, request.headers.get('x-locale'));

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

    // prefer the tarot reading in the same language; fall back to whichever exists
    const tarotData = cachedFor(tarotInterpretation.full_interpretation, locale) ?? JSON.parse(tarotInterpretation.full_interpretation);
    const chartData = JSON.parse(birthChart.chart_data);

    const charge = await chargeOrDeny(request, 'combined', `reading:${readingId}`);
    if (charge.denied) return charge.denied;
    let combinedInterpretation: string;
    try {
    combinedInterpretation = await interpretCombinedReading(
      tarotData,
      chartData,
      drawnCards,
      locale
    );
    } catch (e) { charge.refund(); throw e; }

    return withCreditCookie(NextResponse.json({
      combinedInterpretation,
      tarotInterpretation: tarotData,
      birthChart: chartData
    }, { headers: creditHeaders(charge.result) }), charge.ident);
  } catch (error) {
    console.error('Error generating combined reading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { calculateBirthChart, formatBirthChartSummary } from '@/lib/astrology/calculator';
import { renderBirthChartSVG } from '@/lib/astrology/chart-renderer';
import { interpretBirthChart } from '@/lib/ai/interpreter';
import { resolveLocale } from '@/lib/ai/locale';
import { creditIdentity, withCreditCookie } from '@/lib/credits/request';
import { createCloudBirthChart, isDynamoHistoryEnabled } from '@/lib/store/dynamo';

const BirthChartSchema = z.object({
  nickname: z.string().optional(),
  date: z.string(),
  time: z.string().optional(),
  place: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  deferInterpretation: z.boolean().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = BirthChartSchema.parse(body);
    const locale = resolveLocale(body?.locale, request.headers.get('x-locale'));

    const chartData = calculateBirthChart({
      date: validated.date,
      time: validated.time,
      latitude: validated.latitude,
      longitude: validated.longitude,
      timezone: validated.timezone
    });

    const chartSvg = renderBirthChartSVG(chartData);
    const summary = formatBirthChartSummary(chartData);

    // Client streams the reading separately via /api/birth-chart/interpret
    const interpretation = validated.deferInterpretation ? '' : await interpretBirthChart(chartData, {
      date: validated.date,
      time: validated.time,
      place: validated.place
    }, locale);

    const chartRecord = {
      user_nickname: validated.nickname,
      birth_date: validated.date,
      birth_time: validated.time,
      birth_place: validated.place,
      latitude: validated.latitude,
      longitude: validated.longitude,
      timezone: validated.timezone,
      chart_data: JSON.stringify(chartData),
      interpretation
    };
    let chartId: string;
    const owner = isDynamoHistoryEnabled() ? await creditIdentity(request) : null;
    if (owner) {
      chartId = randomUUID();
      await createCloudBirthChart(owner.key, { id: chartId, ...chartRecord });
    } else {
      const { saveBirthChart } = await import('@/lib/store/db');
      chartId = saveBirthChart(chartRecord);
    }

    const response = NextResponse.json({
      chartId,
      chartData,
      chartSvg,
      summary,
      interpretation
    });
    return owner ? withCreditCookie(response, owner) : response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error calculating birth chart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

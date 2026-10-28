import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateBirthChart, formatBirthChartSummary } from '@/lib/astrology/calculator';
import { renderBirthChartSVG } from '@/lib/astrology/chart-renderer';
import { interpretBirthChart } from '@/lib/ai/interpreter';
import { saveBirthChart, updateBirthChartInterpretation } from '@/lib/store/db';

const BirthChartSchema = z.object({
  nickname: z.string().optional(),
  date: z.string(),
  time: z.string().optional(),
  place: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = BirthChartSchema.parse(body);

    const chartData = calculateBirthChart({
      date: validated.date,
      time: validated.time,
      latitude: validated.latitude,
      longitude: validated.longitude,
      timezone: validated.timezone
    });

    const chartSvg = renderBirthChartSVG(chartData);
    const summary = formatBirthChartSummary(chartData);

    const interpretation = await interpretBirthChart(chartData, {
      date: validated.date,
      time: validated.time,
      place: validated.place
    });

    const chartId = saveBirthChart({
      user_nickname: validated.nickname,
      birth_date: validated.date,
      birth_time: validated.time,
      birth_place: validated.place,
      latitude: validated.latitude,
      longitude: validated.longitude,
      timezone: validated.timezone,
      chart_data: JSON.stringify(chartData),
      interpretation
    });

    return NextResponse.json({
      chartId,
      chartData,
      chartSvg,
      summary,
      interpretation
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error calculating birth chart:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { calculateBirthChart } from '@/lib/astrology/calculator';
import { generateChartSummary } from '@/lib/ai/chart-summary';
import { resolveLocale } from '@/lib/ai/locale';
import { updateBirthChartInterpretation } from '@/lib/store/db';

// Chart summary (strict JSON) via lib/ai/chart-summary. The API key is read here only (server-side).
// Results are cached per birth data (date, time, coords); `regenerate: true` forces a fresh call.

const Body = z.object({
  chartId: z.string().optional(),
  date: z.string(),
  time: z.string().optional(),
  place: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  regenerate: z.boolean().optional(),
});

export interface ChartSummaryView { sun: string; moon: string; rising: string; traits: string[]; strength: string; challenge: string; summary: string }

const clip = (v: unknown, n: number) => {
  const s = String(v ?? '').replace(/[\r\n]+/g, ' ').replace(/[#*`]/g, '').trim();
  const c = Array.from(s);
  return c.length > n ? c.slice(0, n - 1).join('') + '…' : s;
};

/** Normalise lib output to the locked UI shape (tolerates the older {core, monthTip} schema). */
function normalise(raw: Record<string, unknown>): ChartSummaryView | null {
  const traits = (Array.isArray(raw.traits) ? raw.traits : []).map((t) => clip(t, 6)).filter(Boolean).slice(0, 3);
  const v: ChartSummaryView = {
    sun: clip(raw.sun ?? raw.core, 24),
    moon: clip(raw.moon, 24),
    rising: clip(raw.rising, 24),
    traits,
    strength: clip(raw.strength, 32),
    challenge: clip(raw.challenge, 32),
    summary: clip(raw.summary ?? raw.monthTip, 32),
  };
  return v.sun && traits.length === 3 && v.strength && v.challenge && v.summary ? v : null;
}

const g = globalThis as unknown as { __chartSummaryCache?: Map<string, ChartSummaryView> };
const cache = (g.__chartSummaryCache ??= new Map());

export async function POST(request: NextRequest) {
  const rawBody = await request.json().catch(() => null);
  const parsed = Body.safeParse(rawBody);
  const locale = resolveLocale(rawBody?.locale, request.headers.get('x-locale'));
  if (!parsed.success) return Response.json({ error: 'Invalid input' }, { status: 400 });
  const b = parsed.data;
  const key = [b.date, b.time || '-', b.latitude.toFixed(4), b.longitude.toFixed(4), locale].join('|');
  const headers = { 'Cache-Control': 'no-store' };

  if (!b.regenerate && cache.has(key)) return Response.json({ summary: cache.get(key), cached: true }, { headers });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return Response.json({ error: 'AI unavailable' }, { status: 503 });

  const chart = calculateBirthChart({ date: b.date, time: b.time, latitude: b.latitude, longitude: b.longitude, timezone: b.timezone });
  let view: ChartSummaryView | null = null;
  try {
    const raw = await generateChartSummary(chart, { apiKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini', locale });
    view = normalise(raw as unknown as Record<string, unknown>);
  } catch (err) {
    const status = (err as { status?: number }).status;
    console.error('chart summary: upstream error status', status ?? 'validation');
    if (status === 401 || status === 429) return Response.json({ error: 'AI failed' }, { status });
  }
  if (!view) return Response.json({ error: 'AI failed' }, { status: 502 });
  if (!b.time) view.rising = '';

  cache.set(key, view);
  if (b.chartId) { try { updateBirthChartInterpretation(b.chartId, JSON.stringify(view)); } catch { /* non-fatal */ } }
  return Response.json({ summary: view, cached: false }, { headers });
}

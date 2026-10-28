import { z } from 'zod';
import { calculateBirthChart } from '@/lib/astrology/calculator';
import { calculateTransits } from '@/lib/astrology/transits';

export const BirthBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  period: z.enum(['day', 'month', 'year']),
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function computeBoth(b: z.infer<typeof BirthBody>) {
  const natal = calculateBirthChart({ date: b.date, time: b.time, latitude: b.latitude, longitude: b.longitude, timezone: b.timezone });
  const transit = calculateTransits(natal, b.period, b.at);
  return { natal, transit };
}

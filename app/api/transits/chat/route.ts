import { NextRequest } from 'next/server';
import { z } from 'zod';
import { askTransitChat } from '@/lib/ai/transit-chat';
import { resolveLocale } from '@/lib/ai/locale';
import { BirthBody, computeBoth } from '../_shared';
import { chargeOrDeny, withCreditCookie, creditHeaders } from '@/lib/credits/request';
import { requireUser } from '@/lib/auth/session';

// 问问白兔: streams a plain-text answer. Wraps lib's askTransitChat; the API key is read only here (server).
const Body = BirthBody.extend({
  question: z.string().trim().min(1).max(200),
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(20).default([]),
});

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  const rawBody = await request.json().catch(() => null);
  const parsed = Body.safeParse(rawBody);
  const locale = resolveLocale(rawBody?.locale, request.headers.get('x-locale'));
  if (!parsed.success) return new Response('Invalid input', { status: 400 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return new Response('AI unavailable', { status: 503 });

  const b = parsed.data;
  // A chat session is charged once, on its first question (empty history).
  const charge = b.history.length === 0 ? await chargeOrDeny(request, 'chat', `chat:${b.period}:${b.at}:${Date.now()}`) : null;
  if (charge?.denied) return charge.denied;
  const { natal, transit } = computeBoth(b);
  const gen = askTransitChat(natal, transit, b.question, b.history.slice(-6), { apiKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini', locale });

  // Pull the first chunk before responding so upstream errors map to a status.
  let first: IteratorResult<string>;
  try { first = await gen.next(); }
  catch (err) {
    const status = (err as { status?: number }).status;
    console.error('transit chat: upstream status', status ?? 'n/a');
    charge?.refund?.();
    return new Response('AI failed', { status: status === 401 || status === 429 ? status : 502 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done && first.value) controller.enqueue(enc.encode(first.value));
        if (!first.done) for await (const t of gen) {
          if (request.signal.aborted) break;
          controller.enqueue(enc.encode(t));
        }
        controller.close();
      } catch (err) {
        console.error('transit chat: stream error', (err as { status?: number }).status ?? 'n/a');
        controller.error(err);
      }
    },
    cancel() { gen.return(undefined); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no', ...(charge?.result ? creditHeaders(charge.result) : {}) } });
}

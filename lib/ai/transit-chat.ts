import OpenAI from 'openai';
import { type Locale, languageDirective } from '@/lib/ai/locale';
import type { BirthChartData } from '../astrology/calculator';
import type { TransitResult } from '../astrology/transits';

export interface ChatTurn { role: 'user' | 'assistant'; content: string }

const PERIOD_ZH = { day: '流日', month: '流月', year: '流年' } as const;

function compact(natal: BirthChartData, t: TransitResult) {
  const np = [...natal.planets, ...(natal.rising ? [natal.rising] : [])]
    .map(p => `${p.planet}${p.sign}${p.degree.toFixed(0)}°${p.house ? `(${p.house}宫)` : ''}`).join('，');
  const tp = t.planets.map(p => `${p.planet}${p.sign}${p.degree.toFixed(0)}°${p.retrograde ? '逆' : ''}${p.natalHouse ? `→本命${p.natalHouse}宫` : ''}`).join('，');
  const ta = t.aspects.slice(0, 12).map(a => `行运${a.transit}${a.type_zh}本命${a.natal}(${a.orb}°${a.applying ? '入相' : '出相'})`).join('；');
  return `本命盘：${np}\n${PERIOD_ZH[t.period]}（${t.from}~${t.to}）行运：${tp}\n主要相位：${ta || '无紧密相位'}`;
}

const SYSTEM = `你是 C-arot 的占星师白兔，用自然的马来西亚华语回答。
只根据提供的本命盘与行运数据回答用户问题，引用具体相位作为依据（例如"行运木星三分相本命金星"）。
回答简洁：不超过 120 字，可用 1–3 个短要点；不要前言结语。
语气温和正面；不做医疗、法律、投资的确定性建议，不预言死亡或灾难；若问题与星盘无关，礼貌拉回主题。`;

/** Streams the answer. Pass prior turns (keep last ~6) for follow-ups. */
export async function* askTransitChat(
  natal: BirthChartData, transit: TransitResult, question: string, history: ChatTurn[],
  opts: { apiKey: string; model?: string; locale?: Locale },
): AsyncGenerator<string> {
  const openai = new OpenAI({ apiKey: opts.apiKey });
  const stream = await openai.chat.completions.create({
    model: opts.model || 'gpt-4o-mini',
    temperature: 0.5,
    max_tokens: 300,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM + languageDirective(opts.locale ?? 'zh') },
      { role: 'system', content: compact(natal, transit) },
      ...history.slice(-6),
      { role: 'user', content: question.slice(0, 500) },
    ],
  });
  for await (const c of stream) {
    const t = c.choices[0]?.delta?.content;
    if (t) yield t;
  }
}

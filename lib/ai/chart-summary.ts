import OpenAI from 'openai';
import { type Locale, languageDirective } from '@/lib/ai/locale';
import { z } from 'zod';

/** Fixed-format chart summary. The UI owns layout; the model only fills these fields. */
export const ChartSummarySchema = z.object({
  sun: z.string().max(60),            // ☉ 太阳
  moon: z.string().max(60),           // ☽ 月亮
  rising: z.string().max(60),         // ↑ 上升 ('' if no birth time)
  traits: z.array(z.string().max(8)).length(3), // 性格: 3 个关键词
  strength: z.string().max(60),       // 优势
  challenge: z.string().max(60),      // 课题
  summary: z.string().max(60),        // 一句话总结
});
export type ChartSummary = z.infer<typeof ChartSummarySchema>;

const SYSTEM = `你是简洁的占星师。只输出 JSON，不要 Markdown、不要前言结语。
格式严格为：{"sun":"","moon":"","rising":"","traits":["","",""],"strength":"","challenge":"","summary":""}
规则：
- sun / moon / rising：各一句，说明该星座落点的含义，≤20字；无出生时间则 rising 为空字符串
- traits：恰好 3 个性格关键词，每个 2–4 字
- strength / challenge / summary：各一句，≤30字，具体、不空泛
- 语气温和正面，自然的马来西亚华语，不做医疗/财务/宿命论断言`;

export async function generateChartSummary(
  chart: unknown,
  opts: { apiKey: string; model?: string; locale?: Locale; today?: Date },
): Promise<ChartSummary> {
  const openai = new OpenAI({ apiKey: opts.apiKey });
    const res = await openai.chat.completions.create({
    model: opts.model || 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 350,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM + languageDirective(opts.locale ?? 'zh') },
      { role: 'user', content: `星盘数据：${JSON.stringify(chart)}` },
    ],
  });
  const raw = JSON.parse(res.choices[0]?.message?.content ?? '{}');
  const clip = (s: unknown) => String(s ?? '').trim().slice(0, 60);
  return ChartSummarySchema.parse({
    sun: clip(raw.sun),
    moon: clip(raw.moon),
    rising: clip(raw.rising),
    traits: (Array.isArray(raw.traits) ? raw.traits : []).slice(0, 3).map((t: unknown) => String(t).slice(0, 8)),
    strength: clip(raw.strength),
    challenge: clip(raw.challenge),
    summary: clip(raw.summary),
  });
}

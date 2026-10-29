import { db } from '@/lib/store/db';

// Carrot ledger. Amounts are stored in half-carrot units (integers) to avoid float drift.
export type Feature = 'tarot' | 'combined' | 'chart_summary' | 'chat';
export type Tier = 'free' | 'paid';

export const COSTS: Record<Feature, number> = { tarot: 2, combined: 1, chart_summary: 1, chat: 0.5 };
export const DAILY_ALLOWANCE: Record<Tier, number> = { free: 5, paid: 15 };
export const TAROT_PER_DAY = 1;
export const DEFAULT_TZ = 'Asia/Kuala_Lumpur';

const units = (carrots: number) => Math.round(carrots * 2);
const carrots = (u: number) => u / 2;

db.exec(`
  CREATE TABLE IF NOT EXISTS credit_spend (
    user_key TEXT NOT NULL, day TEXT NOT NULL, feature TEXT NOT NULL, ref TEXT NOT NULL,
    units INTEGER NOT NULL, created_at INTEGER NOT NULL,
    PRIMARY KEY (user_key, day, feature, ref)
  );
  CREATE TABLE IF NOT EXISTS credit_once (
    user_key TEXT NOT NULL, feature TEXT NOT NULL, ref TEXT NOT NULL, created_at INTEGER NOT NULL,
    PRIMARY KEY (user_key, feature, ref)
  );
`);

export function safeTimeZone(tz?: string | null): string {
  if (!tz) return DEFAULT_TZ;
  try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }); return tz; } catch { return DEFAULT_TZ; }
}

export function dayIn(tz: string, at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Epoch ms of the next local midnight in tz. */
export function nextResetAt(tz: string, now = Date.now()): number {
  const today = dayIn(tz, new Date(now));
  let t = now;
  while (dayIn(tz, new Date(t + 3600_000)) === today) t += 3600_000;
  while (dayIn(tz, new Date(t + 60_000)) === today) t += 60_000;
  return Math.floor((t + 60_000) / 60_000) * 60_000;
}

export interface CreditState {
  tier: Tier; day: string; timeZone: string;
  allowance: number; spent: number; balance: number;
  tarotUsedToday: number; tarotPerDay: number;
  resetsAt: number; costs: Record<Feature, number>;
}

export function getCreditState(userKey: string, tier: Tier, tz: string): CreditState {
  const day = dayIn(tz);
  const row = db.prepare(`SELECT COALESCE(SUM(units),0) AS u, COALESCE(SUM(feature='tarot'),0) AS t FROM credit_spend WHERE user_key=? AND day=?`).get(userKey, day) as { u: number; t: number };
  const allowance = DAILY_ALLOWANCE[tier];
  const spent = carrots(row.u);
  return {
    tier, day, timeZone: tz, allowance, spent, balance: Math.max(0, allowance - spent),
    tarotUsedToday: row.t, tarotPerDay: TAROT_PER_DAY, resetsAt: nextResetAt(tz), costs: COSTS,
  };
}

export type SpendResult =
  | { ok: true; charged: boolean; cost: number; state: CreditState; receipt: { day: string; feature: Feature; ref: string } }
  | { ok: false; status: 402 | 429; body: { error: 'insufficient_carrots' | 'tarot_daily_limit'; feature: Feature; cost: number; balance: number; resetsAt: number } };

/**
 * Atomically charge a feature. `ref` makes it idempotent: the same (day, feature, ref) is charged once.
 * chart_summary is charged once per chart for good (ref = chart key), not once per day.
 */
export function spendCredits(userKey: string, tier: Tier, tz: string, feature: Feature, ref = `${Date.now()}-${Math.random()}`): SpendResult {
  return db.transaction((): SpendResult => {
    const state = getCreditState(userKey, tier, tz);
    const cost = COSTS[feature];
    const receipt = { day: state.day, feature, ref };
    const deny = (status: 402 | 429, error: 'insufficient_carrots' | 'tarot_daily_limit'): SpendResult =>
      ({ ok: false, status, body: { error, feature, cost, balance: state.balance, resetsAt: state.resetsAt } });

    if (feature === 'chart_summary') {
      const paid = db.prepare(`SELECT 1 FROM credit_once WHERE user_key=? AND feature=? AND ref=?`).get(userKey, feature, ref);
      if (paid) return { ok: true, charged: false, cost: 0, state, receipt };
    }
    const dup = db.prepare(`SELECT 1 FROM credit_spend WHERE user_key=? AND day=? AND feature=? AND ref=?`).get(userKey, state.day, feature, ref);
    if (dup) return { ok: true, charged: false, cost: 0, state, receipt };

    if (feature === 'tarot' && state.tarotUsedToday >= TAROT_PER_DAY) return deny(429, 'tarot_daily_limit');
    if (units(state.balance) < units(cost)) return deny(402, 'insufficient_carrots');

    db.prepare(`INSERT INTO credit_spend VALUES (?,?,?,?,?,?)`).run(userKey, state.day, feature, ref, units(cost), Date.now());
    if (feature === 'chart_summary') db.prepare(`INSERT OR IGNORE INTO credit_once VALUES (?,?,?,?)`).run(userKey, feature, ref, Date.now());
    return { ok: true, charged: true, cost, state: getCreditState(userKey, tier, tz), receipt };
  })();
}

/** Undo a charge when the paid-for work failed (e.g. upstream AI error). */
export function refundCredits(userKey: string, receipt: { day: string; feature: Feature; ref: string }): void {
  db.prepare(`DELETE FROM credit_spend WHERE user_key=? AND day=? AND feature=? AND ref=?`).run(userKey, receipt.day, receipt.feature, receipt.ref);
  if (receipt.feature === 'chart_summary') db.prepare(`DELETE FROM credit_once WHERE user_key=? AND feature=? AND ref=?`).run(userKey, receipt.feature, receipt.ref);
}

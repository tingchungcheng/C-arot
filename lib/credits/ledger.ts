import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDoc, dynamoTable, isDynamoHistoryEnabled } from '@/lib/store/dynamo';

// Carrot ledger. Amounts are stored in half-carrot units (integers) to avoid float drift.
// Backend: DynamoDB when DATA_STORE=dynamodb (prod), else local SQLite (opened lazily).
export type Feature = 'tarot' | 'combined' | 'chart_summary' | 'chat';
export type Tier = 'free' | 'paid';

export const COSTS: Record<Feature, number> = { tarot: 2, combined: 1, chart_summary: 1, chat: 0.5 };
export const DAILY_ALLOWANCE: Record<Tier, number> = { free: 5, paid: 15 };
// Temporarily retained for the credit-state shape, but the Tarot daily gate is disabled below.
export const TAROT_PER_DAY = 1;
export const DEFAULT_TZ = 'Asia/Kuala_Lumpur';

const units = (c: number) => Math.round(c * 2);
const carrots = (u: number) => u / 2;

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
export type Receipt = { day: string; feature: Feature; ref: string };
type DenyBody = { error: 'insufficient_carrots' | 'tarot_daily_limit'; feature: Feature; cost: number; balance: number; resetsAt: number };
export type SpendResult =
  | { ok: true; charged: boolean; cost: number; state: CreditState; receipt: Receipt }
  | { ok: false; status: 402 | 429; body: DenyBody };

function buildState(tier: Tier, tz: string, day: string, spentUnits: number, tarot: number): CreditState {
  const allowance = DAILY_ALLOWANCE[tier];
  const spent = carrots(spentUnits);
  return { tier, day, timeZone: tz, allowance, spent, balance: Math.max(0, allowance - spent),
    tarotUsedToday: tarot, tarotPerDay: TAROT_PER_DAY, resetsAt: nextResetAt(tz), costs: COSTS };
}

function denyFor(feature: Feature, s: CreditState): SpendResult {
  const cost = COSTS[feature];
  // const tarotOut = feature === 'tarot' && s.tarotUsedToday >= TAROT_PER_DAY;
  const tarotOut = false;
  return { ok: false, status: tarotOut ? 429 : 402,
    body: { error: tarotOut ? 'tarot_daily_limit' : 'insufficient_carrots', feature, cost, balance: s.balance, resetsAt: s.resetsAt } };
}

// ---------------- DynamoDB backend ----------------
// Items (single table, PK/SK):
//   CREDIT#<userKey> / DAY#<day>                    { units, tarot }          running day total
//   CREDIT#<userKey> / SPEND#<day>#<feature>#<ref>  { units }                 one per charge (idempotency)
//   CREDIT#<userKey> / ONCE#<feature>#<ref>                                   chart_summary paid-once marker
const pk = (userKey: string) => `CREDIT#${userKey}`;
const ttl = (days: number) => Math.floor(Date.now() / 1000) + days * 86400;

async function dynState(userKey: string, tier: Tier, tz: string): Promise<CreditState> {
  const day = dayIn(tz);
  const r = await dynamoDoc().send(new GetCommand({ TableName: dynamoTable(), Key: { PK: pk(userKey), SK: `DAY#${day}` }, ConsistentRead: true }));
  return buildState(tier, tz, day, Number(r.Item?.units ?? 0), Number(r.Item?.tarot ?? 0));
}

async function dynSpend(userKey: string, tier: Tier, tz: string, feature: Feature, ref: string): Promise<SpendResult> {
  const day = dayIn(tz);
  const cost = units(COSTS[feature]);
  const maxBefore = units(DAILY_ALLOWANCE[tier]) - cost;
  const receipt: Receipt = { day, feature, ref };
  const isTarot = feature === 'tarot';
  const items: NonNullable<ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']> = [
    { Put: { TableName: dynamoTable(), Item: { PK: pk(userKey), SK: `SPEND#${day}#${feature}#${ref}`, entity: 'credit_spend', units: cost, createdAt: Date.now(), expiresAt: ttl(7) },
      ConditionExpression: 'attribute_not_exists(PK)' } },
    { Update: { TableName: dynamoTable(), Key: { PK: pk(userKey), SK: `DAY#${day}` },
      UpdateExpression: 'ADD #u :c, #t :tc SET entity = :e, expiresAt = :x',
      // Tarot's once-per-day condition is intentionally disabled for now.
      ConditionExpression: 'attribute_not_exists(#u) OR #u <= :max',
      ExpressionAttributeNames: { '#u': 'units', '#t': 'tarot' },
      ExpressionAttributeValues: { ':c': cost, ':tc': isTarot ? 1 : 0, ':max': maxBefore, ':e': 'credit_day', ':x': ttl(7) } } },
  ];
  if (feature === 'chart_summary') {
    items.push({ Put: { TableName: dynamoTable(), Item: { PK: pk(userKey), SK: `ONCE#${feature}#${ref}`, entity: 'credit_once', createdAt: Date.now() },
      ConditionExpression: 'attribute_not_exists(PK)' } });
  }
  try {
    await dynamoDoc().send(new TransactWriteCommand({ TransactItems: items }));
  } catch (err) {
    const e = err as { name?: string; CancellationReasons?: { Code?: string }[] };
    if (e.name !== 'TransactionCanceledException') throw err;
    const failed = (i: number) => e.CancellationReasons?.[i]?.Code === 'ConditionalCheckFailed';
    const state = await dynState(userKey, tier, tz);
    if (failed(2) || failed(0)) return { ok: true, charged: false, cost: 0, state, receipt }; // already paid
    if (failed(1)) return denyFor(feature, state);
    throw err;
  }
  return { ok: true, charged: true, cost: COSTS[feature], state: await dynState(userKey, tier, tz), receipt };
}

async function dynRefund(userKey: string, r: Receipt): Promise<void> {
  const cost = units(COSTS[r.feature]);
  const items: NonNullable<ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']> = [
    { Delete: { TableName: dynamoTable(), Key: { PK: pk(userKey), SK: `SPEND#${r.day}#${r.feature}#${r.ref}` }, ConditionExpression: 'attribute_exists(PK)' } },
    { Update: { TableName: dynamoTable(), Key: { PK: pk(userKey), SK: `DAY#${r.day}` }, UpdateExpression: 'ADD #u :c, #t :tc',
      ExpressionAttributeNames: { '#u': 'units', '#t': 'tarot' }, ExpressionAttributeValues: { ':c': -cost, ':tc': r.feature === 'tarot' ? -1 : 0 } } },
  ];
  if (r.feature === 'chart_summary') items.push({ Delete: { TableName: dynamoTable(), Key: { PK: pk(userKey), SK: `ONCE#${r.feature}#${r.ref}` } } });
  try { await dynamoDoc().send(new TransactWriteCommand({ TransactItems: items })); }
  catch (err) { if ((err as { name?: string }).name !== 'TransactionCanceledException') throw err; } // nothing to refund
}

export type DemoTarotResult = { ok: boolean; resetsAt: number };

async function dynClaimDemoTarot(userKey: string, tz: string): Promise<DemoTarotResult> {
  const day = dayIn(tz);
  const resetsAt = nextResetAt(tz);
  try {
    await dynamoDoc().send(new UpdateCommand({
      TableName: dynamoTable(),
      Key: { PK: pk(userKey), SK: `DAY#${day}` },
      UpdateExpression: 'ADD #d :one SET entity = :e, expiresAt = :x',
      ConditionExpression: 'attribute_not_exists(#d) OR #d < :one',
      ExpressionAttributeNames: { '#d': 'demoTarot' },
      ExpressionAttributeValues: { ':one': 1, ':e': 'credit_day', ':x': ttl(7) },
    }));
    return { ok: true, resetsAt };
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return { ok: false, resetsAt };
    throw err;
  }
}

// ---------------- SQLite backend (local dev) ----------------
async function sql() {
  const { db } = await import('@/lib/store/db');
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_spend (user_key TEXT NOT NULL, day TEXT NOT NULL, feature TEXT NOT NULL, ref TEXT NOT NULL,
      units INTEGER NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (user_key, day, feature, ref));
    CREATE TABLE IF NOT EXISTS credit_once (user_key TEXT NOT NULL, feature TEXT NOT NULL, ref TEXT NOT NULL, created_at INTEGER NOT NULL,
      PRIMARY KEY (user_key, feature, ref));`);
  return db;
}

async function sqlState(userKey: string, tier: Tier, tz: string): Promise<CreditState> {
  const db = await sql();
  const day = dayIn(tz);
  const row = db.prepare(`SELECT COALESCE(SUM(units),0) AS u, COALESCE(SUM(feature='tarot'),0) AS t FROM credit_spend WHERE user_key=? AND day=?`).get(userKey, day) as { u: number; t: number };
  return buildState(tier, tz, day, row.u, row.t);
}

async function sqlSpend(userKey: string, tier: Tier, tz: string, feature: Feature, ref: string): Promise<SpendResult> {
  const db = await sql();
  const day = dayIn(tz);
  const receipt: Receipt = { day, feature, ref };
  const read = () => { const r = db.prepare(`SELECT COALESCE(SUM(units),0) AS u, COALESCE(SUM(feature='tarot'),0) AS t FROM credit_spend WHERE user_key=? AND day=?`).get(userKey, day) as { u: number; t: number }; return buildState(tier, tz, day, r.u, r.t); };
  return db.transaction((): SpendResult => {
    const state = read();
    if (feature === 'chart_summary' && db.prepare(`SELECT 1 FROM credit_once WHERE user_key=? AND feature=? AND ref=?`).get(userKey, feature, ref))
      return { ok: true, charged: false, cost: 0, state, receipt };
    if (db.prepare(`SELECT 1 FROM credit_spend WHERE user_key=? AND day=? AND feature=? AND ref=?`).get(userKey, day, feature, ref))
      return { ok: true, charged: false, cost: 0, state, receipt };
    // if (feature === 'tarot' && state.tarotUsedToday >= TAROT_PER_DAY) return denyFor(feature, state);
    if (units(state.balance) < units(COSTS[feature])) return denyFor(feature, state);
    db.prepare(`INSERT INTO credit_spend VALUES (?,?,?,?,?,?)`).run(userKey, day, feature, ref, units(COSTS[feature]), Date.now());
    if (feature === 'chart_summary') db.prepare(`INSERT OR IGNORE INTO credit_once VALUES (?,?,?,?)`).run(userKey, feature, ref, Date.now());
    return { ok: true, charged: true, cost: COSTS[feature], state: read(), receipt };
  })();
}

async function sqlRefund(userKey: string, r: Receipt): Promise<void> {
  const db = await sql();
  db.prepare(`DELETE FROM credit_spend WHERE user_key=? AND day=? AND feature=? AND ref=?`).run(userKey, r.day, r.feature, r.ref);
  if (r.feature === 'chart_summary') db.prepare(`DELETE FROM credit_once WHERE user_key=? AND feature=? AND ref=?`).run(userKey, r.feature, r.ref);
}

async function sqlClaimDemoTarot(userKey: string, tz: string): Promise<DemoTarotResult> {
  const db = await sql();
  const day = dayIn(tz);
  const resetsAt = nextResetAt(tz);
  return db.transaction((): DemoTarotResult => {
    const used = db.prepare(`SELECT 1 FROM credit_spend WHERE user_key=? AND day=? AND feature=? LIMIT 1`).get(userKey, day, 'demo_tarot');
    if (used) return { ok: false, resetsAt };
    db.prepare(`INSERT INTO credit_spend VALUES (?,?,?,?,?,?)`).run(userKey, day, 'demo_tarot', 'demo', 0, Date.now());
    return { ok: true, resetsAt };
  })();
}

// ---------------- Public API (async) ----------------
const cloud = () => isDynamoHistoryEnabled();

export function getCreditState(userKey: string, tier: Tier, tz: string): Promise<CreditState> {
  return cloud() ? dynState(userKey, tier, tz) : sqlState(userKey, tier, tz);
}

/**
 * Atomically charge a feature. `ref` makes it idempotent: the same (day, feature, ref) is charged once.
 * chart_summary is charged once per chart for good (ref = chart key), not once per day.
 */
export function spendCredits(userKey: string, tier: Tier, tz: string, feature: Feature, ref = `${Date.now()}-${Math.random().toString(36).slice(2)}`): Promise<SpendResult> {
  return cloud() ? dynSpend(userKey, tier, tz, feature, ref) : sqlSpend(userKey, tier, tz, feature, ref);
}

/** Undo a charge when the paid-for work failed (e.g. upstream AI error). */
export function refundCredits(userKey: string, receipt: Receipt): Promise<void> {
  return cloud() ? dynRefund(userKey, receipt) : sqlRefund(userKey, receipt);
}

/** Demo Tarot is free, but each identity can use it once per local day. */
export function claimDemoTarot(userKey: string, tz: string): Promise<DemoTarotResult> {
  return cloud() ? dynClaimDemoTarot(userKey, tz) : sqlClaimDemoTarot(userKey, tz);
}

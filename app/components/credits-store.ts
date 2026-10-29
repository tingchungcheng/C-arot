'use client';

/**
 * Carrot credits — client view of the server ledger (lib/credits, GET /api/credits).
 * The server does ALL charging (tarot per drawId, combined per readingId, chart once ever, chat on a
 * session's first question; failed AI calls are refunded). The UI never deducts: it reads /api/credits,
 * then follows X-Carrots-Balance / X-Carrots-Charged on paid responses, and 402/429 refusals.
 */

export type Feature = 'tarot' | 'combined' | 'chart_summary' | 'chat';
export type Tier = 'free' | 'paid';
/** Mirror of the server tiers, for future UI (upgrade copy). The server is the source of truth. */
export const TIERS: Record<Tier, number> = { free: 5, paid: 15 };

export interface CreditState {
  tier: Tier; day: string; timeZone: string;
  allowance: number; spent: number; balance: number;
  tarotUsedToday: number; tarotPerDay: number;
  resetsAt: number; costs: Record<Feature, number>;
}
export type Denial = 'daily_limit' | 'balance';
export interface Affordance { ok: boolean; cost: number; reason?: Denial }
export interface Refusal { error: 'insufficient_carrots' | 'tarot_daily_limit'; feature: Feature; cost: number; balance: number; resetsAt: number }

export interface CreditsStore {
  getBalance(force?: boolean): Promise<CreditState | null>;
  canAfford(feature: Feature): Affordance | null;
  /** fetch for a paid route: adds x-timezone + same-origin cookies, applies X-Carrots-* headers / refusals. */
  fetch(input: string, init?: RequestInit): Promise<Response>;
  onChange(fn: (state: CreditState, charged: number) => void): () => void;
}

export const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };
export const tzHeaders = (h?: HeadersInit) => { const x = new Headers(h); x.set('x-timezone', timeZone()); return x; };

let state: CreditState | null = null;
let inflight: Promise<CreditState | null> | null = null;
const listeners = new Set<(s: CreditState, charged: number) => void>();
const set = (s: CreditState, charged = 0) => { state = s; listeners.forEach((fn) => fn(s, charged)); };

export function afford(s: CreditState | null, feature: Feature): Affordance | null {
  if (!s) return null;
  const cost = s.costs[feature];
  if (feature === 'tarot' && s.tarotUsedToday >= s.tarotPerDay) return { ok: false, cost, reason: 'daily_limit' };
  if (s.balance < cost) return { ok: false, cost, reason: 'balance' };
  return { ok: true, cost };
}

/** Read a refusal body (402/429) from a clone; null when it is not a credit refusal. */
export async function readRefusal(res: Response): Promise<Refusal | null> {
  if (res.status !== 402 && res.status !== 429) return null;
  try { const b = await res.clone().json(); return b?.error === 'insufficient_carrots' || b?.error === 'tarot_daily_limit' ? b : null; } catch { return null; }
}

export const serverCreditsStore: CreditsStore = {
  getBalance(force = false) {
    if (state && !force) return Promise.resolve(state);
    inflight ??= fetch('/api/credits', { headers: tzHeaders(), credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then((s: CreditState | null) => { if (s) set(s); return s; })
      .catch(() => null).finally(() => { inflight = null; });
    return inflight;
  },
  canAfford(feature) { return afford(state, feature); },
  async fetch(input, init = {}) {
    const res = await fetch(input, { ...init, headers: tzHeaders(init.headers), credentials: 'same-origin' });
    const bal = res.headers.get('X-Carrots-Balance');
    if (bal !== null) {
      const charged = Number(res.headers.get('X-Carrots-Charged') || 0);
      if (state) set({ ...state, balance: Number(bal), spent: Math.round((state.allowance - Number(bal)) * 10) / 10,
        tarotUsedToday: state.tarotUsedToday + (charged && /\/api\/readings$/.test(input) ? 1 : 0) }, charged);
      else void serverCreditsStore.getBalance(true);
    } else {
      const ref = await readRefusal(res);
      if (ref && state) set({ ...state, balance: ref.balance, resetsAt: ref.resetsAt, tarotUsedToday: ref.error === 'tarot_daily_limit' ? state.tarotPerDay : state.tarotUsedToday });
    }
    return res;
  },
  onChange(fn) {
    listeners.add(fn);
    // pick up the midnight reset / other tabs without polling hard
    const t = setInterval(() => { if (state && Date.now() >= state.resetsAt) void serverCreditsStore.getBalance(true); }, 30_000);
    const vis = () => { if (document.visibilityState === 'visible') void serverCreditsStore.getBalance(true); };
    document.addEventListener('visibilitychange', vis);
    return () => { listeners.delete(fn); clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  },
};

export const creditsStore: CreditsStore = serverCreditsStore;

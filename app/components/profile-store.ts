'use client';
import { useEffect } from 'react';

// Profile/birth data is cached in localStorage and, for signed-in users, synced to DynamoDB.
export const PROFILE_KEY = 'birthData';
export type StoredProfile = {
  nickname: string; date: string; time: string; timeUnknown: boolean; place: string;
  latitude?: number; longitude?: number; timezone?: string;
};

export function readProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) ?? {};
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const p: StoredProfile = {
      nickname: str(o.nickname), date: str(o.date), time: str(o.time), timeUnknown: !!o.timeUnknown, place: str(o.place),
      latitude: num(o.latitude), longitude: num(o.longitude), timezone: str(o.timezone) || undefined,
    };
    return p.nickname || p.date || p.place ? p : null;
  } catch { return null; }
}

/** Read the saved profile once after hydration and hand it to the form (no-op for a fresh user). */
export function useProfilePrefill(apply: (p: StoredProfile) => void) {
  useEffect(() => {
    let active = true;
    profileStore.get().then((p) => { if (active && p) apply(p); }).catch(() => {
      const p = readProfile();
      if (active && p) apply(p);
    });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Shape /api/readings accepts (date, place, coordinates, timezone required); undefined when incomplete. */
export function profileToBirthData(p: StoredProfile | null) {
  if (!p || !p.date || !p.place || p.latitude === undefined || p.longitude === undefined || !p.timezone) return undefined;
  return { date: p.date, time: p.timeUnknown || !p.time ? undefined : p.time, place: p.place, latitude: p.latitude, longitude: p.longitude, timezone: p.timezone };
}

/** A profile complete enough to skip onboarding: name + everything /api/readings needs. */
export function hasCompleteProfile() {
  const p = readProfile();
  return !!(p && p.nickname.trim() && profileToBirthData(p));
}

/**
 * Async store boundary. Today it is localStorage; later it can be swapped for an API-backed store
 * (e.g. Cognito-authenticated calls to API Gateway/Lambda/DynamoDB) without touching the pages.
 * The sync helpers above (readProfile/hasCompleteProfile) are a local fast path and should be
 * migrated to these methods when the backend lands.
 */
export interface ProfileStore {
  get(): Promise<StoredProfile | null>;
  save(p: Partial<StoredProfile>): Promise<void>;
  clear(): Promise<void>;
}

export const localProfileStore: ProfileStore = {
  async get() { return readProfile(); },
  async save(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...readProfile(), ...p })); },
  async clear() { localStorage.removeItem(PROFILE_KEY); },
};

const remoteEnabled = process.env.NEXT_PUBLIC_PROFILE_STORE === 'remote' || process.env.NEXT_PUBLIC_HISTORY_STORE === 'remote';

export const remoteProfileStore: ProfileStore = {
  async get() {
    const local = readProfile();
    try {
      const response = await fetch('/api/profile', { cache: 'no-store' });
      if (response.status === 401) return local;
      if (!response.ok) throw new Error('Profile unavailable');
      const data = await response.json() as { profile?: StoredProfile | null };
      if (!data.profile) {
        await localProfileStore.clear();
        return null;
      }
      await localProfileStore.save(data.profile);
      return data.profile;
    } catch {
      return local;
    }
  },
  async save(p) {
    await localProfileStore.save(p);
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(await localProfileStore.get()),
    });
    if (response.status === 401) return;
    if (!response.ok) throw new Error('Profile unavailable');
  },
  async clear() {
    await localProfileStore.clear();
  },
};

export const profileStore: ProfileStore = remoteEnabled ? remoteProfileStore : localProfileStore;

export async function isProfileComplete(store: ProfileStore = profileStore) {
  const p = await store.get();
  return !!(p && p.nickname.trim() && profileToBirthData(p));
}

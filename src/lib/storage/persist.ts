import type { StateStorage } from 'zustand/middleware';
import { STATE_VERSION, STORAGE_KEY, type GameState } from '@/types/game';
import { parseSavedState } from './migrate';

const SAVE_DEBOUNCE_MS = 150;

let persistenceEnabled = false;
let pending: { name: string; value: string } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function writeNow(name: string, value: string): void {
  try {
    safeStorage()?.setItem(name, value);
  } catch (e) {
    console.warn('Gagal menyimpan permainan:', e);
  }
}

/** Izinkan penulisan ke localStorage (setelah keputusan pemulihan diambil, agar data lama tidak tertimpa). */
export function setPersistenceEnabled(enabled: boolean): void {
  persistenceEnabled = enabled;
  if (!enabled) cancelPendingSave();
}

function cancelPendingSave(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
}

/** Tulis segera penyimpanan yang tertunda (dipanggil saat tab disembunyikan / unmount). */
export function flushPendingSave(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  if (pending && persistenceEnabled) writeNow(pending.name, pending.value);
  pending = null;
}

/** Storage kustom untuk zustand `persist`: aman (try/catch) dan debounce ±150 ms. */
export const gameStorage: StateStorage = {
  getItem: (name) => {
    try {
      return safeStorage()?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (!persistenceEnabled) return;
    pending = { name, value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(flushPendingSave, SAVE_DEBOUNCE_MS);
  },
  removeItem: (name) => {
    cancelPendingSave();
    try {
      safeStorage()?.removeItem(name);
    } catch (e) {
      console.warn('Gagal menghapus data tersimpan:', e);
    }
  },
};

export function clearSavedGame(): void {
  gameStorage.removeItem(STORAGE_KEY);
}

export interface RawEnvelope {
  state: unknown;
  version: number;
}

/**
 * Baca amplop tersimpan. Mendukung format zustand `{ state, version }` dan format asli (state mentah, v3).
 * Mengembalikan `null` bila kosong, `'corrupt'` bila JSON rusak.
 */
export function readEnvelope(text: string | null): RawEnvelope | null | 'corrupt' {
  if (text === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return 'corrupt';
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return 'corrupt';
  const rec = parsed as Record<string, unknown>;
  if ('state' in rec && typeof rec.version === 'number') {
    return { state: rec.state, version: rec.version };
  }
  const legacyVersion = typeof rec._version === 'number' ? rec._version : 3;
  return { state: rec, version: legacyVersion };
}

export type SavedInspection =
  | { kind: 'none' }
  | { kind: 'setup' }
  | { kind: 'resume'; state: GameState }
  | { kind: 'invalid' };

/** Periksa data tersimpan tanpa mengubah store. */
export function inspectSavedGame(): SavedInspection {
  const env = readEnvelope(gameStorage.getItem(STORAGE_KEY) as string | null);
  if (env === null) return { kind: 'none' };
  if (env === 'corrupt') return { kind: 'invalid' };
  const state = parseSavedState(env.state, env.version);
  if (!state) return { kind: 'invalid' };
  return state.phase === 'SETUP' ? { kind: 'setup' } : { kind: 'resume', state };
}

export { STATE_VERSION };

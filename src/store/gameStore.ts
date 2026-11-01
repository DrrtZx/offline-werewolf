import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { gameReducer, getInitialState } from '@/lib/engine/reducer';
import { cryptoRandomInt } from '@/lib/engine/rng';
import { gameStorage } from '@/lib/storage/persist';
import { migrateSaved, parseSavedState } from '@/lib/storage/migrate';
import { STATE_VERSION, STORAGE_KEY, type GameAction, type GameState } from '@/types/game';

/**
 * Store hanya berisi `GameState` (data). Pilihan sementara malam (`tempChoice`) sengaja TIDAK ada di sini
 * agar tidak pernah tersimpan ke localStorage.
 *
 * Hidrasi dilewati (`skipHydration`) dan dipicu manual setelah mount, supaya tidak ada hydration mismatch
 * dan pengguna bisa memilih lanjut / mulai baru lewat modal in-app.
 */
export const useGameStore = create<GameState>()(
  persist(() => getInitialState(), {
    name: STORAGE_KEY,
    version: STATE_VERSION,
    storage: createJSONStorage(() => gameStorage),
    skipHydration: true,
    migrate: (persisted, version) => migrateSaved(persisted, version),
    merge: (persisted, current) => parseSavedState(persisted, STATE_VERSION) ?? current,
  }),
);

/** Satu-satunya pintu mutasi state: reducer murni + RNG/waktu di-inject di sini. */
export function dispatch(action: GameAction): void {
  useGameStore.setState((s) => gameReducer(s, action, { rng: cryptoRandomInt, now: Date.now() }), true);
}

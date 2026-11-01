'use client';

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useIsPresent } from 'framer-motion';
import { useGameStore } from './gameStore';
import type { GameState } from '@/types/game';

const GameViewContext = createContext<GameState | null>(null);

/**
 * Menyediakan snapshot state untuk satu layar. Saat layar sedang animasi KELUAR (`AnimatePresence`),
 * snapshot dibekukan di nilai terakhir sehingga layar lama tidak ikut me-render state layar berikutnya
 * (mencegah glitch isi layar berganti sebelum fade-out selesai & render ganda yang mengacak ulang opsi).
 */
export function GameViewProvider({ children }: { children: ReactNode }) {
  const live = useGameStore((s) => s);
  const isPresent = useIsPresent();
  const frozen = useRef(live);
  if (isPresent) frozen.current = live;
  return <GameViewContext.Provider value={frozen.current}>{children}</GameViewContext.Provider>;
}

/** Selector atas snapshot layar saat ini (dipakai semua komponen fase). */
export function useGame<T>(selector: (state: GameState) => T): T {
  const state = useContext(GameViewContext);
  if (!state) throw new Error('useGame harus dipakai di dalam <GameViewProvider>.');
  return selector(state);
}

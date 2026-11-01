import { useGame } from '@/store/GameView';
import type { Player } from '@/types/game';

/** Pemain yang sedang mendapat giliran (role reveal / malam). */
export function useTurnPlayer(): Player | undefined {
  return useGame((s) => {
    const id = s.turnQueue[s.turnIndex];
    return id === undefined ? undefined : s.players.find((p) => p.id === id);
  });
}

import type { Player, Winner } from '@/types/game';

export function checkWinCondition(players: readonly Player[]): Winner | null {
  let wolvesAlive = 0;
  let nonWolvesAlive = 0;
  for (const p of players) {
    if (!p.isAlive) continue;
    if (p.role === 'werewolf') wolvesAlive++;
    else nonWolvesAlive++;
  }
  if (wolvesAlive === 0) return 'village';
  if (wolvesAlive >= nonWolvesAlive) return 'wolf';
  return null;
}

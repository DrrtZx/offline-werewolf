import type { NightActions, Player, RNG } from '@/types/game';
import { cryptoRandomInt } from './rng';

/** Hitung suara; jika seri, pilih acak lewat rng. Urutan kandidat mengikuti urutan penyisipan. */
export function tallyVotes(votes: Readonly<Record<string, string>>, rng: RNG = cryptoRandomInt): string | null {
  const counts = new Map<string, number>();
  for (const target of Object.values(votes)) {
    if (target) counts.set(target, (counts.get(target) ?? 0) + 1);
  }

  let max = 0;
  let candidates: string[] = [];
  for (const [id, count] of counts) {
    if (count > max) {
      max = count;
      candidates = [id];
    } else if (count === max) {
      candidates.push(id);
    }
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;
  return candidates[rng(0, candidates.length - 1)] ?? null;
}

export interface DawnResolution {
  players: Player[];
  deadPlayers: Player[];
  aimedTargetId: string | null;
  attackedId: string | null;
  wasProtected: boolean;
}

/** Murni: tidak memutasi `players`; mengembalikan daftar pemain baru. */
export function resolveDawn(
  players: readonly Player[],
  nightActions: NightActions,
  round: number,
  rng: RNG = cryptoRandomInt,
): DawnResolution {
  const attackedId = tallyVotes(nightActions.wolfVotes, rng);
  const aimedTargetId = tallyVotes(nightActions.hunterVotes, rng);

  const { doctorTarget, guardianTarget } = nightActions;
  const wasProtected = attackedId !== null && (doctorTarget === attackedId || guardianTarget === attackedId);

  const deadPlayers: Player[] = [];
  let nextPlayers = [...players];

  if (attackedId !== null && !wasProtected) {
    const victim = players.find((p) => p.id === attackedId);
    if (victim && victim.isAlive) {
      const dead: Player = { ...victim, isAlive: false, deathCause: 'wolf_attack', deathRound: round };
      deadPlayers.push(dead);
      nextPlayers = players.map((p) => (p.id === dead.id ? dead : p));
    }
  }

  return { players: nextPlayers, deadPlayers, aimedTargetId, attackedId, wasProtected };
}

/** Hunter yang mati masuk antrean tembakan. */
export function getHunterQueue(deadPlayers: readonly Player[]): string[] {
  return deadPlayers.filter((p) => p.role === 'hunter').map((p) => p.id);
}

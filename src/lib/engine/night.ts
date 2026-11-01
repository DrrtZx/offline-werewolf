import type { GameHistory, NightActionCard, NightActions, Player } from '@/types/game';
import { getQuizForTurn } from './quiz';
import { cryptoRandomInt } from './rng';
import type { RNG } from '@/types/game';

const HUNTER_SKIP_VOTE = 'hunter_skip_vote';

export interface NightCardContext {
  player: Player;
  players: readonly Player[];
  history: Pick<GameHistory, 'lastDoctorTarget' | 'doctorSelfUsed'>;
  nightActions: Pick<NightActions, 'doctorTarget' | 'wolfVotes' | 'hunterVotes'>;
  doctorSelfProtect: boolean;
  round: number;
  turnIndex: number;
}

/** Daftar opsi kartu aksi malam (belum diacak). Kartu yang tampil identik secara struktur untuk semua role. */
export function getNightActionCard(ctx: NightCardContext): NightActionCard {
  const { player, players, history, nightActions, doctorSelfProtect, round, turnIndex } = ctx;
  const living = players.filter((p) => p.isAlive);

  switch (player.role) {
    case 'werewolf':
      return {
        title: 'Pilih mangsa malam ini (suara tim terlihat)',
        options: withVoteCounts(
          living.filter((p) => p.role !== 'werewolf').map((p) => ({ id: p.id, label: p.name })),
          nightActions.wolfVotes,
        ),
      };
    case 'seer':
      return {
        title: 'Pilih pemain untuk diintip',
        options: living.filter((p) => p.id !== player.id).map((p) => ({ id: p.id, label: p.name })),
      };
    case 'doctor': {
      // Jika dokter sudah memilih dirinya malam ini (mis. setelah reload), pilihan diri tetap boleh diulang.
      const selfBlocked = history.doctorSelfUsed && nightActions.doctorTarget !== player.id;
      return {
        title: 'Pilih pemain untuk dilindungi',
        options: living.map((p) => {
          let disabled = false;
          let subtext = '';
          if (p.id === history.lastDoctorTarget) {
            disabled = true;
            subtext = ' (Tidak boleh sama 2 malam berturut-turut)';
          }
          if (p.id === player.id && !doctorSelfProtect) {
            disabled = true;
            subtext = ' (Lindungi diri dinonaktifkan)';
          } else if (p.id === player.id && selfBlocked) {
            disabled = true;
            subtext = ' (Batas lindungi diri sudah habis)';
          }
          return { id: p.id, label: p.name + subtext, disabled };
        }),
      };
    }
    case 'guardian':
      return {
        title: 'Pilih pemain untuk dilindungi (kebal)',
        options: living.map((p) => ({
          id: p.id,
          label: p.id === player.id ? `${p.name} (Lindungi Diri Sendiri)` : p.name,
        })),
      };
    case 'hunter':
      return {
        title: 'Pilih target bidikan siaga atau lewati pilihan',
        options: [
          ...withVoteCounts(
            living.filter((p) => p.id !== player.id).map((p) => ({ id: p.id, label: p.name })),
            nightActions.hunterVotes,
          ),
          { id: HUNTER_SKIP_VOTE, label: 'Skip Vote (Tidak memilih target)' },
        ],
      };
    case 'villager':
    default: {
      const quiz = getQuizForTurn(round, turnIndex);
      if (quiz.type === 'player') {
        return { title: quiz.q, options: living.map((p) => ({ id: p.id, label: p.name })) };
      }
      return { title: quiz.q, options: quiz.options.map((label, i) => ({ id: `opt_${i}`, label })) };
    }
  }
}

function withVoteCounts<T extends NightActionCard['options'][number]>(
  options: T[],
  votes: Record<string, string>,
): T[] {
  const counts = new Map<string, number>();
  for (const targetId of Object.values(votes)) counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  return options.map((option) => ({ ...option, voteCount: counts.get(option.id) ?? 0 }));
}

export function isValidNightChoice(card: NightActionCard, targetId: string): boolean {
  return card.options.some((o) => o.id === targetId && !o.disabled);
}

export interface SeerReading {
  targetName: string;
  isWolf: boolean;
}

export function getSeerReading(players: readonly Player[], targetId: string): SeerReading | null {
  const target = players.find((p) => p.id === targetId);
  if (!target) return null;
  return { targetName: target.name, isWolf: target.role === 'werewolf' };
}

/** Jeda acak layar NIGHT_CLOSING (ms), sama untuk semua role. */
export function generateClosingDelay(rng: RNG = cryptoRandomInt): number {
  return rng(300, 1800);
}

/** Terapkan pilihan malam sesuai role; mengembalikan objek baru (tanpa mutasi). */
export function applyNightChoice(
  player: Player,
  targetId: string,
  nightActions: NightActions,
  history: GameHistory,
): { nightActions: NightActions; history: GameHistory } {
  switch (player.role) {
    case 'werewolf':
      return {
        nightActions: { ...nightActions, wolfVotes: { ...nightActions.wolfVotes, [player.id]: targetId } },
        history,
      };
    case 'seer':
      return { nightActions: { ...nightActions, seerTarget: targetId }, history };
    case 'doctor': {
      let doctorSelfUsed = history.doctorSelfUsed;
      if (targetId === player.id) doctorSelfUsed = true;
      else if (nightActions.doctorTarget === player.id) doctorSelfUsed = false;
      return {
        nightActions: { ...nightActions, doctorTarget: targetId },
        history: { ...history, doctorSelfUsed },
      };
    }
    case 'guardian':
      return { nightActions: { ...nightActions, guardianTarget: targetId }, history };
    case 'hunter':
      if (targetId === HUNTER_SKIP_VOTE) {
        const hunterVotes = { ...nightActions.hunterVotes };
        delete hunterVotes[player.id];
        return { nightActions: { ...nightActions, hunterVotes }, history };
      }
      return {
        nightActions: {
          ...nightActions,
          hunterVotes: { ...nightActions.hunterVotes, [player.id]: targetId },
        },
        history,
      };
    case 'villager':
    default:
      return { nightActions, history };
  }
}

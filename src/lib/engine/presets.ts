import type { FinalRoles, PresetConfig, RNG, RoleConfig, RoleStatus } from '@/types/game';
import { cryptoRandomInt } from './rng';

export const PRESETS: Readonly<Record<number, PresetConfig>> = {
  4: { werewolf: 1, hunter: 0, seer: 'must', doctor: 'off', guardian: 'off' },
  5: { werewolf: 1, hunter: 0, seer: 'must', doctor: 'must', guardian: 'off' },
  6: { werewolf: 1, hunter: 1, seer: 'must', doctor: 'must', guardian: 'off' },
  7: { werewolf: 2, hunter: 1, seer: 'must', doctor: 'must', guardian: 'off' },
  8: { werewolf: 2, hunter: 1, seer: 'must', doctor: 'must', guardian: 'must' },
  9: { werewolf: 2, hunter: 1, seer: 'must', doctor: 'must', guardian: 'must' },
  10: { werewolf: 2, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  11: { werewolf: 3, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  12: { werewolf: 3, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  13: { werewolf: 3, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  14: { werewolf: 3, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  15: { werewolf: 4, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
  16: { werewolf: 4, hunter: 2, seer: 'must', doctor: 'must', guardian: 'must' },
};

const FALLBACK_PRESET: PresetConfig = { werewolf: 1, hunter: 1, seer: 'must', doctor: 'must', guardian: 'off' };

/** `PRESETS[N] || PRESETS[6]` */
export function getPreset(playerCount: number): PresetConfig {
  return PRESETS[playerCount] ?? PRESETS[6] ?? FALLBACK_PRESET;
}

export function maxWolvesFor(playerCount: number): number {
  return Math.min(5, Math.floor((playerCount - 1) / 2));
}

function statusToCount(status: RoleStatus, rng: RNG): number {
  if (status === 'must') return 1;
  if (status === 'random') return rng(0, 1);
  return 0;
}

export function calculateFinalRoles(
  playerCount: number,
  config: RoleConfig,
  rng: RNG = cryptoRandomInt,
): FinalRoles {
  const N = playerCount;
  const preset = getPreset(N);

  let wolfCount = config.werewolf === 'auto' ? preset.werewolf : Math.trunc(config.werewolf);
  let hunterCount = config.hunter === 'auto' ? preset.hunter : Math.trunc(config.hunter);

  wolfCount = Math.min(maxWolvesFor(N), Math.max(1, wolfCount));

  let seerCount = statusToCount(config.seer, rng);
  let doctorCount = statusToCount(config.doctor, rng);
  let guardianCount = statusToCount(config.guardian, rng);

  let occupied = wolfCount + hunterCount + seerCount + doctorCount + guardianCount;
  const maxOccupied = Math.max(0, N - 1);
  if (occupied > maxOccupied) {
    // Urutan pemangkasan: guardian -> doctor -> seer -> hunter
    if (guardianCount > 0 && occupied > maxOccupied) {
      guardianCount = 0;
      occupied--;
    }
    if (doctorCount > 0 && occupied > maxOccupied) {
      doctorCount = 0;
      occupied--;
    }
    if (seerCount > 0 && occupied > maxOccupied) {
      seerCount = 0;
      occupied--;
    }
    if (hunterCount > 0 && occupied > maxOccupied) {
      hunterCount = Math.max(0, N - wolfCount - 1);
    }
  }

  const villagerCount = Math.max(0, N - (wolfCount + hunterCount + seerCount + doctorCount + guardianCount));

  return {
    werewolf: wolfCount,
    hunter: hunterCount,
    seer: seerCount,
    doctor: doctorCount,
    guardian: guardianCount,
    villager: villagerCount,
  };
}

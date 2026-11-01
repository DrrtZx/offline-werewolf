import { calculateFinalRoles } from '@/lib/engine/presets';
import type { FinalRoles, Player, RoleConfig } from '@/types/game';

export interface RolePreview {
  /** Pratinjau stabil (mode "Acak" dihitung sebagai ada) agar tampilan tidak berkedip tiap render. */
  roles: FinalRoles;
  /** Rentang villager bila ada role berstatus Acak. */
  villagerMin: number;
  villagerMax: number;
}

export function previewRoles(players: readonly Player[], config: RoleConfig): RolePreview {
  const high = calculateFinalRoles(players.length, config, (_min, max) => max);
  const low = calculateFinalRoles(players.length, config, (min) => min);
  return {
    roles: high,
    villagerMin: Math.min(high.villager, low.villager),
    villagerMax: Math.max(high.villager, low.villager),
  };
}

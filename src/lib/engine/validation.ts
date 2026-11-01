import {
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type FinalRoles,
  type Player,
  type RNG,
  type RoleConfig,
} from '@/types/game';
import { calculateFinalRoles } from './presets';
import { cryptoRandomInt } from './rng';

export type SetupValidation =
  | { valid: false; message: string }
  | { valid: true; warning: string | null; roles: FinalRoles };

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function validateSetup(
  players: readonly Pick<Player, 'name'>[],
  config: RoleConfig,
  rng: RNG = cryptoRandomInt,
): SetupValidation {
  const N = players.length;
  if (N < MIN_PLAYERS) return { valid: false, message: 'Minimal butuh 4 pemain.' };
  if (N > MAX_PLAYERS) return { valid: false, message: 'Maksimal 16 pemain.' };

  const names = players.map((p) => normalizeName(p.name));
  if (new Set(names).size !== names.length) {
    return { valid: false, message: 'Nama setiap pemain harus unik!' };
  }

  const roles = calculateFinalRoles(N, config, rng);
  if (roles.werewolf < 1) return { valid: false, message: 'Minimal harus ada 1 Werewolf.' };
  if (roles.werewolf >= N - roles.werewolf) {
    return { valid: false, message: 'Jumlah Serigala harus lebih sedikit dari warga.' };
  }
  if (roles.villager < 1) return { valid: false, message: 'Minimal harus ada 1 Villager biasa.' };

  return { valid: true, warning: null, roles };
}

export type AddPlayerCheck = { ok: true; name: string } | { ok: false; message: string };

export function checkAddPlayer(players: readonly Pick<Player, 'name'>[], rawName: string): AddPlayerCheck {
  const name = rawName.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return { ok: false, message: 'Nama tidak boleh kosong.' };
  if (players.length >= MAX_PLAYERS) return { ok: false, message: 'Maksimal 16 pemain.' };
  const key = normalizeName(name);
  if (players.some((p) => normalizeName(p.name) === key)) {
    return { ok: false, message: 'Nama pemain sudah terdaftar!' };
  }
  return { ok: true, name };
}

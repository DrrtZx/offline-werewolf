import type { Role, RoleMeta } from '@/types/game';

export const ROLE_METAS: Record<Role, RoleMeta> = {
  werewolf: {
    name: 'Werewolf',
    icon: 'wolf',
    team: 'Serigala',
    tone: 'wolf',
    desc: 'Memangsa satu warga setiap malam bersama rekan Serigala.',
  },
  villager: {
    name: 'Villager',
    icon: 'house',
    team: 'Warga',
    tone: 'village',
    desc: 'Warga biasa tanpa kekuatan malam. Temukan Serigala saat siang!',
  },
  seer: {
    name: 'Seer',
    icon: 'eye',
    team: 'Warga',
    tone: 'special',
    desc: 'Menerawang 1 pemain setiap malam untuk mengetahui pihak mereka.',
  },
  doctor: {
    name: 'Doctor',
    icon: 'stethoscope',
    team: 'Warga',
    tone: 'special',
    desc: 'Melindungi 1 pemain dari serangan Werewolf setiap malam.',
  },
  guardian: {
    name: 'Guardian',
    icon: 'shield',
    team: 'Warga',
    tone: 'special',
    desc: 'Bisa melindungi 1 pemain atau diri sendiri agar kebal & selamat dari gigitan Werewolf.',
  },
  hunter: {
    name: 'Hunter',
    icon: 'bow',
    team: 'Warga',
    tone: 'special',
    desc: 'Jika gugur, berhak menembak satu pemain untuk ikut mati.',
  },
};

/** Urutan penyusunan pool role (sama dengan versi asli). */
export const POOL_ORDER: readonly Role[] = ['werewolf', 'hunter', 'seer', 'doctor', 'guardian', 'villager'];

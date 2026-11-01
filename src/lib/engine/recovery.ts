import type { GameState } from '@/types/game';

/**
 * Pulihkan state tersimpan ke layar aman agar tidak membocorkan kartu rahasia / pilihan malam:
 *  - NIGHT_ACTION / NIGHT_CLOSING -> NIGHT_HANDOVER (cover) milik pemain yang sama
 *  - ROLE_REVEAL step `card`      -> `cover`
 *  - HUNTER_TRIGGER step `action` -> cover privat
 */
export function recoverState(state: GameState): GameState {
  switch (state.phase) {
    case 'NIGHT_ACTION':
    case 'NIGHT_CLOSING':
      return { ...state, phase: 'NIGHT_HANDOVER', cardStep: 'cover', hunterStep: null };
    case 'ROLE_REVEAL':
      return state.cardStep === 'card' ? { ...state, cardStep: 'cover' } : state;
    case 'HUNTER_TRIGGER':
      if (state.hunterStep === 'action') return { ...state, hunterStep: 'cover' };
      return state;
    default:
      return state;
  }
}

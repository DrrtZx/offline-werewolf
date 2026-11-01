import type { GameState } from '@/types/game';

function winText(state: GameState): string | null {
  if (state.phase !== 'GAME_OVER') return null;
  return state.winner === 'wolf'
    ? 'Permainan selesai. Kubu Serigala menang!'
    : 'Permainan selesai. Kubu Warga menang!';
}

function hunterIntro(state: GameState): string | null {
  if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'public') return null;
  const hunter = state.players.find((p) => p.id === state.activeHunterShooterId);
  return hunter ? `${hunter.name} adalah Hunter. Dia berhak menembak satu orang.` : null;
}

/**
 * Teks narasi untuk transisi `prev -> next` (fungsi murni; TTS dijalankan di luar reducer).
 * Tidak pernah menyebut role pemain selama fase malam.
 */
export function narrate(prev: GameState, next: GameState): string | null {
  if (prev === next) return null;
  const parts: string[] = [];

  // Malam dimulai
  if (next.phase === 'NIGHT_INTRO' && prev.phase !== 'NIGHT_INTRO') {
    return 'Malam telah tiba. Semua pemain menundukkan kepala dan pejamkan mata.';
  }

  // Giliran malam berikutnya (bukan karena privacy blur)
  if (
    next.phase === 'NIGHT_HANDOVER' &&
    (prev.phase === 'NIGHT_INTRO' || prev.phase === 'NIGHT_CLOSING')
  ) {
    return 'Pemain berikutnya, silakan ambil HP.';
  }

  // Fajar
  if (prev.phase === 'NIGHT_CLOSING' && next.phase !== 'NIGHT_CLOSING' && next.phase !== 'NIGHT_HANDOVER') {
    const dead = next.dawnSummary?.deadPlayers ?? [];
    parts.push(
      dead.length === 0
        ? 'Fajar tiba. Malam ini, tidak ada korban.'
        : `Fajar tiba. ${dead.map((p) => p.name).join(' dan ')} ditemukan tewas.`,
    );
    const hunter = hunterIntro(next);
    if (hunter) parts.push(hunter);
    const win = winText(next);
    if (win) parts.push(win);
    return parts.join(' ');
  }

  // Siang dimulai
  if (prev.phase === 'DAWN_REPORT' && next.phase === 'DAY_PHASE') {
    return 'Selamat pagi. Saatnya berdiskusi dan menentukan siapa yang dicurigai.';
  }

  // Hasil voting siang
  if (prev.phase === 'DAY_PHASE' && next.phase !== 'DAY_PHASE') {
    if (next.dayEliminatedPlayer) {
      parts.push(`${next.dayEliminatedPlayer.name} dieliminasi oleh warga desa.`);
      const hunter = hunterIntro(next);
      if (hunter) parts.push(hunter);
      const win = winText(next);
      if (win) parts.push(win);
      return parts.join(' ');
    }
    return 'Pemilihan hari ini dilewati. Tidak ada pemain yang dieliminasi.';
  }

  // Hunter
  if (next.phase === 'HUNTER_TRIGGER') {
    if (next.hunterStep === 'closing' && prev.hunterStep === 'action') {
      const victim = next.players.find((p) => p.id === next.lastHunterVictimId);
      return victim ? `${victim.name} gugur oleh tembakan Hunter!` : null;
    }
    if (
      next.hunterStep === 'public' &&
      (prev.phase !== 'HUNTER_TRIGGER' || prev.activeHunterShooterId !== next.activeHunterShooterId)
    ) {
      return hunterIntro(next);
    }
  }

  // Permainan berakhir
  if (next.phase === 'GAME_OVER' && prev.phase !== 'GAME_OVER') return winText(next);

  return null;
}

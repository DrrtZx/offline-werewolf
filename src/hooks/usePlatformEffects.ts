import { useEffect } from 'react';
import { dispatch, useGameStore } from '@/store/gameStore';
import { narrate } from '@/lib/platform/narration';
import { activateNavGuard } from '@/lib/platform/navGuard';
import { activatePrivacyShield } from '@/lib/platform/privacyShield';
import { cancelSpeech, initTTS, speak } from '@/lib/platform/tts';
import { acquireWakeLock, releaseWakeLock, watchWakeLock } from '@/lib/platform/wakeLock';
import { flushPendingSave } from '@/lib/storage/persist';

/**
 * Semua efek samping platform dipasang di sini (bukan di reducer) dan selalu dibersihkan:
 * nav guard, TTS (+ voiceschanged), wake lock, privacy shield, narasi, flush penyimpanan.
 */
export function usePlatformEffects(ready: boolean): void {
  const phase = useGameStore((s) => s.phase);
  const inGame = phase !== 'SETUP' && phase !== 'GAME_OVER';

  // Anti-back guard
  useEffect(() => {
    if (!ready) return;
    return activateNavGuard();
  }, [ready]);

  // TTS: muat voice + batalkan suara saat unmount
  useEffect(() => {
    if (!ready) return;
    return initTTS();
  }, [ready]);

  // Narasi TTS bereaksi pada perubahan state (di luar reducer)
  useEffect(() => {
    if (!ready) return;
    return useGameStore.subscribe((next, prev) => {
      if (!next.settings.ttsEnabled) return;
      const text = narrate(prev, next);
      if (text) speak(text);
    });
  }, [ready]);

  // Screen Wake Lock selama permainan berlangsung; re-acquire saat tab kembali visible
  useEffect(() => {
    if (!ready) return;
    if (inGame) void acquireWakeLock();
    else void releaseWakeLock();
    return watchWakeLock(() => inGame);
  }, [ready, inGame]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
      cancelSpeech();
    };
  }, []);

  // Privacy Shield hanya aktif pada NIGHT_ACTION
  const shieldActive = phase === 'NIGHT_ACTION';
  useEffect(() => {
    if (!ready || !shieldActive) return;
    return activatePrivacyShield(() => dispatch({ type: 'PRIVACY_BLUR' }));
  }, [ready, shieldActive]);

  // Pastikan perubahan terakhir tertulis saat tab disembunyikan / halaman ditutup
  useEffect(() => {
    if (!ready) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushPendingSave();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushPendingSave);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushPendingSave);
      flushPendingSave();
    };
  }, [ready]);
}

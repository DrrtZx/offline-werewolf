let sentinel: WakeLockSentinel | null = null;

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function acquireWakeLock(): Promise<void> {
  if (!supported() || sentinel) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  try {
    const s = await navigator.wakeLock.request('screen');
    sentinel = s;
    s.addEventListener('release', () => {
      if (sentinel === s) sentinel = null;
    });
  } catch (e) {
    console.warn('Wake Lock tidak tersedia:', e);
  }
}

export async function releaseWakeLock(): Promise<void> {
  const s = sentinel;
  sentinel = null;
  if (!s) return;
  try {
    await s.release();
  } catch {
    /* sudah dilepas */
  }
}

/** Re-acquire saat tab kembali `visible` selama `isWanted()` bernilai true. Mengembalikan cleanup. */
export function watchWakeLock(isWanted: () => boolean): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible' && isWanted()) void acquireWakeLock();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}

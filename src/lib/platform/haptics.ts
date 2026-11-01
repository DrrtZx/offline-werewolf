/** Getar singkat; aman jika tidak didukung (mis. iOS Safari). */
export function vibrate(ms = 10): void {
  if (typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* diabaikan */
  }
}

/**
 * Privacy Shield: panggil `onBreach` saat tab disembunyikan atau window kehilangan fokus.
 * Hanya dipasang selama fase NIGHT_ACTION; mengembalikan cleanup.
 */
export function activatePrivacyShield(onBreach: () => void): () => void {
  const onVisibility = () => {
    if (document.hidden) onBreach();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBreach);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('blur', onBreach);
  };
}

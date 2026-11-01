/** Anti-back guard: setiap `popstate` didorong kembali agar tombol Back tidak keluar dari game. */
export function activateNavGuard(): () => void {
  const push = () => window.history.pushState(null, '', window.location.href);
  push();
  window.addEventListener('popstate', push);
  return () => window.removeEventListener('popstate', push);
}

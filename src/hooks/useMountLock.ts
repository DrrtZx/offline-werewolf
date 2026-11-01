import { useEffect, useState } from 'react';

/**
 * `true` selama `ms` setelah mount. Dipakai pada layar yang muncul tepat setelah tombol TAP
 * agar ghost click / double-tap tidak langsung menekan kontrol di layar berikutnya.
 */
export function useMountLock(ms = 400): boolean {
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setLocked(false), ms);
    return () => clearTimeout(id);
  }, [ms]);
  return locked;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { vibrate } from '@/lib/platform/haptics';

export const TAP_LOCK_MS = 400;

interface TapButtonProps {
  label: string;
  onTap: () => void;
  /** Lama tombol dikunci setelah tap (mencegah double-tap / ghost click). */
  lockMs?: number;
}

/**
 * Tombol TAP biasa (pengganti tombol tekan-tahan).
 * - memakai `onClick` (bukan pointerdown/touchstart) sehingga scroll/swipe tidak memicu aksi
 * - tanpa interval / progress / listener window
 * - terkunci ±400 ms setelah tap
 */
export default function TapButton({ label, onTap, lockMs = TAP_LOCK_MS }: TapButtonProps) {
  const lockedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);
  const [ripple, setRipple] = useState(0);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  const handleClick = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    setRipple((n) => n + 1);
    vibrate(10);
    timeoutRef.current = setTimeout(() => {
      lockedRef.current = false;
      setLocked(false);
    }, lockMs);
    onTap();
  }, [lockMs, onTap]);

  return (
    <m.button
      type="button"
      className="tap-btn"
      aria-disabled={locked}
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
    >
      {ripple > 0 && (
        <m.span
          key={ripple}
          className="tap-ripple"
          aria-hidden="true"
          initial={{ scale: 0, opacity: 0.7 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
      <span>{label}</span>
    </m.button>
  );
}

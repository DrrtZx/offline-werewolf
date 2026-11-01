'use client';

import { useEffect, useRef } from 'react';
import { m } from 'framer-motion';

interface TimerBarProps {
  durationMs: number;
  onComplete: () => void;
}

/** Bar timer minimum malam. Animasi hanya `transform`; selesai lewat satu timeout dengan cleanup. */
export default function TimerBar({ durationMs, onComplete }: TimerBarProps) {
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const id = setTimeout(() => onCompleteRef.current(), durationMs);
    return () => clearTimeout(id);
  }, [durationMs]);

  return (
    <div className="timer-track" role="presentation">
      <m.div
        className="timer-fill"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: durationMs / 1000, ease: 'linear' }}
      />
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { m } from 'framer-motion';
import { useMountLock } from '@/hooks/useMountLock';

type Variant = 'primary' | 'secondary' | 'danger' | 'skip';

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: Variant;
  disabled?: boolean;
  small?: boolean;
  className?: string;
  /** Nonaktif selama N ms setelah mount (anti ghost-click setelah tombol TAP). */
  lockOnMountMs?: number;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  small = false,
  className = '',
  lockOnMountMs = 0,
}: ButtonProps) {
  const mountLocked = useMountLock(lockOnMountMs);
  const isDisabled = disabled || (lockOnMountMs > 0 && mountLocked);
  return (
    <m.button
      type="button"
      className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${className}`}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
    >
      {children}
    </m.button>
  );
}

'use client';

import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';

interface OptionListProps {
  label: string;
  children: ReactNode;
  /** `radio` = radiogroup (pilihan tunggal), `list` = daftar tombol biasa. */
  kind?: 'radio' | 'list';
  className?: string;
}

/** Daftar dengan stagger masuk (stagger nonaktif saat reduced-motion). */
export function OptionList({ label, children, kind = 'radio', className = '' }: OptionListProps) {
  const reduce = useReducedMotion();
  return (
    <m.div
      role={kind === 'radio' ? 'radiogroup' : 'list'}
      aria-label={label}
      className={`flex flex-col gap-2.5 ${className}`}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.045 } } }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ children, role }: { children: ReactNode; role?: 'listitem' }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      role={role}
      variants={
        reduce
          ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
          : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }
      }
    >
      {children}
    </m.div>
  );
}

interface PlayerOptionProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'danger';
}

export function PlayerOption({ label, selected, onSelect, disabled = false, tone = 'accent' }: PlayerOptionProps) {
  return (
    <StaggerItem>
      <m.button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        className={`option ${tone === 'danger' ? 'option-danger' : ''}`}
        onClick={onSelect}
        whileTap={disabled ? undefined : { scale: 0.98 }}
      >
        <span>{label}</span>
        <span className="radio" aria-hidden="true">
          {selected && (
            <m.span
              className="radio-dot"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 28 }}
            />
          )}
        </span>
      </m.button>
    </StaggerItem>
  );
}

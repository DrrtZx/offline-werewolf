'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { EASE } from '@/lib/ui/motion';

interface ModalProps {
  open: boolean;
  /** Id elemen judul di dalam `children` (untuk aria-labelledby). */
  titleId: string;
  /** Dipanggil saat Esc ditekan. Jika kosong, Esc diabaikan (modal wajib dijawab). */
  onClose?: () => void;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ModalBody({ titleId, onClose, children }: Omit<ModalProps, 'open'>) {
  const boxRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const reduce = useReducedMotion();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const box = boxRef.current;
    box?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !box) return;
      const items = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === firstEl || active === box)) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <m.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <m.div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="surface modal-box"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.22, ease: EASE }}
      >
        {children}
      </m.div>
    </m.div>
  );
}

/** Komponen modal tunggal untuk semua dialog (Seer, survei Villager, konfirmasi, pemulihan). */
export default function Modal({ open, titleId, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <ModalBody key="modal" titleId={titleId} onClose={onClose}>
          {children}
        </ModalBody>
      )}
    </AnimatePresence>
  );
}

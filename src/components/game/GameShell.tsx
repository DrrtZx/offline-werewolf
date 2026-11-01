'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion';
import { dispatch, useGameStore } from '@/store/gameStore';
import { GameViewProvider } from '@/store/GameView';
import { usePlatformEffects } from '@/hooks/usePlatformEffects';
import { useScreenMotion } from '@/lib/ui/motion';
import { cancelSpeech, speak } from '@/lib/platform/tts';
import { clearSavedGame, inspectSavedGame, setPersistenceEnabled } from '@/lib/storage/persist';
import { Icon, IconGlyph } from '@/components/icons/Icon';
import type { Phase } from '@/types/game';
import Button from './Button';
import Modal from './Modal';
import PhaseRouter from './PhaseRouter';

type Scene = 'dusk' | 'night' | 'dawn' | 'day';

const NIGHT_PHASES: readonly Phase[] = ['NIGHT_INTRO', 'NIGHT_HANDOVER', 'NIGHT_ACTION', 'NIGHT_CLOSING'];

function sceneFor(phase: Phase): Scene {
  if (NIGHT_PHASES.includes(phase)) return 'night';
  if (phase === 'DAWN_REPORT') return 'dawn';
  if (phase === 'DAY_PHASE' || phase === 'DAY_RESULT') return 'day';
  return 'dusk';
}

type Boot =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'prompt'; kind: 'resume' | 'invalid' };

function BootSkeleton() {
  return (
    <div className="game-container" aria-busy="true" aria-label="Memuat permainan">
      <div className="skeleton mt-6 h-24" />
      <div className="skeleton mt-4 h-48" />
    </div>
  );
}

function TtsToggle() {
  const enabled = useGameStore((s) => s.settings.ttsEnabled);
  const toggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_SETTING', key: 'ttsEnabled' });
    if (useGameStore.getState().settings.ttsEnabled) speak('Suara narator diaktifkan.');
    else cancelSpeech();
  }, []);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 text-[0.82rem] font-bold"
      style={{ opacity: enabled ? 1 : 0.7 }}
    >
      <Icon name={enabled ? 'speaker-on' : 'speaker-off'} size={18} />
      <span>{enabled ? 'Suara: ON' : 'Suara: BISU'}</span>
    </button>
  );
}

function ScreenHost() {
  const screenKey = useGameStore((s) => `${s.phase}|${s.cardStep ?? s.hunterStep ?? ''}|${s.phase === 'SETUP' ? '' : s.turnIndex}`);
  const motion = useScreenMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={screenKey}
        className="flex flex-1 flex-col"
        initial={motion.initial}
        animate={motion.animate}
        exit={motion.exit}
        transition={motion.transition}
      >
        <GameViewProvider>
          <PhaseRouter />
        </GameViewProvider>
      </m.div>
    </AnimatePresence>
  );
}

function RecoveryModal({ kind, onResume, onFresh }: { kind: 'resume' | 'invalid'; onResume: () => void; onFresh: () => void }) {
  return (
    <Modal open titleId="recovery-title">
      <div className="mb-3 text-accent">
        <IconGlyph name={kind === 'resume' ? 'gamepad' : 'warning'} size={48} />
      </div>
      <h2 id="recovery-title" className="mb-2 text-xl">
        {kind === 'resume' ? 'Lanjutkan Permainan?' : 'Data Tersimpan Tidak Dapat Dipakai'}
      </h2>
      <p className="mb-6 text-[0.95rem] leading-relaxed text-muted">
        {kind === 'resume'
          ? 'Ditemukan permainan yang sedang berlangsung. Kartu rahasia tidak akan terbuka otomatis saat dilanjutkan.'
          : 'Data permainan sebelumnya rusak atau berasal dari versi yang tidak dikenal. Mulai permainan baru?'}
      </p>
      <div className="flex flex-col gap-2.5">
        {kind === 'resume' && <Button onClick={onResume}>Ya, Lanjutkan</Button>}
        <Button variant={kind === 'resume' ? 'secondary' : 'primary'} onClick={onFresh}>
          Mulai Baru
        </Button>
      </div>
    </Modal>
  );
}

export default function GameShell() {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });
  const phase = useGameStore((s) => s.phase);
  const ready = boot.status === 'ready';

  // Baca localStorage hanya setelah mount (tanpa hydration mismatch)
  useEffect(() => {
    let cancelled = false;
    const inspection = inspectSavedGame();

    if (inspection.kind === 'resume' || inspection.kind === 'invalid') {
      setBoot({ status: 'prompt', kind: inspection.kind });
      return;
    }

    const start = async () => {
      if (inspection.kind === 'setup') await useGameStore.persist.rehydrate();
      if (cancelled) return;
      setPersistenceEnabled(true);
      setBoot({ status: 'ready' });
    };
    void start();

    return () => {
      cancelled = true;
    };
  }, []);

  usePlatformEffects(ready);

  const resume = useCallback(async () => {
    await useGameStore.persist.rehydrate();
    setPersistenceEnabled(true);
    setBoot({ status: 'ready' });
  }, []);

  const startFresh = useCallback(() => {
    clearSavedGame();
    dispatch({ type: 'RESET_GAME', fullReset: true });
    setPersistenceEnabled(true);
    setBoot({ status: 'ready' });
  }, []);

  const scene = sceneFor(phase);
  const theme = NIGHT_PHASES.includes(phase) ? 'night' : 'dusk';

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="game-root" data-theme={theme}>
        {(['dusk', 'night', 'dawn', 'day'] as const).map((s) => (
          <div key={s} className={`scene scene-${s}`} data-active={scene === s} aria-hidden="true" />
        ))}

        <header className="top-bar">
          <div className="flex items-center gap-2 text-[1.05rem] font-bold tracking-tight">
            <IconGlyph name="wolf" size={24} />
            <span className="brand-text">WEREWOLF</span>
          </div>
          {ready && <TtsToggle />}
        </header>

        <main className="game-container">
          {boot.status === 'loading' && <BootSkeleton />}
          {ready && <ScreenHost />}
        </main>

        {boot.status === 'prompt' && <RecoveryModal kind={boot.kind} onResume={resume} onFresh={startFresh} />}
      </div>
    </LazyMotion>
  );
}

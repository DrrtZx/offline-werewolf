'use client';

import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import type { SetupStep } from '@/types/game';
import SetupPlayers from './SetupPlayers';

const SetupRoles = dynamic(() => import('./SetupRoles'));
const SetupSettings = dynamic(() => import('./SetupSettings'));
const SetupSummary = dynamic(() => import('./SetupSummary'));

const TABS: readonly { step: SetupStep; label: (n: number) => string }[] = [
  { step: 'players', label: (n) => `1. Pemain (${n})` },
  { step: 'roles', label: () => '2. Role' },
  { step: 'settings', label: () => '3. Opsi' },
  { step: 'summary', label: () => '4. Mulai' },
];

export default function Setup() {
  const step = useGame((s) => s.setupStep);
  const count = useGame((s) => s.players.length);

  return (
    <div className="flex flex-col gap-4">
      <div className="tab-list" role="tablist" aria-label="Langkah pengaturan">
        {TABS.map((t) => (
          <button
            key={t.step}
            type="button"
            role="tab"
            id={`tab-${t.step}`}
            aria-selected={step === t.step}
            aria-controls="setup-panel"
            className="tab"
            onClick={() => dispatch({ type: 'SETUP_STEP', step: t.step })}
          >
            {t.label(count)}
          </button>
        ))}
      </div>

      <m.div
        key={step}
        id="setup-panel"
        role="tabpanel"
        aria-labelledby={`tab-${step}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {step === 'players' && <SetupPlayers />}
        {step === 'roles' && <SetupRoles />}
        {step === 'settings' && <SetupSettings />}
        {step === 'summary' && <SetupSummary />}
      </m.div>
    </div>
  );
}

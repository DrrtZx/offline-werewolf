'use client';

import dynamic from 'next/dynamic';
import { useGame } from '@/store/GameView';

function PhaseLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 pt-6" aria-busy="true" aria-label="Memuat layar">
      <div className="skeleton h-28" />
      <div className="skeleton h-44" />
    </div>
  );
}

const loading = () => <PhaseLoading />;

// Setiap fase dipisah menjadi chunk sendiri agar tidak semua dimuat sekaligus.
const SetupPhase = dynamic(() => import('@/components/phases/Setup'), { loading });
const RoleRevealPhase = dynamic(() => import('@/components/phases/RoleReveal'), { loading });
const NightIntroPhase = dynamic(() => import('@/components/phases/NightIntro'), { loading });
const NightCyclePhase = dynamic(() => import('@/components/phases/NightCycle'), { loading });
const DawnReportPhase = dynamic(() => import('@/components/phases/DawnReport'), { loading });
const HunterShotPhase = dynamic(() => import('@/components/phases/HunterShot'), { loading });
const DayPhase = dynamic(() => import('@/components/phases/DayPhase'), { loading });
const DayResultPhase = dynamic(() => import('@/components/phases/DayResult'), { loading });
const GameOverPhase = dynamic(() => import('@/components/phases/GameOver'), { loading });

export default function PhaseRouter() {
  const phase = useGame((s) => s.phase);

  switch (phase) {
    case 'SETUP':
      return <SetupPhase />;
    case 'ROLE_REVEAL':
      return <RoleRevealPhase />;
    case 'NIGHT_INTRO':
      return <NightIntroPhase />;
    case 'NIGHT_HANDOVER':
    case 'NIGHT_ACTION':
    case 'NIGHT_CLOSING':
      return <NightCyclePhase />;
    case 'DAWN_REPORT':
      return <DawnReportPhase />;
    case 'HUNTER_TRIGGER':
      return <HunterShotPhase />;
    case 'DAY_PHASE':
      return <DayPhase />;
    case 'DAY_RESULT':
      return <DayResultPhase />;
    case 'GAME_OVER':
      return <GameOverPhase />;
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

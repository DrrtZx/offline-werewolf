'use client';

import { m, useReducedMotion } from 'framer-motion';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { useTurnPlayer } from '@/hooks/useTurnPlayer';
import { useMountLock } from '@/hooks/useMountLock';
import { ROLE_METAS } from '@/lib/engine/roles';
import { EASE } from '@/lib/ui/motion';
import Button from '@/components/game/Button';
import TapButton from '@/components/game/TapButton';
import { Alert, BigIcon, Badge, Card, PlayerNameBlock } from '@/components/game/ui';
import type { Player } from '@/types/game';

function Cover({ player }: { player: Player }) {
  return (
    <Card className="mt-8 px-5 py-9 text-center">
      <BigIcon size="3rem">✉️</BigIcon>
      <h2 className="mb-2 text-xl">Pembagian Kartu Rahasia</h2>
      <p className="text-muted">Silakan berikan HP ini secara privat kepada:</p>
      <PlayerNameBlock name={player.name} />
      <div className="mb-3 mt-6">
        <TapButton label={`Saya ${player.name} — Buka Kartu`} onTap={() => dispatch({ type: 'REVEAL_OPEN' })} />
      </div>
      <p className="text-[0.8rem] text-muted">Ketuk tombol untuk membuka.</p>
    </Card>
  );
}

function RoleCard({ player }: { player: Player }) {
  const reduce = useReducedMotion();
  const players = useGame((s) => s.players);
  const showWolfTeam = useGame((s) => s.settings.showWolfTeam);
  const showHunterTeam = useGame((s) => s.settings.showHunterTeam);
  const closeLocked = useMountLock(400);

  if (!player.role) return null;
  const meta = ROLE_METAS[player.role];

  let teammates: { label: string; names: string[]; tone: 'warning' | 'info'; icon: string } | null = null;
  if (player.role === 'werewolf' && showWolfTeam) {
    const names = players.filter((p) => p.role === 'werewolf' && p.id !== player.id).map((p) => p.name);
    if (names.length > 0) teammates = { label: 'Rekan Serigalamu:', names, tone: 'warning', icon: '🐺' };
  } else if (player.role === 'hunter' && showHunterTeam) {
    const names = players.filter((p) => p.role === 'hunter' && p.id !== player.id).map((p) => p.name);
    if (names.length > 0) teammates = { label: 'Rekan Hunter:', names, tone: 'info', icon: '🏹' };
  }

  return (
    <div style={{ perspective: 900 }} className="mt-3">
      <m.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <Card tone={meta.tone} className="px-5 py-7 text-center">
          <BigIcon size="4.5rem">{meta.icon}</BigIcon>
          <div className="mb-2">
            <Badge tone={meta.tone}>{meta.team}</Badge>
          </div>
          <h1 className="mb-0 text-3xl text-white">{meta.name}</h1>
          <p className="mx-0 my-4 leading-relaxed text-muted">{meta.desc}</p>
          {teammates && (
            <Alert tone={teammates.tone} className="mb-4 justify-center text-center">
              <div>
                <strong>{teammates.label}</strong>
                <br />
                {teammates.names.map((n) => `${teammates.icon} ${n}`).join(', ')}
              </div>
            </Alert>
          )}
          <Button disabled={closeLocked} onClick={() => dispatch({ type: 'REVEAL_CLOSE' })}>
            Tutup &amp; Lanjutkan
          </Button>
        </Card>
      </m.div>
    </div>
  );
}

function Closing() {
  return (
    <Card className="mt-8 px-5 py-9 text-center">
      <BigIcon size="3rem">🔒</BigIcon>
      <h2 className="mb-2 text-xl">Kartu Ditutup</h2>
      <p className="mb-5 text-muted">Identitasmu aman. Jangan beri tahu siapa pun!</p>
      <Button lockOnMountMs={400} onClick={() => dispatch({ type: 'REVEAL_NEXT' })}>
        Serahkan ke Pemain Berikutnya
      </Button>
    </Card>
  );
}

export default function RoleReveal() {
  const step = useGame((s) => s.cardStep);
  const player = useTurnPlayer();
  if (!player) return null;

  if (step === 'card') return <RoleCard player={player} />;
  if (step === 'closing') return <Closing />;
  return <Cover player={player} />;
}

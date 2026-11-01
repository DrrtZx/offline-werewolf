'use client';

import { useState } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { useMountLock } from '@/hooks/useMountLock';
import Button from '@/components/game/Button';
import { OptionList, PlayerOption } from '@/components/game/PlayerOption';
import TapButton from '@/components/game/TapButton';
import { Alert, Badge, BigIcon, Card, PlayerNameBlock } from '@/components/game/ui';
import type { Player } from '@/types/game';

function Public({ hunter }: { hunter: Player }) {
  return (
    <Card tone="special" className="mt-8 px-5 py-8 text-center" live>
      <BigIcon>🏹</BigIcon>
      <div className="mb-2">
        <Badge tone="special">Tembakan Terakhir</Badge>
      </div>
      <h1 className="mb-0 break-words text-3xl text-white">{hunter.name} adalah Hunter!</h1>
      <p className="mx-0 mb-6 mt-4 text-[1.05rem] leading-relaxed text-muted">
        Sebelum menghembuskan napas terakhir, Hunter berhak menembak mati 1 pemain pilihannya!
      </p>
      <Button lockOnMountMs={400} onClick={() => dispatch({ type: 'HUNTER_PUBLIC_NEXT' })}>
        Serahkan HP ke {hunter.name}
      </Button>
    </Card>
  );
}

function Cover({ hunter }: { hunter: Player }) {
  return (
    <Card className="mt-8 px-5 py-9 text-center">
      <BigIcon size="3rem">🎯</BigIcon>
      <h2 className="mb-2 text-xl">Bidikan Hunter</h2>
      <p className="text-muted">Silakan berikan HP ini secara privat kepada:</p>
      <PlayerNameBlock name={hunter.name} />
      <div className="mb-3 mt-6">
        <TapButton label={`Saya ${hunter.name} — Bidik`} onTap={() => dispatch({ type: 'HUNTER_COVER_OPEN' })} />
      </div>
      <p className="text-[0.8rem] text-muted">Ketuk tombol untuk membuka.</p>
    </Card>
  );
}

function Action({ hunter }: { hunter: Player }) {
  const players = useGame((s) => s.players);
  const aimedTargetId = useGame((s) => s.aimedTargetId);
  const targets = players.filter((p) => p.isAlive && p.id !== hunter.id);
  const locked = useMountLock(400);

  // Target siaga malam dipilih otomatis (hanya bila masih hidup), tetapi bisa diubah.
  const [choice, setChoice] = useState<string | null>(() =>
    aimedTargetId !== null && targets.some((t) => t.id === aimedTargetId) ? aimedTargetId : null,
  );

  return (
    <Card className="mt-2">
      <h2 className="mb-1 text-xl">Pilih Sasaran Tembakan</h2>
      <p className="mb-4 text-muted">Pemain yang kamu pilih akan langsung gugur seketika.</p>

      {aimedTargetId && (
        <Alert tone="info" className="mb-4">
          🎯 Target Siaga malam telah terpilih otomatis (dapat diubah).
        </Alert>
      )}

      <OptionList label="Sasaran tembakan">
        {targets.map((t) => (
          <PlayerOption
            key={t.id}
            label={t.name}
            tone="danger"
            selected={choice === t.id}
            disabled={locked}
            onSelect={() => setChoice(t.id)}
          />
        ))}
      </OptionList>

      <div className="mt-5">
        <Button
          variant="danger"
          disabled={choice === null}
          onClick={() => choice && dispatch({ type: 'HUNTER_CONFIRM', targetId: choice })}
        >
          Tembak Sekarang!
        </Button>
      </div>
    </Card>
  );
}

function Closing() {
  const victimName = useGame((s) => s.players.find((p) => p.id === s.lastHunterVictimId)?.name);
  return (
    <Card className="mt-8 px-5 py-8 text-center" live>
      <BigIcon>💥</BigIcon>
      <h2 className="mb-2 text-xl">Tembakan Dilepaskan!</h2>
      <div className="my-4 break-words text-2xl font-bold text-danger">{victimName ?? 'Seorang pemain'} tertembak gugur!</div>
      <p className="mb-5 text-muted">Diumumkan ke seluruh warga desa.</p>
      <Button lockOnMountMs={400} onClick={() => dispatch({ type: 'HUNTER_DONE' })}>
        Lanjutkan
      </Button>
    </Card>
  );
}

export default function HunterShot() {
  const step = useGame((s) => s.hunterStep);
  const hunter = useGame((s) => s.players.find((p) => p.id === s.activeHunterShooterId));
  if (!hunter) return null;

  if (step === 'cover') return <Cover hunter={hunter} />;
  if (step === 'action') return <Action hunter={hunter} />;
  if (step === 'closing') return <Closing />;
  return <Public hunter={hunter} />;
}

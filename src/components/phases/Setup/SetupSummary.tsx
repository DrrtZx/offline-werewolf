'use client';

import { useMemo } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { validateSetup } from '@/lib/engine/validation';
import Button from '@/components/game/Button';
import { Alert, Card } from '@/components/game/ui';

export default function SetupSummary() {
  const players = useGame((s) => s.players);
  const config = useGame((s) => s.roleConfig);
  const N = players.length;

  // Pratinjau konservatif (role "Acak" dihitung ada); pembagian sebenarnya memakai crypto RNG saat mulai.
  const result = useMemo(() => validateSetup(players, config, (_min, max) => max), [players, config]);
  const wolves = result.valid ? result.roles.werewolf : 0;

  return (
    <Card>
      <h3 className="mb-1 text-lg">Ringkasan Permainan</h3>
      <p className="mb-4 text-[0.95rem] text-muted">Siap bermain dengan 1 HP bergilir!</p>

      <Alert tone="info" className="mb-4">
        <div>
          <strong>{N} Pemain Terdaftar</strong>
          <br />
          <span aria-hidden="true">🐺</span> <strong>{wolves} Serigala</strong> vs <span aria-hidden="true">🏡</span>{' '}
          <strong>{N - wolves} Warga</strong>
        </div>
      </Alert>

      <div className="surface-inset mb-4 px-3.5 py-2.5 text-center text-[0.8rem] leading-relaxed text-muted">
        🛡️ <strong>Anti-Bocor Aktif:</strong> Urutan malam diacak, ada Dummy Quiz untuk Villager, dan voting siang
        instan tanpa oper HP satu-satu.
      </div>

      {!result.valid && (
        <Alert tone="danger" className="mb-4">
          <span role="alert">⛔ {result.message}</span>
        </Alert>
      )}
      {result.valid && result.warning && (
        <Alert tone="warning" className="mb-4">
          ⚠️ {result.warning}
        </Alert>
      )}

      <Button disabled={!result.valid} className="!min-h-[58px] !text-lg" onClick={() => dispatch({ type: 'START_GAME' })}>
        🚀 Mulai Permainan
      </Button>
    </Card>
  );
}

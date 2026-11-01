'use client';

import { useMemo } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { validateSetup } from '@/lib/engine/validation';
import Button from '@/components/game/Button';
import { Alert, Card } from '@/components/game/ui';
import { Icon } from '@/components/icons/Icon';

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
          <div className="mt-1 flex items-center gap-1.5">
            <Icon name="wolf" size={15} className="text-wolf flex-none" /> <strong>{wolves} Serigala</strong>
            <span className="text-muted">
              <em>vs</em>
            </span>
            <Icon name="house" size={15} className="text-village flex-none" /> <strong>{N - wolves} Warga</strong>
          </div>
        </div>
      </Alert>

      <div className="surface-inset mb-4 px-3.5 py-2.5 text-center text-[0.8rem] leading-relaxed text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="shield" size={14} /> <strong>Anti-Bocor Aktif:</strong>
        </span>{' '}
        Urutan malam diacak, ada Dummy Quiz untuk Villager, dan voting siang
        instan tanpa oper HP satu-satu.
      </div>

      {!result.valid && (
        <Alert tone="danger" className="mb-4">
          <span role="alert" className="flex items-start gap-2">
            <Icon name="warning" size={16} className="mt-0.5 flex-none" /> {result.message}
          </span>
        </Alert>
      )}
      {result.valid && result.warning && (
        <Alert tone="warning" className="mb-4">
          <span className="flex items-start gap-2">
            <Icon name="warning" size={16} className="mt-0.5 flex-none" /> {result.warning}
          </span>
        </Alert>
      )}

      <Button disabled={!result.valid} className="!min-h-[58px] !text-lg" onClick={() => dispatch({ type: 'START_GAME' })}>
        <Icon name="rocket" size={18} /> Mulai Permainan
      </Button>
    </Card>
  );
}

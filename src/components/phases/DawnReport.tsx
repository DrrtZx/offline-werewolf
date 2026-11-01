'use client';

import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { ROLE_METAS } from '@/lib/engine/roles';
import Button from '@/components/game/Button';
import { Alert, BigIcon, Card } from '@/components/game/ui';

export default function DawnReport() {
  const dead = useGame((s) => s.dawnSummary?.deadPlayers);
  const reveal = useGame((s) => s.settings.revealDeadRole);
  const victims = dead ?? [];

  return (
    <Card className="mt-6 text-center" live>
      <BigIcon name="dawn" size={40} />
      <h1 className="mb-2 text-3xl">Fajar Menyingsing</h1>
      <p className="mb-4 text-muted">Matahari telah terbit. Semua pemain silakan membuka mata!</p>

      {victims.length === 0 ? (
        <Alert tone="info" className="flex-col items-center p-6 text-center">
          <BigIcon name="dove" size={34} />
          <h3 className="text-lg text-white">Malam Tenang</h3>
          <p className="text-muted">Malam ini tidak ada korban yang gugur!</p>
        </Alert>
      ) : (
        <Alert tone="danger" className="flex-col items-center p-5 text-center">
          <BigIcon name="coffin" size={34} />
          <h3 className="text-lg text-white">Korban Malam Ini:</h3>
          <div className="my-2 break-words text-2xl font-bold text-white">
            {victims
              .map((p) => (reveal && p.role ? `${p.name} (${ROLE_METAS[p.role].name})` : p.name))
              .join(', ')}
          </div>
          <p className="text-muted">Telah gugur dan tidak dapat berbicara lagi.</p>
        </Alert>
      )}

      <div className="mt-5">
        <Button className="!min-h-[56px]" lockOnMountMs={400} onClick={() => dispatch({ type: 'DAWN_CONTINUE' })}>
          Mulai Diskusi &amp; Voting Siang
        </Button>
      </div>
    </Card>
  );
}

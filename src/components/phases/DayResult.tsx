'use client';

import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { ROLE_METAS } from '@/lib/engine/roles';
import Button from '@/components/game/Button';
import { Alert, BigIcon, Card } from '@/components/game/ui';

export default function DayResult() {
  const eliminated = useGame((s) => s.dayEliminatedPlayer);
  const reveal = useGame((s) => s.settings.revealDeadRole);

  return (
    <Card className="mt-6 text-center" live>
      <h2 className="mb-1 text-xl">Hasil Keputusan Siang</h2>
      <p className="mb-4 text-muted">Matahari mulai terbenam. Siap-siap menuju malam.</p>

      {eliminated ? (
        <Alert tone="danger" className="flex-col items-center p-5 text-center">
          <BigIcon size="2.8rem">⚖️</BigIcon>
          <h3 className="text-lg text-white">Warga Dieliminasi:</h3>
          <div className="my-2 break-words text-3xl font-bold text-white">
            {eliminated.name}
            {reveal && eliminated.role && (
              <span className="block text-lg font-normal text-muted">({ROLE_METAS[eliminated.role].name})</span>
            )}
          </div>
          <p className="text-muted">Telah dieksekusi oleh kesepakatan warga desa.</p>
        </Alert>
      ) : (
        <Alert tone="info" className="flex-col items-center p-5 text-center">
          <BigIcon size="2.8rem">🕊️</BigIcon>
          <h3 className="text-lg text-white">Pemilihan Dilewati</h3>
          <p className="text-muted">Hari ini warga memutuskan untuk tidak mengeliminasi siapa pun.</p>
        </Alert>
      )}

      <div className="mt-5">
        <Button className="!min-h-[58px] !text-lg" lockOnMountMs={400} onClick={() => dispatch({ type: 'NEXT_NIGHT' })}>
          🌙 Masuk ke Malam Berikutnya
        </Button>
      </div>
    </Card>
  );
}

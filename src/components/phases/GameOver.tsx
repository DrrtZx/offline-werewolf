'use client';

import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { ROLE_METAS } from '@/lib/engine/roles';
import Button from '@/components/game/Button';
import { RoleBadge, BigIcon, Card } from '@/components/game/ui';
import { Icon } from '@/components/icons/Icon';

export default function GameOver() {
  const winner = useGame((s) => s.winner);
  const players = useGame((s) => s.players);
  const wolfWin = winner === 'wolf';

  return (
    <Card tone={wolfWin ? 'wolf' : 'village'} className="mt-3 px-4 py-7 text-center" live>
      <BigIcon name={wolfWin ? 'wolf' : 'sparkle'} size={72} />
      <h1 className={`mb-1 text-3xl ${wolfWin ? 'text-wolf' : 'text-village'}`}>
        {wolfWin ? 'Kubu Serigala Menang!' : 'Kubu Warga Menang!'}
      </h1>
      <p className="mb-6 mt-2 text-[1.05rem] text-muted">
        {wolfWin
          ? 'Serigala berhasil menguasai desa dan melumpuhkan warga.'
          : 'Semua Serigala telah berhasil dieliminasi! Desa kini aman.'}
      </p>

      <div className="surface-inset mb-5 px-4 py-3 text-left">
        <h2 className="mb-2 text-base">Semua Identitas Pemain</h2>
        <ul>
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 border-b border-white/5 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 break-words">
                <strong>{p.name}</strong>
                {!p.isAlive && <span className="text-[0.8rem] text-danger"> (Gugur)</span>}
              </div>
              {p.role && <RoleBadge meta={ROLE_METAS[p.role]} />}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button lockOnMountMs={400} onClick={() => dispatch({ type: 'RESET_GAME', fullReset: false })}>
          <Icon name="refresh" size={18} className="mr-1.5 inline-block align-[-3px]" />
          Main Lagi (Pemain &amp; Opsi Sama)
        </Button>
        <Button variant="secondary" onClick={() => dispatch({ type: 'RESET_GAME', fullReset: true })}>
          <Icon name="gear" size={18} className="mr-1.5 inline-block align-[-3px]" />
          Setup Permainan Baru
        </Button>
      </div>
    </Card>
  );
}

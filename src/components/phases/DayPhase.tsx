'use client';

import { memo, useEffect, useState } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { formatClock, getRemainingMs } from '@/lib/engine/timer';
import Button from '@/components/game/Button';
import Modal from '@/components/game/Modal';
import { OptionList, StaggerItem } from '@/components/game/PlayerOption';
import { BigIcon, Card } from '@/components/game/ui';

const WARNING_MS = 10_000;

/** Timer visual dirender di komponen kecil sendiri agar tick tidak me-render ulang seluruh layar. */
const DiscussionTimer = memo(function DiscussionTimer() {
  const timer = useGame((s) => s.discussionTimer);
  const [now, setNow] = useState(() => Date.now());
  const endsAt = timer.endsAt;

  // Satu efek dengan cleanup: interval hanya berjalan saat timer aktif dan belum habis.
  useEffect(() => {
    setNow(Date.now());
    if (endsAt === null) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = getRemainingMs(timer, now);
  const finished = remaining === 0;
  const urgent = remaining <= WARNING_MS;

  return (
    <div className="my-2 text-center">
      <div
        className={`font-mono text-5xl font-bold tabular-nums transition-colors ${
          urgent ? 'text-danger' : 'text-white'
        }`}
        role="timer"
        aria-label={`Sisa waktu diskusi ${formatClock(remaining)}`}
      >
        {formatClock(remaining)}
      </div>
      <div className="mt-1 min-h-[1.25rem] text-sm text-muted" aria-live="polite">
        {timer.isPaused ? 'Dijeda' : finished ? 'Waktu habis' : ''}
      </div>
    </div>
  );
});

type Pending = { kind: 'eliminate'; playerId: string } | { kind: 'skip' } | null;

export default function DayPhase() {
  const players = useGame((s) => s.players);
  const timerMinutes = useGame((s) => s.settings.discussionTimerMinutes);
  const [pending, setPending] = useState<Pending>(null);

  const living = players.filter((p) => p.isAlive);
  const dead = players.filter((p) => !p.isAlive);
  const target = pending?.kind === 'eliminate' ? players.find((p) => p.id === pending.playerId) : undefined;

  const close = () => setPending(null);
  const confirmEliminate = () => {
    if (pending?.kind === 'eliminate') dispatch({ type: 'ELIMINATE_PLAYER', playerId: pending.playerId });
  };

  return (
    <>
      <Card className="text-center">
        <BigIcon size="2.8rem">☀️</BigIcon>
        <h2 className="mb-1 text-xl">Siang Hari — Diskusi &amp; Voting</h2>
        <p className="mb-3 text-[0.9rem] text-muted">
          Lakukan diskusi dan angkat tangan secara langsung di dunia nyata.
        </p>

        {timerMinutes > 0 && (
          <>
            <DiscussionTimer />
            <div className="mb-4 flex gap-2.5">
              <Button variant="secondary" small onClick={() => dispatch({ type: 'TIMER_ADD', ms: 60_000 })}>
                + 1 Menit
              </Button>
              <Button variant="secondary" small onClick={() => dispatch({ type: 'TIMER_TOGGLE' })}>
                ⏯️ Jeda / Lanjut
              </Button>
            </div>
          </>
        )}

        <div className="mb-3 mt-5 text-left">
          <h3 className="mb-1 text-base">Pilih Nama Yang Dieliminasi:</h3>
          <p className="text-[0.82rem] text-muted">
            Ketuk nama pemain hasil musyawarah warga, atau lewati jika tidak ada kesepakatan:
          </p>
        </div>

        <OptionList kind="list" label="Pemain yang masih hidup" className="mb-4">
          {living.map((p) => (
            <StaggerItem key={p.id} role="listitem">
              <button
                type="button"
                className="option option-danger"
                onClick={() => setPending({ kind: 'eliminate', playerId: p.id })}
              >
                <span className="break-words">
                  <span aria-hidden="true">👤</span> <strong>{p.name}</strong>
                </span>
                <span className="flex-none text-[0.85rem] text-danger">Eliminasi ➔</span>
              </button>
            </StaggerItem>
          ))}
        </OptionList>

        <Button variant="skip" className="!min-h-[54px]" onClick={() => setPending({ kind: 'skip' })}>
          ⏭️ Lewati Pemilihan (Skip Hari Ini / Tanpa Eliminasi)
        </Button>

        {dead.length > 0 && (
          <div className="mt-5 border-t border-white/5 pt-3 text-left text-[0.8rem] text-muted">
            Sudah Gugur:{' '}
            {dead.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <s>{p.name}</s>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Modal open={pending?.kind === 'eliminate' && target !== undefined} titleId="eliminate-title" onClose={close}>
        <div className="mb-2 text-6xl" aria-hidden="true">
          ⚖️
        </div>
        <h2 id="eliminate-title" className="mb-3 text-xl">
          Konfirmasi Eliminasi
        </h2>
        <p className="my-4 text-[1.1rem] text-white">Apakah seluruh warga desa sepakat mengeliminasi:</p>
        <div className="mb-6 break-words text-3xl font-bold text-danger">{target?.name}</div>
        <div className="flex flex-col gap-2.5">
          <Button variant="danger" onClick={confirmEliminate}>
            Ya, Eliminasi {target?.name}
          </Button>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
        </div>
      </Modal>

      <Modal open={pending?.kind === 'skip'} titleId="skip-title" onClose={close}>
        <div className="mb-2 text-6xl" aria-hidden="true">
          🕊️
        </div>
        <h2 id="skip-title" className="mb-3 text-xl">
          Lewati Pemilihan?
        </h2>
        <p className="my-4 text-[1.05rem] text-white">
          Hari ini tidak ada pemain yang dieliminasi dan permainan langsung lanjut ke malam berikutnya.
        </p>
        <div className="flex flex-col gap-2.5">
          <Button onClick={() => dispatch({ type: 'SKIP_DAY_VOTE' })}>Ya, Lewati Pemilihan</Button>
          <Button variant="secondary" onClick={close}>
            Batal
          </Button>
        </div>
      </Modal>
    </>
  );
}

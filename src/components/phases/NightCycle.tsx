'use client';

import { useEffect, useMemo, useState } from 'react';
import { dispatch, useGameStore } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { useTurnPlayer } from '@/hooks/useTurnPlayer';
import { useMountLock } from '@/hooks/useMountLock';
import { generateClosingDelay, getNightActionCard, getSeerReading } from '@/lib/engine/night';
import { pickFakeStat } from '@/lib/engine/quiz';
import { cryptoRandomInt, shuffleArray } from '@/lib/engine/rng';
import Button from '@/components/game/Button';
import Modal from '@/components/game/Modal';
import { OptionList, PlayerOption } from '@/components/game/PlayerOption';
import TapButton from '@/components/game/TapButton';
import TimerBar from '@/components/game/TimerBar';
import { BigIcon, Card, PlayerNameBlock } from '@/components/game/ui';
import type { NightOption, Player } from '@/types/game';

/*
 * ANTI-LEAK: seluruh layar malam sengaja netral. Tidak ada nama role / tim di DOM, aria-label, data-*,
 * ataupun class tone di luar kartu aksi giliran itu sendiri. Kartu aksi identik untuk semua role.
 */

function Cover({ player }: { player: Player }) {
  return (
    <Card className="mt-8 px-5 py-9 text-center">
      <BigIcon size="3rem">🌙</BigIcon>
      <h2 className="mb-2 text-xl">Giliran Malam</h2>
      <p className="text-muted">Operkan HP secara perlahan kepada:</p>
      <PlayerNameBlock name={player.name} />
      <div className="mb-3 mt-6">
        <TapButton label={`Saya ${player.name} — Buka Aksi`} onTap={() => dispatch({ type: 'NIGHT_OPEN_ACTION' })} />
      </div>
      <p className="text-[0.8rem] text-muted">Pastikan orang lain tetap memejamkan mata!</p>
    </Card>
  );
}

type ResultModal =
  | { kind: 'seer'; targetName: string; isWolf: boolean }
  | { kind: 'poll'; percent: number };

/** Modal yang sama untuk hasil Seer dan survei palsu Villager (animasi & durasi identik). */
function ResultDialog({ result, onClose }: { result: ResultModal | null; onClose: () => void }) {
  const seer = result?.kind === 'seer' ? result : null;
  return (
    <Modal open={result !== null} titleId="night-result-title" onClose={onClose}>
      {result && (
        <>
          <div className="mb-3 text-6xl" aria-hidden="true">
            {seer ? (seer.isWolf ? '🐺' : '✅') : '📊'}
          </div>
          <h2 id="night-result-title" className="mb-4 text-xl">
            {seer ? 'Hasil Penerawangan' : 'Opini Warga Desa'}
          </h2>
          <p className="mb-3 text-lg text-white">
            {seer ? (
              <>
                <strong className="break-words">{seer.targetName}</strong> berpihak pada:
              </>
            ) : (
              'Survei rahasia para warga:'
            )}
          </p>
          <div
            className={`mb-6 text-2xl font-bold ${seer ? (seer.isWolf ? 'text-wolf' : 'text-village') : 'text-accent'}`}
          >
            {seer
              ? seer.isWolf
                ? 'Kubu Werewolf!'
                : 'Kubu Warga (Bukan Werewolf)'
              : `${result.kind === 'poll' ? result.percent : 0}% Warga Setuju Pilihanmu!`}
          </div>
          <Button onClick={onClose}>{seer ? 'Tutup & Rahasiakan' : 'Tutup & Selesai'}</Button>
        </>
      )}
    </Modal>
  );
}

function ActionCard({ player }: { player: Player }) {
  const minSeconds = useGame((s) => s.settings.minNightDurationSeconds);
  const playerId = player.id;

  const [choice, setChoice] = useState<string | null>(null);
  const [timerDone, setTimerDone] = useState(false);
  const [result, setResult] = useState<ResultModal | null>(null);
  const inputLocked = useMountLock(400);

  // Opsi diacak SEKALI per giliran: komponen ini di-mount ulang setiap giliran (key layar memuat turnIndex),
  // sehingga urutan stabil antar-render dan tidak berubah saat state lain berubah.
  const card = useMemo(() => {
    const s = useGameStore.getState();
    const p = s.players.find((x) => x.id === playerId);
    if (!p) return null;
    const base = getNightActionCard({
      player: p,
      players: s.players,
      history: s.history,
      nightActions: s.nightActions,
      round: s.round,
      turnIndex: s.turnIndex,
    });
    const options: NightOption[] = shuffleArray(base.options);
    return { title: base.title, options };
  }, [playerId]);

  if (!card) return null;

  const commit = () => {
    if (choice) dispatch({ type: 'NIGHT_CONFIRM', targetId: choice });
  };

  const confirm = () => {
    if (!choice || !timerDone) return;
    if (player.role === 'seer') {
      const reading = getSeerReading(useGameStore.getState().players, choice);
      if (reading) {
        setResult({ kind: 'seer', targetName: reading.targetName, isWolf: reading.isWolf });
        return;
      }
    } else if (player.role === 'villager') {
      setResult({ kind: 'poll', percent: pickFakeStat(cryptoRandomInt) });
      return;
    }
    commit();
  };

  return (
    <>
      <Card className="mt-2">
        <div className="mb-4">
          <TimerBar durationMs={minSeconds * 1000} onComplete={() => setTimerDone(true)} />
        </div>
        <div className="mb-1 text-sm text-muted">
          Pemain: <strong className="text-white">{player.name}</strong>
        </div>
        <h2 className="mb-4 text-xl">{card.title}</h2>

        <OptionList label={card.title}>
          {card.options.map((opt) => (
            <PlayerOption
              key={opt.id}
              label={opt.label}
              selected={choice === opt.id}
              disabled={opt.disabled === true || inputLocked}
              onSelect={() => setChoice(opt.id)}
            />
          ))}
        </OptionList>

        <div className="mt-5">
          <Button disabled={!timerDone || choice === null} onClick={confirm}>
            Konfirmasi Pilihan
          </Button>
        </div>
      </Card>
      <ResultDialog result={result} onClose={commit} />
    </>
  );
}

function Closing() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), generateClosingDelay(cryptoRandomInt));
    return () => clearTimeout(id);
  }, []);

  return (
    <Card className="mt-8 px-5 py-9 text-center">
      <BigIcon size="3rem">✅</BigIcon>
      <h2 className="mb-2 text-xl">Aksi Tersimpan</h2>
      <p className="mb-5 text-muted">Pilihanmu telah diamankan dan dihapus dari layar.</p>
      <Button disabled={!ready} onClick={() => dispatch({ type: 'NIGHT_NEXT' })}>
        {ready ? 'Lanjutkan' : 'Serahkan ke Pemain Berikutnya...'}
      </Button>
    </Card>
  );
}

export default function NightCycle() {
  const phase = useGame((s) => s.phase);
  const player = useTurnPlayer();
  if (!player) return null;

  if (phase === 'NIGHT_ACTION') return <ActionCard player={player} />;
  if (phase === 'NIGHT_CLOSING') return <Closing />;
  return <Cover player={player} />;
}

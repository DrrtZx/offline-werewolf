'use client';

import { useState, type FormEvent } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import { checkAddPlayer } from '@/lib/engine/validation';
import { MAX_NAME_LENGTH, MAX_PLAYERS } from '@/types/game';
import Button from '@/components/game/Button';
import { Card } from '@/components/game/ui';

export default function SetupPlayers() {
  const players = useGame((s) => s.players);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    const check = checkAddPlayer(players, name);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    dispatch({ type: 'ADD_PLAYER', name: check.name });
    setName('');
    setError(null);
  };

  return (
    <Card>
      <h3 className="mb-1 text-lg">
        Daftar Pemain ({players.length}/{MAX_PLAYERS})
      </h3>
      <p className="mb-4 text-[0.95rem] text-muted">Tambahkan nama teman-temanmu (minimal 4 pemain).</p>

      <form className="mb-1 flex gap-2" onSubmit={submit}>
        <label htmlFor="player-name" className="sr-only">
          Nama pemain
        </label>
        <input
          id="player-name"
          className="input"
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={MAX_NAME_LENGTH}
          placeholder="Ketik nama pemain..."
          value={name}
          aria-invalid={error !== null}
          aria-describedby={error ? 'player-error' : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
        />
        <div className="w-[116px] flex-none">
          <Button onClick={submit} className="!min-h-[48px] !px-3">
            + Tambah
          </Button>
        </div>
      </form>
      <p id="player-error" role="alert" className="mb-3 min-h-[1.25rem] text-sm text-danger">
        {error}
      </p>

      <ul className="mb-4 flex max-h-60 flex-wrap gap-2 overflow-y-auto p-1" aria-label="Pemain terdaftar">
        {players.map((p) => (
          <li key={p.id} className="chip">
            <span className="break-all">{p.name}</span>
            <button
              type="button"
              className="chip-remove"
              aria-label={`Hapus ${p.name}`}
              onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: p.id })}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button variant="secondary" small onClick={() => dispatch({ type: 'QUICK_FILL_PLAYERS', count: 6 })}>
          ⚡ 6 Pemain
        </Button>
        <Button variant="secondary" small onClick={() => dispatch({ type: 'QUICK_FILL_PLAYERS', count: 8 })}>
          ⚡ 8 Pemain
        </Button>
        <Button variant="secondary" small onClick={() => dispatch({ type: 'CLEAR_PLAYERS' })}>
          🗑️ Bersihkan
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { useMemo } from 'react';
import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import type { RoleStatus } from '@/types/game';
import Button from '@/components/game/Button';
import { Card } from '@/components/game/ui';
import { previewRoles } from './preview';

function RoleRow({ icon, name, desc, children }: { icon: string; name: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-bold">
          <span aria-hidden="true">{icon}</span> {name}
        </span>
        <span className="text-[0.78rem] leading-snug text-muted">{desc}</span>
      </div>
      {children}
    </div>
  );
}

function Stepper({ label, value, onChange, canDec, canInc }: { label: string; value: number; onChange: (d: number) => void; canDec: boolean; canInc: boolean }) {
  return (
    <div className="flex flex-none items-center gap-2" role="group" aria-label={label}>
      <button type="button" className="stepper-btn" aria-label={`Kurangi ${label}`} disabled={!canDec} onClick={() => onChange(-1)}>
        −
      </button>
      <span className="min-w-[2rem] text-center text-lg font-bold" aria-live="polite">
        {value}
      </span>
      <button type="button" className="stepper-btn" aria-label={`Tambah ${label}`} disabled={!canInc} onClick={() => onChange(1)}>
        +
      </button>
    </div>
  );
}

const STATUS_LABEL: Record<RoleStatus, string> = { must: 'Ada', random: 'Acak', off: 'Off' };

function StatusPicker({ label, value, onPick }: { label: string; value: RoleStatus; onPick: (s: RoleStatus) => void }) {
  return (
    <div className="seg flex-none" role="group" aria-label={label}>
      {(['must', 'random', 'off'] as const).map((s) => (
        <button key={s} type="button" className="seg-btn" aria-pressed={value === s} onClick={() => onPick(s)}>
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export default function SetupRoles() {
  const players = useGame((s) => s.players);
  const config = useGame((s) => s.roleConfig);
  const N = players.length;
  const { roles, villagerMin, villagerMax } = useMemo(() => previewRoles(players, config), [players, config]);
  const maxWolf = Math.min(5, Math.floor((N - 1) / 2));

  return (
    <Card>
      <h3 className="mb-1 text-lg">Komposisi Role ({N} Pemain)</h3>
      <p className="mb-3 text-[0.95rem] text-muted">Atur role sesuai selera atau gunakan preset rekomendasi.</p>

      <RoleRow icon="🐺" name="Werewolf" desc="Kubu Serigala malam">
        <Stepper
          label="Werewolf"
          value={roles.werewolf}
          canDec={roles.werewolf > 1}
          canInc={roles.werewolf < maxWolf}
          onChange={(delta) => dispatch({ type: 'ADJUST_ROLE_COUNT', role: 'werewolf', delta })}
        />
      </RoleRow>
      <RoleRow icon="🏹" name="Hunter" desc="Menembak saat gugur">
        <Stepper
          label="Hunter"
          value={roles.hunter}
          canDec={roles.hunter > 0}
          canInc={roles.hunter < N - 1}
          onChange={(delta) => dispatch({ type: 'ADJUST_ROLE_COUNT', role: 'hunter', delta })}
        />
      </RoleRow>
      <RoleRow icon="👁️" name="Seer" desc="Menerawang identitas">
        <StatusPicker label="Seer" value={config.seer} onPick={(status) => dispatch({ type: 'SET_ROLE_STATUS', role: 'seer', status })} />
      </RoleRow>
      <RoleRow icon="🩺" name="Doctor" desc="Melindungi dari gigitan">
        <StatusPicker label="Doctor" value={config.doctor} onPick={(status) => dispatch({ type: 'SET_ROLE_STATUS', role: 'doctor', status })} />
      </RoleRow>
      <RoleRow icon="🛡️" name="Guardian" desc="Bisa lindungi diri sendiri / pemain lain (kebal)">
        <StatusPicker label="Guardian" value={config.guardian} onPick={(status) => dispatch({ type: 'SET_ROLE_STATUS', role: 'guardian', status })} />
      </RoleRow>
      <RoleRow icon="🏡" name="Villager (Sisa)" desc="Warga biasa tanpa kekuatan">
        <div className="flex-none text-lg font-bold text-village">
          {villagerMin === villagerMax ? villagerMax : `${villagerMin}–${villagerMax}`} Slot
        </div>
      </RoleRow>

      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" onClick={() => dispatch({ type: 'APPLY_PRESET' })}>
          ⭐ Pakai Preset
        </Button>
        <Button variant="secondary" onClick={() => dispatch({ type: 'RANDOMIZE_ALL_ROLES' })}>
          🎲 Acak Semua
        </Button>
      </div>
    </Card>
  );
}

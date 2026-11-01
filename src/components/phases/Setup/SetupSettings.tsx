'use client';

import { dispatch } from '@/store/gameStore';
import { useGame } from '@/store/GameView';
import type { BooleanSettingKey } from '@/types/game';
import { Card } from '@/components/game/ui';

function Row({ id, name, desc, children }: { id: string; name: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={`${id}-label`} className="font-bold">
          {name}
        </span>
        <span id={`${id}-desc`} className="text-[0.78rem] leading-snug text-muted">
          {desc}
        </span>
      </div>
      {children}
    </div>
  );
}

function Switch({ id, settingKey }: { id: string; settingKey: BooleanSettingKey }) {
  const checked = useGame((s) => s.settings[settingKey]);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-desc`}
      className="switch"
      onClick={() => dispatch({ type: 'TOGGLE_SETTING', key: settingKey })}
    />
  );
}

export default function SetupSettings() {
  const nightSeconds = useGame((s) => s.settings.minNightDurationSeconds);
  const discussion = useGame((s) => s.settings.discussionTimerMinutes);

  return (
    <Card>
      <h3 className="mb-1 text-lg">Pengaturan Aturan</h3>
      <p className="mb-3 text-[0.95rem] text-muted">Sesuaikan gameplay sesuai kenyamanan kelompokmu.</p>

      <Row id="reveal" name="Buka Role Saat Mati" desc="Identitas diumumkan saat gugur">
        <Switch id="reveal" settingKey="revealDeadRole" />
      </Row>
      <Row id="wolfteam" name="Rekan Serigala Terlihat" desc="Serigala tahu sesama rekannya">
        <Switch id="wolfteam" settingKey="showWolfTeam" />
      </Row>
      <Row id="hunterteam" name="Rekan Hunter Terlihat" desc="Hunter tahu sesama rekannya">
        <Switch id="hunterteam" settingKey="showHunterTeam" />
      </Row>

      <Row id="night" name="Durasi Min. Aksi Malam" desc="Waktu minimum untuk setiap giliran aksi malam">
        <select
          className="input !w-auto"
          aria-labelledby="night-label"
          value={nightSeconds}
          onChange={(e) => dispatch({ type: 'SET_NIGHT_DURATION', seconds: Number(e.target.value) })}
        >
          <option value={3}>3 Detik</option>
          <option value={5}>5 Detik</option>
          <option value={8}>8 Detik (Default)</option>
          <option value={10}>10 Detik</option>
        </select>
      </Row>
      <Row id="discussion" name="Timer Diskusi Siang" desc="Batas waktu ngobrol warga">
        <select
          className="input !w-auto"
          aria-labelledby="discussion-label"
          value={discussion}
          onChange={(e) => dispatch({ type: 'SET_DISCUSSION_TIMER', minutes: Number(e.target.value) })}
        >
          <option value={0}>Mati</option>
          <option value={3}>3 Menit</option>
          <option value={5}>5 Menit (Default)</option>
          <option value={10}>10 Menit</option>
        </select>
      </Row>

      <p className="mt-4 mb-1 text-xs font-bold uppercase tracking-wider text-muted">Aturan Lanjutan</p>
      <Row id="docself" name="Doctor Boleh Lindungi Diri" desc="Doctor dapat melindungi dirinya sendiri satu kali selama permainan">
        <Switch id="docself" settingKey="doctorSelfProtect" />
      </Row>
      <Row id="huntermand" name="Hunter Wajib Menembak" desc="Jika mati, Hunter harus memilih target dan tidak bisa melewatkan tembakan">
        <Switch id="huntermand" settingKey="hunterMandatory" />
      </Row>
    </Card>
  );
}

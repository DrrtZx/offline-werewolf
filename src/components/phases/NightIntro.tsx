'use client';

import { dispatch } from '@/store/gameStore';
import Button from '@/components/game/Button';
import { BigIcon, Card } from '@/components/game/ui';

export default function NightIntro() {
  return (
    <Card className="mt-10 px-5 py-10 text-center">
      <BigIcon>🌙</BigIcon>
      <h1 className="mb-2 text-3xl">Malam Telah Tiba</h1>
      <p className="mb-6 leading-relaxed text-muted">
        Semua pemain harap <strong className="text-white">menundukkan kepala</strong> dan{' '}
        <strong className="text-white">memejamkan mata</strong>.
        <br />
        Jangan ada yang mengintip!
      </p>
      <div className="surface-inset mb-5 px-3.5 py-2.5 text-[0.8rem] text-muted">
        🤫 Layar dibuat sangat gelap dan senyap untuk menjaga kerahasiaan aksi malam.
      </div>
      <Button className="!min-h-[58px]" lockOnMountMs={400} onClick={() => dispatch({ type: 'NIGHT_BEGIN' })}>
        Mulai Giliran Malam
      </Button>
    </Card>
  );
}

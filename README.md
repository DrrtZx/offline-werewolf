# Werewolf Pass-and-Play

[Mainkan game](https://offline-werewolf.vercel.app/)

Game Werewolf satu-ponsel (pass-and-play), dimigrasikan dari `index.html` (vanilla JS) ke Next.js 14 App Router + React 18 + TypeScript strict + Tailwind 3.4 + Zustand + Framer Motion (`LazyMotion`).
`index.html` dipertahankan hanya sebagai referensi logika asli.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
npm test           # vitest (engine, storage, recovery)
npm run build && npm start
```

## Arsitektur

```
src/
  app/                 layout, page (satu route "/"), globals.css (design token dusk/night)
  components/game/     GameShell, PhaseRouter (next/dynamic per fase), TapButton, Button, Modal, TimerBar, PlayerOption, ui
  components/phases/   Setup/, RoleReveal, NightIntro, NightCycle, DawnReport, HunterShot, DayPhase, DayResult, GameOver
  hooks/               usePlatformEffects (TTS, wake lock, nav guard, privacy shield, narasi), useMountLock, useTurnPlayer
  lib/engine/          logika murni (tanpa DOM/localStorage/TTS): reducer, presets, night, dawn, win, timer, quiz, recovery, rng
  lib/storage/         persist (localStorage aman + debounce), migrate (validasi bentuk data + migrasi v3 -> v4)
  lib/platform/        tts, wakeLock, navGuard, privacyShield, haptics, narration
  store/               gameStore (Zustand + persist), GameView (snapshot layar, dibekukan saat animasi keluar)
  types/game.ts        tipe state (discriminated union pada `phase`)
```

- Reducer murni: `gameReducer(state, action, { rng, now })`. RNG dan waktu di-inject sehingga bisa diuji deterministik.
- Efek samping (TTS, simpan, wake lock, getar) hanya ada di hook/storage, bereaksi pada perubahan state.
- Pilihan sementara malam (`tempChoice`) hanya ada di state komponen React, tidak pernah masuk store/localStorage.
- Data tersimpan memakai `STORAGE_KEY = 'werewolf_pass_and_play_v3_state'`; format asli (v3) dimigrasikan otomatis.

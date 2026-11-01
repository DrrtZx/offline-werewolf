import { describe, expect, it } from 'vitest';
import {
  STATE_VERSION,
  type GameAction,
  type GameState,
  type NightActions,
  type PhaseState,
  type Phase,
  type Player,
  type Role,
  type RoleConfig,
} from '@/types/game';
import { resolveDawn, tallyVotes } from './dawn';
import { getNightActionCard } from './night';
import { calculateFinalRoles } from './presets';
import { getQuizForTurn, QUIZ_BANK } from './quiz';
import { recoverState } from './recovery';
import { gameReducer, getInitialState, emptyNightActions } from './reducer';
import { createSeededRng, createSequenceRng, shuffleArray } from './rng';
import { addTime, startTimer, toggleTimer, getRemainingMs } from './timer';
import { checkAddPlayer, validateSetup } from './validation';
import { checkWinCondition } from './win';

const first = createSequenceRng([0]);
const cfg = (over: Partial<RoleConfig> = {}): RoleConfig => ({
  werewolf: 'auto',
  hunter: 'auto',
  seer: 'must',
  doctor: 'must',
  guardian: 'off',
  ...over,
});

function mk(id: string, role: Role, alive = true): Player {
  return { id, name: id.toUpperCase(), role, isAlive: alive, deathCause: null, deathRound: null };
}

/** Pindah ke fase tertentu pada state yang sudah ada (helper tes). */
function at(state: GameState, ps: PhaseState): GameState {
  return { ...state, ...ps };
}

function night(over: Partial<NightActions> = {}): NightActions {
  return { ...emptyNightActions(), ...over };
}

describe('QUIZ_BANK', () => {
  it('memiliki 10 pertanyaan player dan 15 custom (4 opsi) sesuai versi asli', () => {
    expect(QUIZ_BANK.filter((q) => q.type === 'player')).toHaveLength(10);
    const custom = QUIZ_BANK.filter((q) => q.type === 'custom');
    expect(custom).toHaveLength(15);
    for (const q of custom) expect(q.type === 'custom' && q.options).toHaveLength(4);
  });
  it('seed = (round*17 + turnIndex) % length', () => {
    expect(getQuizForTurn(1, 0)).toBe(QUIZ_BANK[17 % QUIZ_BANK.length]);
    expect(getQuizForTurn(3, 4)).toBe(QUIZ_BANK[(51 + 4) % QUIZ_BANK.length]);
  });
});

describe('calculateFinalRoles', () => {
  it('memakai preset saat auto dan sisa menjadi villager', () => {
    expect(calculateFinalRoles(6, cfg(), first)).toEqual({
      werewolf: 1, hunter: 1, seer: 1, doctor: 1, guardian: 0, villager: 2,
    });
  });
  it('fallback ke PRESETS[6] bila jumlah di luar tabel', () => {
    const r = calculateFinalRoles(20, cfg(), first);
    expect(r.werewolf).toBe(1);
    expect(r.hunter).toBe(1);
  });
  it('membatasi serigala ke min(5, floor((N-1)/2)) dan minimal 1', () => {
    expect(calculateFinalRoles(7, cfg({ werewolf: 9 }), first).werewolf).toBe(3);
    expect(calculateFinalRoles(16, cfg({ werewolf: 9 }), first).werewolf).toBe(5);
    expect(calculateFinalRoles(6, cfg({ werewolf: 0 }), first).werewolf).toBe(1);
  });
  it('mode random memakai rng, off = 0, must = 1', () => {
    const c = cfg({ seer: 'random', doctor: 'random', guardian: 'must' });
    const r = calculateFinalRoles(8, c, createSequenceRng([1, 0]));
    expect([r.seer, r.doctor, r.guardian]).toEqual([1, 0, 1]);
    expect(calculateFinalRoles(8, cfg({ seer: 'off', doctor: 'off' }), first)).toMatchObject({ seer: 0, doctor: 0 });
  });
  it('memangkas guardian -> doctor -> seer -> hunter untuk menyisakan 1 villager biasa', () => {
    // N=4: wolf 1 + hunter 3 + seer + doctor + guardian = 7 > 4
    const r = calculateFinalRoles(4, cfg({ hunter: 3, guardian: 'must' }), first);
    expect(r.guardian).toBe(0);
    expect(r.doctor).toBe(0);
    expect(r.seer).toBe(0);
    expect(r.hunter).toBe(2);
    expect(r.villager).toBe(1);
    // N=4: wolf 1 + hunter 3 + seer = 5 -> seer lalu 1 hunter dipangkas
    const r2 = calculateFinalRoles(4, cfg({ hunter: 3, doctor: 'off' }), first);
    expect(r2).toMatchObject({ werewolf: 1, hunter: 2, seer: 0, villager: 1 });
  });
  it('jumlah role selalu = N', () => {
    for (let n = 4; n <= 16; n++) {
      const r = calculateFinalRoles(n, cfg({ guardian: 'must' }), createSeededRng(n));
      expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(n);
    }
  });
});

describe('validateSetup', () => {
  const names = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `P${i}` }));
  it('menolak < 4 dan > 16 pemain', () => {
    expect(validateSetup(names(3), cfg(), first)).toMatchObject({ valid: false, message: 'Minimal butuh 4 pemain.' });
    expect(validateSetup(names(17), cfg(), first)).toMatchObject({ valid: false, message: 'Maksimal 16 pemain.' });
  });
  it('nama unik case-insensitive setelah trim', () => {
    const res = validateSetup([{ name: 'Ani' }, { name: ' ani ' }, { name: 'B' }, { name: 'C' }], cfg(), first);
    expect(res).toMatchObject({ valid: false, message: 'Nama setiap pemain harus unik!' });
  });
  it('serigala harus lebih sedikit dari warga', () => {
    // N=4 -> maxWolf = 1 sehingga tidak mungkin melanggar lewat konfigurasi; valid
    expect(validateSetup(names(4), cfg({ werewolf: 3 }), first)).toMatchObject({ valid: true });
  });
  it('membatasi hunter agar tersisa minimal satu villager biasa', () => {
    const res = validateSetup(names(4), cfg({ hunter: 3, seer: 'off', doctor: 'off' }), first);
    expect(res).toMatchObject({ valid: true });
    if (res.valid) expect(res.roles).toMatchObject({ werewolf: 1, hunter: 2, villager: 1 });
  });
  it('checkAddPlayer: maks 12 karakter, duplikat, kosong, batas 16', () => {
    const base = names(3);
    expect(checkAddPlayer(base, '  ')).toMatchObject({ ok: false });
    expect(checkAddPlayer(base, 'p1')).toMatchObject({ ok: false, message: 'Nama pemain sudah terdaftar!' });
    expect(checkAddPlayer(base, 'abcdefghijklmnop')).toEqual({ ok: true, name: 'abcdefghijkl' });
    expect(checkAddPlayer(names(16), 'Baru')).toMatchObject({ ok: false });
  });
});

describe('checkWinCondition', () => {
  it('warga menang bila serigala habis', () => {
    expect(checkWinCondition([mk('a', 'villager'), mk('b', 'werewolf', false)])).toBe('village');
  });
  it('serigala menang bila serigala >= non-serigala', () => {
    expect(checkWinCondition([mk('a', 'villager'), mk('b', 'werewolf')])).toBe('wolf');
    expect(checkWinCondition([mk('a', 'villager'), mk('c', 'seer'), mk('b', 'werewolf')])).toBeNull();
  });
});

describe('resolveDawn', () => {
  const players = [mk('w', 'werewolf'), mk('d', 'doctor'), mk('g', 'guardian'), mk('v', 'villager'), mk('h', 'hunter')];

  it('korban tanpa proteksi mati (immutable, deathCause & deathRound tercatat)', () => {
    const res = resolveDawn(players, night({ wolfVotes: { w: 'v' } }), 3, first);
    expect(res.deadPlayers.map((p) => p.id)).toEqual(['v']);
    expect(res.deadPlayers[0]).toMatchObject({ isAlive: false, deathCause: 'wolf_attack', deathRound: 3 });
    expect(players[3]?.isAlive).toBe(true);
    expect(res.players.find((p) => p.id === 'v')?.isAlive).toBe(false);
  });
  it('dibatalkan oleh Doctor', () => {
    const res = resolveDawn(players, night({ wolfVotes: { w: 'v' }, doctorTarget: 'v' }), 1, first);
    expect(res.deadPlayers).toHaveLength(0);
    expect(res.wasProtected).toBe(true);
  });
  it('dibatalkan oleh Guardian (termasuk melindungi diri sendiri)', () => {
    const res = resolveDawn(players, night({ wolfVotes: { w: 'g' }, guardianTarget: 'g' }), 1, first);
    expect(res.deadPlayers).toHaveLength(0);
  });
  it('proteksi target lain tidak menyelamatkan korban', () => {
    const res = resolveDawn(players, night({ wolfVotes: { w: 'v' }, doctorTarget: 'd', guardianTarget: 'g' }), 1, first);
    expect(res.deadPlayers).toHaveLength(1);
  });
  it('seri suara dipilih lewat rng injeksi', () => {
    const votes = { w1: 'a', w2: 'b' };
    expect(tallyVotes(votes, createSequenceRng([0]))).toBe('a');
    expect(tallyVotes(votes, createSequenceRng([1]))).toBe('b');
    expect(tallyVotes({}, first)).toBeNull();
    expect(tallyVotes({ x: 'a', y: 'a', z: 'b' }, createSequenceRng([1]))).toBe('a');
  });
  it('target siaga Hunter dihitung dengan aturan yang sama', () => {
    const res = resolveDawn(players, night({ hunterVotes: { h: 'w' } }), 1, first);
    expect(res.aimedTargetId).toBe('w');
  });
});

describe('aturan kartu malam', () => {
  const players = [mk('w', 'werewolf'), mk('d', 'doctor'), mk('v', 'villager'), mk('s', 'seer')];
  const base = {
    players,
    round: 1,
    turnIndex: 0,
    nightActions: { doctorTarget: null, wolfVotes: {}, hunterVotes: {} },
    doctorSelfProtect: true,
  };

  it('werewolf hanya melihat non-serigala hidup; seer tidak melihat diri', () => {
    const wolf = getNightActionCard({ ...base, player: players[0]!, history: { lastDoctorTarget: null, doctorSelfUsed: false } });
    expect(wolf.options.map((o) => o.id)).toEqual(['d', 'v', 's']);
    const seer = getNightActionCard({ ...base, player: players[3]!, history: { lastDoctorTarget: null, doctorSelfUsed: false } });
    expect(seer.options.map((o) => o.id)).toEqual(['w', 'd', 'v']);
  });
  it('menampilkan jumlah suara tim sebelumnya untuk Werewolf dan Hunter', () => {
    const wolf = getNightActionCard({
      ...base,
      player: players[0]!,
      nightActions: { ...base.nightActions, wolfVotes: { w1: 'd', w2: 'd', w3: 'v' } },
      history: { lastDoctorTarget: null, doctorSelfUsed: false },
    });
    expect(wolf.options.find((option) => option.id === 'd')?.voteCount).toBe(2);
    expect(wolf.options.find((option) => option.id === 'v')?.voteCount).toBe(1);

    const hunters = [mk('h1', 'hunter'), mk('h2', 'hunter'), ...players];
    const hunter = getNightActionCard({
      ...base,
      players: hunters,
      player: hunters[0]!,
      nightActions: { ...base.nightActions, hunterVotes: { h2: 'd', h3: 'd' } },
      history: { lastDoctorTarget: null, doctorSelfUsed: false },
    });
    expect(hunter.options.find((option) => option.id === 'd')?.voteCount).toBe(2);
  });
  it('Hunter mendapat opsi Skip Vote yang tidak menambah suara bidikan', () => {
    const hunters = [mk('h1', 'hunter'), mk('h2', 'hunter'), ...players];
    const card = getNightActionCard({
      ...base,
      players: hunters,
      player: hunters[0]!,
      history: { lastDoctorTarget: null, doctorSelfUsed: false },
    });
    expect(card.options.find((option) => option.id === 'hunter_skip_vote')?.label).toContain('Skip Vote');

    const r = makeRunner();
    const state = nightState(['werewolf', 'hunter', 'villager', 'villager', 'seer']);
    r.set({
      ...state,
      turnQueue: ['p2', 'p1', 'p3', 'p4', 'p5'],
      nightActions: { ...state.nightActions, hunterVotes: { p2: 'p3', otherHunter: 'p4' } },
    });
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    r.run({ type: 'NIGHT_CONFIRM', targetId: 'hunter_skip_vote' });
    expect(r.state.nightActions.hunterVotes).toEqual({ otherHunter: 'p4' });
    expect(r.state.phase).toBe('NIGHT_CLOSING');
  });
  it('doctor: tidak boleh target sama 2 malam & self-protect sekali', () => {
    const card = getNightActionCard({
      ...base,
      player: players[1]!,
      history: { lastDoctorTarget: 'v', doctorSelfUsed: true },
    });
    const disabled = card.options.filter((o) => o.disabled).map((o) => o.id);
    expect(disabled.sort()).toEqual(['d', 'v']);
  });
  it('doctor tidak dapat memilih diri sendiri saat pengaturan self-protect dimatikan', () => {
    const card = getNightActionCard({
      ...base,
      player: players[1]!,
      doctorSelfProtect: false,
      history: { lastDoctorTarget: null, doctorSelfUsed: false },
    });
    expect(card.options.find((option) => option.id === 'd')?.disabled).toBe(true);
  });
  it('villager mendapat kuis sesuai seed', () => {
    const card = getNightActionCard({ ...base, player: players[2]!, history: { lastDoctorTarget: null, doctorSelfUsed: false } });
    expect(card.title).toBe(getQuizForTurn(1, 0).q);
  });
});

describe('timer diskusi berbasis timestamp', () => {
  it('start / jeda / lanjut / tambah waktu', () => {
    let t = startTimer(5, 1_000);
    expect(getRemainingMs(t, 1_000)).toBe(300_000);
    expect(getRemainingMs(t, 61_000)).toBe(240_000);
    t = toggleTimer(t, 61_000);
    expect(t).toEqual({ endsAt: null, remainingMs: 240_000, isPaused: true });
    expect(getRemainingMs(t, 999_999)).toBe(240_000);
    t = addTime(t, 60_000, 999_999);
    expect(t.remainingMs).toBe(300_000);
    t = toggleTimer(t, 100_000);
    expect(t.endsAt).toBe(400_000);
  });
  it('0 menit = timer mati; +menit setelah habis dimulai dari sekarang', () => {
    expect(startTimer(0, 5)).toEqual({ endsAt: null, remainingMs: 0, isPaused: false });
    const expired = startTimer(1, 0);
    expect(addTime(expired, 60_000, 200_000).endsAt).toBe(260_000);
  });
});

describe('recoverState', () => {
  const base = getInitialState();
  it('NIGHT_ACTION / NIGHT_CLOSING -> NIGHT_HANDOVER cover (pemain sama)', () => {
    for (const phase of ['NIGHT_ACTION', 'NIGHT_CLOSING'] as const) {
      const s: GameState = {
        ...base,
        turnIndex: 2,
        turnQueue: ['a', 'b', 'c'],
        ...(phase === 'NIGHT_ACTION'
          ? { phase, cardStep: 'action' as const, hunterStep: null }
          : { phase, cardStep: 'closing' as const, hunterStep: null }),
      };
      const r = recoverState(s);
      expect(r.phase).toBe('NIGHT_HANDOVER');
      expect(r.cardStep).toBe('cover');
      expect(r.turnIndex).toBe(2);
    }
  });
  it('ROLE_REVEAL card -> cover; closing tetap', () => {
    const card: GameState = { ...base, phase: 'ROLE_REVEAL', cardStep: 'card', hunterStep: null };
    expect(recoverState(card).cardStep).toBe('cover');
    const closing: GameState = { ...base, phase: 'ROLE_REVEAL', cardStep: 'closing', hunterStep: null };
    expect(recoverState(closing).cardStep).toBe('closing');
  });
  it('HUNTER action -> cover', () => {
    const s: GameState = { ...base, phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'action' };
    expect(recoverState(s).hunterStep).toBe('cover');
  });
});

// --------------------------------------------------------------------------
// Reducer
// --------------------------------------------------------------------------

function makeRunner(seed = 7) {
  const rng = createSeededRng(seed);
  let now = 1_000_000;
  let state = getInitialState();
  const run = (action: GameAction): GameState => {
    state = gameReducer(state, action, { rng, now });
    return state;
  };
  return {
    run,
    get state() {
      return state;
    },
    set(next: GameState) {
      state = next;
    },
    advance(ms: number) {
      now += ms;
    },
  };
}

/** State siap pakai di fase malam dengan role tetap. */
function nightState(roles: Role[], round = 1): GameState {
  const base = getInitialState();
  const players = roles.map((role, i) => ({ ...mk(`p${i + 1}`, role) }));
  return {
    ...base,
    players,
    round,
    phase: 'NIGHT_INTRO',
    cardStep: null,
    hunterStep: null,
    turnQueue: players.map((p) => p.id),
    turnIndex: 0,
  };
}

describe('reducer: immutability & guard', () => {
  it('tidak memutasi state lama', () => {
    const r = makeRunner();
    const before = r.state;
    const snapshot = JSON.stringify(before);
    r.run({ type: 'ADD_PLAYER', name: 'Zed' });
    r.run({ type: 'START_GAME' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
  it('aksi di fase salah diabaikan (mencegah double-advance)', () => {
    const r = makeRunner();
    const s = r.run({ type: 'REVEAL_NEXT' });
    expect(s.phase).toBe('SETUP');
    r.run({ type: 'START_GAME' });
    r.run({ type: 'REVEAL_OPEN' });
    const once = r.state;
    expect(r.run({ type: 'REVEAL_OPEN' })).toBe(once);
  });
  it('setup: tambah, hapus, clear, quick fill, preset, reset', () => {
    const r = makeRunner();
    r.run({ type: 'ADD_PLAYER', name: 'Gita' });
    expect(r.state.players).toHaveLength(7);
    r.run({ type: 'ADD_PLAYER', name: 'gita' });
    expect(r.state.players).toHaveLength(7);
    r.run({ type: 'REMOVE_PLAYER', playerId: 'p1' });
    expect(r.state.players).toHaveLength(6);
    r.run({ type: 'QUICK_FILL_PLAYERS', count: 8 });
    expect(r.state.players).toHaveLength(8);
    r.run({ type: 'APPLY_PRESET' });
    expect(r.state.roleConfig).toEqual({ werewolf: 2, hunter: 1, seer: 'must', doctor: 'must', guardian: 'must' });
    r.run({ type: 'CLEAR_PLAYERS' });
    expect(r.state.players).toHaveLength(0);
  });
  it('adjustRoleCount menghormati batas', () => {
    const r = makeRunner();
    for (let i = 0; i < 6; i++) r.run({ type: 'ADJUST_ROLE_COUNT', role: 'werewolf', delta: 1 });
    expect(r.state.roleConfig.werewolf).toBe(2); // N=6 -> maxWolf 2
    for (let i = 0; i < 9; i++) r.run({ type: 'ADJUST_ROLE_COUNT', role: 'hunter', delta: -1 });
    expect(r.state.roleConfig.hunter).toBe(0);
  });
  it('durasi aksi malam menerima pilihan 3 detik', () => {
    const r = makeRunner();
    r.run({ type: 'SET_NIGHT_DURATION', seconds: 3 });
    expect(r.state.settings.minNightDurationSeconds).toBe(3);
  });
  it('batas hunter menyisakan setidaknya satu slot villager biasa', () => {
    const r = makeRunner();
    const state = getInitialState();
    r.set({
      ...state,
      players: state.players.slice(0, 4),
      roleConfig: { werewolf: 1, hunter: 0, seer: 'off', doctor: 'off', guardian: 'off' },
    });
    for (let i = 0; i < 5; i++) r.run({ type: 'ADJUST_ROLE_COUNT', role: 'hunter', delta: 1 });
    expect(r.state.roleConfig.hunter).toBe(2);
    expect(calculateFinalRoles(4, r.state.roleConfig, first).villager).toBe(1);
  });
});

describe('reducer: alur malam', () => {
  it('PRIVACY_BLUR mengembalikan ke cover, tanpa menyimpan pilihan', () => {
    const r = makeRunner();
    r.set(nightState(['werewolf', 'villager', 'villager', 'seer']));
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    expect(r.state.phase).toBe('NIGHT_ACTION');
    const s = r.run({ type: 'PRIVACY_BLUR' });
    expect(s.phase).toBe('NIGHT_HANDOVER');
    expect(s.cardStep).toBe('cover');
    expect(s.turnIndex).toBe(0);
    expect(s.nightActions).toEqual(emptyNightActions());
  });
  it('NIGHT_CONFIRM menolak pilihan tidak valid (mis. serigala memilih rekan)', () => {
    const r = makeRunner();
    r.set(nightState(['werewolf', 'werewolf', 'villager', 'villager', 'seer']));
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    const wolfId = r.state.turnQueue[0]!;
    const role = r.state.players.find((p) => p.id === wolfId)!.role;
    expect(role).toBe('werewolf');
    const before = r.state;
    expect(r.run({ type: 'NIGHT_CONFIRM', targetId: 'p2' })).toBe(before);
  });
  it('doctor melindungi diri: doctorSelfUsed true dan opsi diri nonaktif malam berikutnya', () => {
    const r = makeRunner();
    const s0 = nightState(['werewolf', 'doctor', 'villager', 'villager', 'villager']);
    r.set({ ...s0, turnQueue: ['p2', 'p1', 'p3', 'p4', 'p5'] });
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    r.run({ type: 'NIGHT_CONFIRM', targetId: 'p2' });
    expect(r.state.history.doctorSelfUsed).toBe(true);
    expect(r.state.nightActions.doctorTarget).toBe('p2');
  });
  it('doctor self-protect dinonaktifkan benar-benar menolak pilihan diri', () => {
    const r = makeRunner();
    const state = nightState(['werewolf', 'doctor', 'villager', 'villager', 'seer']);
    r.set({
      ...state,
      turnQueue: ['p2', 'p1', 'p3', 'p4', 'p5'],
      settings: { ...state.settings, doctorSelfProtect: false },
    });
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    const before = r.state;
    expect(r.run({ type: 'NIGHT_CONFIRM', targetId: 'p2' })).toBe(before);
  });
  it('aksi malam Hunter menyimpan target bidikan siaga sebagai suara tim', () => {
    const r = makeRunner();
    const state = nightState(['werewolf', 'hunter', 'villager', 'villager', 'seer']);
    r.set({ ...state, turnQueue: ['p2', 'p1', 'p3', 'p4', 'p5'] });
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    r.run({ type: 'NIGHT_CONFIRM', targetId: 'p3' });
    expect(r.state.nightActions.hunterVotes).toEqual({ p2: 'p3' });
  });
  it('villager: konfirmasi kuis tidak mengubah aksi malam', () => {
    const r = makeRunner();
    r.set(nightState(['villager', 'werewolf', 'villager', 'seer']));
    r.run({ type: 'NIGHT_BEGIN' });
    r.run({ type: 'NIGHT_OPEN_ACTION' });
    const card = getNightActionCard({
      player: r.state.players[0]!,
      players: r.state.players,
      history: r.state.history,
      nightActions: r.state.nightActions,
      doctorSelfProtect: r.state.settings.doctorSelfProtect,
      round: r.state.round,
      turnIndex: 0,
    });
    r.run({ type: 'NIGHT_CONFIRM', targetId: card.options[0]!.id });
    expect(r.state.phase).toBe('NIGHT_CLOSING');
    expect(r.state.nightActions).toEqual(emptyNightActions());
  });
  it('startNight mereset dayEliminatedPlayer dan hunterOrigin (bug #2)', () => {
    const r = makeRunner();
    const s = nightState(['werewolf', 'villager', 'villager', 'villager', 'seer']);
    r.set({
      ...s,
      phase: 'DAY_RESULT',
      cardStep: null,
      hunterStep: null,
      dayEliminatedPlayer: { ...mk('p2', 'villager', false) },
      hunterOrigin: 'day',
    });
    const next = r.run({ type: 'NEXT_NIGHT' });
    expect(next.round).toBe(2);
    expect(next.phase).toBe('NIGHT_INTRO');
    expect(next.dayEliminatedPlayer).toBeNull();
    expect(next.hunterOrigin).toBeNull();
  });
});

function playNightTurn(r: ReturnType<typeof makeRunner>, choose: (s: GameState, playerId: string) => string) {
  r.run({ type: 'NIGHT_OPEN_ACTION' });
  const id = r.state.turnQueue[r.state.turnIndex]!;
  r.run({ type: 'NIGHT_CONFIRM', targetId: choose(r.state, id) });
  expect(r.state.phase).toBe('NIGHT_CLOSING');
  r.run({ type: 'NIGHT_NEXT' });
}

describe('reducer: hunter', () => {
  it('hunter mati di fajar ronde 2+ -> DAWN_REPORT (bukan DAY_RESULT), walau ada dayEliminatedPlayer lama', () => {
    const r = makeRunner();
    // Ronde 2: 1 serigala, hunter, 3 villager, seer. Serigala menyerang hunter.
    const s = nightState(['werewolf', 'hunter', 'villager', 'villager', 'villager', 'seer'], 2);
    r.set({ ...s, dayEliminatedPlayer: { ...mk('zz', 'villager', false) }, turnQueue: ['p1', 'p3', 'p4', 'p5', 'p6'], hunterOrigin: 'day' });
    r.run({ type: 'NIGHT_BEGIN' });
    // pakai alur nyata dari NEXT_NIGHT untuk memastikan reset
    r.set(at(r.state, { phase: 'DAY_RESULT', cardStep: null, hunterStep: null }));
    r.run({ type: 'NEXT_NIGHT' });
    r.run({ type: 'NIGHT_BEGIN' });
    // semua giliran: serigala pilih hunter, lainnya pilih apa saja yang valid
    let guard = 0;
    while (r.state.phase === 'NIGHT_HANDOVER' && guard++ < 10) {
      playNightTurn(r, (st, pid) => {
        const player = st.players.find((p) => p.id === pid)!;
        const card = getNightActionCard({
          player,
          players: st.players,
          history: st.history,
          nightActions: st.nightActions,
          doctorSelfProtect: st.settings.doctorSelfProtect,
          round: st.round,
          turnIndex: st.turnIndex,
        });
        if (player.role === 'werewolf') return 'p2';
        return card.options.find((o) => !o.disabled)!.id;
      });
    }
    expect(r.state.phase).toBe('HUNTER_TRIGGER');
    expect(r.state.hunterOrigin).toBe('night');
    expect(r.state.activeHunterShooterId).toBe('p2');

    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    r.run({ type: 'HUNTER_CONFIRM', targetId: 'p1' }); // menembak serigala
    expect(r.state.hunterStep).toBe('closing');
    expect(r.state.lastHunterVictimId).toBe('p1');
    r.run({ type: 'HUNTER_DONE' });
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.winner).toBe('village');
  });

  it('hunter mati di fajar tanpa pemenang -> DAWN_REPORT', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'hunter', 'villager', 'villager', 'villager', 'villager'], 3),
      dayEliminatedPlayer: { ...mk('old', 'villager', false) },
    });
    r.run({ type: 'NIGHT_BEGIN' });
    r.set({
      ...at(r.state, { phase: 'NIGHT_CLOSING', cardStep: 'closing', hunterStep: null }),
      turnIndex: r.state.turnQueue.length - 1,
      nightActions: night({ wolfVotes: { p1: 'p2' } }),
    });
    r.run({ type: 'NIGHT_NEXT' });
    expect(r.state.phase).toBe('HUNTER_TRIGGER');
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    r.run({ type: 'HUNTER_CONFIRM', targetId: 'p3' });
    r.run({ type: 'HUNTER_DONE' });
    expect(r.state.phase).toBe('DAWN_REPORT');
    expect(r.state.dawnSummary?.deadPlayers.map((p) => p.id)).toEqual(['p2']);
  });

  it('tembakan berantai: hunter menembak hunter lain (voting siang)', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'hunter', 'hunter', 'villager', 'villager', 'villager', 'seer'], 2),
      phase: 'DAY_PHASE',
      cardStep: null,
      hunterStep: null,
    });
    r.run({ type: 'ELIMINATE_PLAYER', playerId: 'p2' });
    expect(r.state.phase).toBe('HUNTER_TRIGGER');
    expect(r.state.hunterOrigin).toBe('day');
    expect(r.state.activeHunterShooterId).toBe('p2');
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    r.run({ type: 'HUNTER_CONFIRM', targetId: 'p3' });
    expect(r.state.hunterQueue).toEqual(['p3']);
    r.run({ type: 'HUNTER_DONE' });
    expect(r.state.phase).toBe('HUNTER_TRIGGER');
    expect(r.state.activeHunterShooterId).toBe('p3');
    expect(r.state.hunterStep).toBe('public');
    expect(r.state.hunterOrigin).toBe('day');
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    r.run({ type: 'HUNTER_CONFIRM', targetId: 'p4' });
    r.run({ type: 'HUNTER_DONE' });
    expect(r.state.phase).toBe('DAY_RESULT');
    expect(r.state.dayEliminatedPlayer?.id).toBe('p2');
  });

  it('hunter tidak bisa menembak diri sendiri atau pemain mati', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'hunter', 'villager', 'villager', 'villager', 'seer']),
      phase: 'DAY_PHASE',
      cardStep: null,
      hunterStep: null,
    });
    r.run({ type: 'ELIMINATE_PLAYER', playerId: 'p2' });
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    const before = r.state;
    expect(r.run({ type: 'HUNTER_CONFIRM', targetId: 'p2' })).toBe(before);
  });

  it('hunter boleh melewatkan tembakan jika aturan tidak mewajibkan', () => {
    const r = makeRunner();
    const state = nightState(['werewolf', 'hunter', 'villager', 'villager', 'villager', 'seer']);
    r.set({
      ...state,
      phase: 'DAY_PHASE',
      cardStep: null,
      hunterStep: null,
      settings: { ...state.settings, hunterMandatory: false },
    });
    r.run({ type: 'ELIMINATE_PLAYER', playerId: 'p2' });
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    r.run({ type: 'HUNTER_SKIP' });
    expect(r.state.hunterStep).toBe('closing');
    expect(r.state.lastHunterVictimId).toBeNull();
    expect(r.state.players.filter((p) => p.isAlive)).toHaveLength(5);
    r.run({ type: 'HUNTER_DONE' });
    expect(r.state.phase).toBe('DAY_RESULT');
  });

  it('menolak skip hunter jika tembakan diwajibkan', () => {
    const r = makeRunner();
    const state = nightState(['werewolf', 'hunter', 'villager', 'villager', 'villager', 'seer']);
    r.set({
      ...state,
      phase: 'DAY_PHASE',
      cardStep: null,
      hunterStep: null,
      settings: { ...state.settings, hunterMandatory: true },
    });
    r.run({ type: 'ELIMINATE_PLAYER', playerId: 'p2' });
    r.run({ type: 'HUNTER_PUBLIC_NEXT' });
    r.run({ type: 'HUNTER_COVER_OPEN' });
    const before = r.state;
    expect(r.run({ type: 'HUNTER_SKIP' })).toBe(before);
  });

  it('kondisi menang dicek setelah eliminasi siang', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'villager', 'villager', 'villager']),
      phase: 'DAY_PHASE',
      cardStep: null,
      hunterStep: null,
    });
    r.run({ type: 'ELIMINATE_PLAYER', playerId: 'p1' });
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.winner).toBe('village');
  });
});

describe('reducer: siang', () => {
  it('DAWN_CONTINUE memulai timer; toggle & tambah waktu; skip & eliminasi menghentikan timer', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'villager', 'villager', 'villager', 'seer']),
      phase: 'DAWN_REPORT',
      cardStep: null,
      hunterStep: null,
    });
    r.run({ type: 'DAWN_CONTINUE' });
    expect(r.state.phase).toBe('DAY_PHASE');
    expect(r.state.discussionTimer.endsAt).not.toBeNull();
    r.advance(30_000);
    r.run({ type: 'TIMER_TOGGLE' });
    expect(r.state.discussionTimer.isPaused).toBe(true);
    expect(r.state.discussionTimer.remainingMs).toBe(270_000);
    r.run({ type: 'TIMER_ADD', ms: 60_000 });
    expect(r.state.discussionTimer.remainingMs).toBe(330_000);
    r.run({ type: 'SKIP_DAY_VOTE' });
    expect(r.state.phase).toBe('DAY_RESULT');
    expect(r.state.dayEliminatedPlayer).toBeNull();
    expect(r.state.discussionTimer.endsAt).toBeNull();
    expect(r.run({ type: 'NEXT_NIGHT' }).round).toBe(2);
  });
  it('timer 0 menit = mati', () => {
    const r = makeRunner();
    r.set({
      ...nightState(['werewolf', 'villager', 'villager', 'villager', 'seer']),
      phase: 'DAWN_REPORT',
      cardStep: null,
      hunterStep: null,
      settings: { ...getInitialState().settings, discussionTimerMinutes: 0 },
    });
    r.run({ type: 'DAWN_CONTINUE' });
    expect(r.state.discussionTimer).toEqual({ endsAt: null, remainingMs: 0, isPaused: false });
    expect(r.run({ type: 'TIMER_TOGGLE' }).discussionTimer.isPaused).toBe(false);
  });
});

describe('reducer: permainan penuh 6 pemain', () => {
  it('Setup -> Game Over; Main Lagi mempertahankan pemain & opsi', () => {
    const r = makeRunner(42);
    r.run({ type: 'TOGGLE_SETTING', key: 'revealDeadRole' });
    r.run({ type: 'START_GAME' });
    expect(r.state.phase).toBe('ROLE_REVEAL');
    expect(r.state.finalRoles).toMatchObject({ werewolf: 1, hunter: 1, seer: 1, doctor: 1, villager: 2 });

    // Role reveal: semua pemain
    for (let i = 0; i < 6; i++) {
      expect(r.state.cardStep).toBe('cover');
      r.run({ type: 'REVEAL_OPEN' });
      r.run({ type: 'REVEAL_CLOSE' });
      r.run({ type: 'REVEAL_NEXT' });
    }
    expect(r.state.phase).toBe('NIGHT_INTRO');

    const phaseOf = (): Phase => r.state.phase;
    const shootAll = () => {
      let guard = 0;
      while (phaseOf() === 'HUNTER_TRIGGER' && guard++ < 100) {
        r.run({ type: 'HUNTER_PUBLIC_NEXT' });
        r.run({ type: 'HUNTER_COVER_OPEN' });
        const shooter = r.state.activeHunterShooterId;
        const target = r.state.players.find((p) => p.isAlive && p.id !== shooter)!;
        r.run({ type: 'HUNTER_CONFIRM', targetId: target.id });
        r.run({ type: 'HUNTER_DONE' });
      }
    };

    let rounds = 0;
    while (phaseOf() !== 'GAME_OVER' && rounds++ < 20) {
      if (phaseOf() === 'NIGHT_INTRO') r.run({ type: 'NIGHT_BEGIN' });
      let turns = 0;
      while (phaseOf() === 'NIGHT_HANDOVER' && turns++ < 20) {
        playNightTurn(r, (st, pid) => {
          const player = st.players.find((p) => p.id === pid)!;
          const card = getNightActionCard({
            player,
            players: st.players,
            history: st.history,
            nightActions: st.nightActions,
            doctorSelfProtect: st.settings.doctorSelfProtect,
            round: st.round,
            turnIndex: st.turnIndex,
          });
          return card.options.find((o) => !o.disabled)!.id;
        });
      }
      shootAll();
      if (phaseOf() === 'DAWN_REPORT') r.run({ type: 'DAWN_CONTINUE' });
      if (phaseOf() === 'DAY_PHASE') {
        const victim = r.state.players.find((p) => p.isAlive && p.role !== 'werewolf');
        r.run(victim && rounds % 2 === 0 ? { type: 'ELIMINATE_PLAYER', playerId: victim.id } : { type: 'SKIP_DAY_VOTE' });
        shootAll();
      }
      if (phaseOf() === 'DAY_RESULT') r.run({ type: 'NEXT_NIGHT' });
    }
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.winner).not.toBeNull();
    expect(r.state._version).toBe(STATE_VERSION);

    const names = r.state.players.map((p) => p.name);
    r.run({ type: 'RESET_GAME', fullReset: false });
    expect(r.state.phase).toBe('SETUP');
    expect(r.state.players.map((p) => p.name)).toEqual(names);
    expect(r.state.players.every((p) => p.role === null && p.isAlive)).toBe(true);
    expect(r.state.settings.revealDeadRole).toBe(false);
    r.run({ type: 'RESET_GAME', fullReset: true });
    expect(r.state.settings.revealDeadRole).toBe(true);
  });
});

describe('rng', () => {
  it('shuffleArray: salinan baru dan permutasi sama', () => {
    const src = [1, 2, 3, 4, 5, 6, 7];
    const out = shuffleArray(src, createSeededRng(3));
    expect(out).not.toBe(src);
    expect([...out].sort()).toEqual(src);
  });
});

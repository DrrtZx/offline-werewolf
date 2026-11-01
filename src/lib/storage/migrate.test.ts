import { describe, expect, it } from 'vitest';
import { STATE_VERSION, type GameState } from '@/types/game';
import { getInitialState } from '@/lib/engine/reducer';
import { narrate } from '@/lib/platform/narration';
import { parseSavedState } from './migrate';
import { readEnvelope } from './persist';

/** Bentuk state versi asli (v3): tanpa cardStep/hunterStep/hunterOrigin/discussionTimer. */
function legacy(over: Record<string, unknown> = {}): Record<string, unknown> {
  const roles = ['werewolf', 'hunter', 'seer', 'doctor', 'villager', 'villager'];
  return {
    phase: 'NIGHT_ACTION',
    setupStep: 'summary',
    players: roles.map((role, i) => ({
      id: `p${i + 1}`,
      name: `N${i + 1}`,
      role,
      isAlive: true,
      deathCause: null,
      deathRound: null,
    })),
    roleConfig: { werewolf: 'auto', hunter: 'auto', seer: 'must', doctor: 'must', guardian: 'off' },
    settings: {
      revealDeadRole: true,
      showWolfTeam: true,
      showHunterTeam: true,
      discussionTimerMinutes: 5,
      minNightDurationSeconds: 8,
      doctorSelfProtect: true,
      hunterMandatory: true,
      ttsEnabled: true,
    },
    round: 2,
    finalRoles: { werewolf: 1, hunter: 1, seer: 1, doctor: 1, guardian: 0, villager: 2 },
    turnQueue: ['p3', 'p1', 'p2', 'p4', 'p5', 'p6'],
    turnIndex: 1,
    nightActions: { wolfVotes: {}, hunterVotes: {}, doctorTarget: null, guardianTarget: null, seerTarget: null },
    aimedTargetId: null,
    history: { lastDoctorTarget: null, doctorSelfUsed: false, log: [] },
    hunterQueue: [],
    activeHunterShooterId: null,
    dawnSummary: null,
    dayEliminatedPlayer: null,
    winner: null,
    ...over,
  };
}

describe('parseSavedState', () => {
  it('data v3 di NIGHT_ACTION dipulihkan ke NIGHT_HANDOVER (cover) pemain yang sama', () => {
    const s = parseSavedState(legacy(), 3);
    expect(s).not.toBeNull();
    expect(s?.phase).toBe('NIGHT_HANDOVER');
    expect(s?.cardStep).toBe('cover');
    expect(s?.turnIndex).toBe(1);
    expect(s?._version).toBe(STATE_VERSION);
  });
  it('NIGHT_CLOSING juga kembali ke cover', () => {
    expect(parseSavedState(legacy({ phase: 'NIGHT_CLOSING' }), 3)?.phase).toBe('NIGHT_HANDOVER');
  });
  it('ROLE_REVEAL step card tersimpan -> cover; closing dipertahankan', () => {
    const base = legacy({ phase: 'ROLE_REVEAL', turnIndex: 0 });
    expect(parseSavedState({ ...base, cardStep: 'card' }, 4)?.cardStep).toBe('cover');
    expect(parseSavedState({ ...base, cardStep: 'closing' }, 4)?.cardStep).toBe('closing');
    expect(parseSavedState(base, 3)?.cardStep).toBe('cover');
  });
  it('v3 HUNTER_TRIGGER: hunterOrigin diturunkan dari dayEliminatedPlayer', () => {
    const dead = { id: 'p2', name: 'N2', role: 'hunter', isAlive: false, deathCause: 'vote_lynch', deathRound: 1 };
    const base = legacy({ phase: 'HUNTER_TRIGGER', activeHunterShooterId: 'p2' });
    expect(parseSavedState({ ...base, dayEliminatedPlayer: dead }, 3)?.hunterOrigin).toBe('day');
    expect(parseSavedState(base, 3)?.hunterOrigin).toBe('night');
    expect(parseSavedState(base, 3)?.hunterStep).toBe('public');
  });
  it('v4 HUNTER_TRIGGER step action -> cover', () => {
    const base = legacy({ phase: 'HUNTER_TRIGGER', activeHunterShooterId: 'p2', hunterStep: 'action', hunterOrigin: 'night' });
    expect(parseSavedState(base, 4)?.hunterStep).toBe('cover');
  });
  it('DAY_PHASE v3: timer dimulai dijeda dengan durasi penuh; v4 menjaga endsAt', () => {
    const s3 = parseSavedState(legacy({ phase: 'DAY_PHASE' }), 3);
    expect(s3?.discussionTimer).toEqual({ endsAt: null, remainingMs: 300_000, isPaused: true });
    const s4 = parseSavedState(
      legacy({ phase: 'DAY_PHASE', discussionTimer: { endsAt: 123456, remainingMs: 1000, isPaused: false } }),
      4,
    );
    expect(s4?.discussionTimer.endsAt).toBe(123456);
  });
  it('menolak data korup tanpa melempar galat', () => {
    expect(parseSavedState(null, 4)).toBeNull();
    expect(parseSavedState([], 4)).toBeNull();
    expect(parseSavedState({ phase: 'NOPE' }, 4)).toBeNull();
    expect(parseSavedState(legacy({ players: 'x' }), 3)).toBeNull();
    expect(parseSavedState(legacy({ turnQueue: ['zzz'] }), 3)).toBeNull();
    expect(parseSavedState(legacy({ turnIndex: 99 }), 3)).toBeNull();
    expect(parseSavedState(legacy({ phase: 'GAME_OVER', winner: null }), 3)).toBeNull();
    expect(parseSavedState(legacy({ phase: 'HUNTER_TRIGGER', activeHunterShooterId: 'ghost' }), 3)).toBeNull();
  });
  it('menolak versi tak dikenal (lebih baru / terlalu lama)', () => {
    expect(parseSavedState(legacy(), STATE_VERSION + 1)).toBeNull();
    expect(parseSavedState(legacy(), 2)).toBeNull();
  });
  it('setting tidak valid jatuh ke default', () => {
    const s = parseSavedState(legacy({ settings: { ttsEnabled: 'ya', discussionTimerMinutes: -3 } }), 3);
    expect(s?.settings.ttsEnabled).toBe(true);
    expect(s?.settings.discussionTimerMinutes).toBe(5);
  });
  it('state awal valid (round-trip JSON)', () => {
    const initial = getInitialState();
    const round = parseSavedState(JSON.parse(JSON.stringify(initial)), STATE_VERSION);
    expect(round).toEqual(initial);
  });
  it('nama berisi HTML tetap sebagai teks biasa', () => {
    const s = parseSavedState(
      legacy({ phase: 'SETUP', turnQueue: [], turnIndex: 0, players: [{ id: 'a', name: '<img onerror=x>', role: null, isAlive: true, deathCause: null, deathRound: null }] }),
      3,
    );
    expect(s?.players[0]?.name).toBe('<img onerror=x>');
  });
});

describe('readEnvelope', () => {
  it('mengenali format zustand, format asli, kosong, dan korup', () => {
    expect(readEnvelope(null)).toBeNull();
    expect(readEnvelope('{bukan json')).toBe('corrupt');
    expect(readEnvelope('123')).toBe('corrupt');
    expect(readEnvelope('{"state":{"a":1},"version":4}')).toEqual({ state: { a: 1 }, version: 4 });
    expect(readEnvelope('{"phase":"SETUP"}')).toEqual({ state: { phase: 'SETUP' }, version: 3 });
  });
});

describe('narrate', () => {
  const base = getInitialState();
  it('tidak menyebut role pada narasi malam', () => {
    const intro: GameState = { ...base, phase: 'NIGHT_INTRO', cardStep: null, hunterStep: null };
    const text = narrate(base, intro) ?? '';
    expect(text).toMatch(/Malam telah tiba/);
    expect(text).not.toMatch(/werewolf|seer|doctor|guardian|hunter|villager/i);
  });
  it('privacy blur (ACTION -> HANDOVER) tidak mengulang narasi', () => {
    const action: GameState = { ...base, phase: 'NIGHT_ACTION', cardStep: 'action', hunterStep: null };
    const handover: GameState = { ...base, phase: 'NIGHT_HANDOVER', cardStep: 'cover', hunterStep: null };
    expect(narrate(action, handover)).toBeNull();
  });
  it('fajar tanpa korban', () => {
    const closing: GameState = { ...base, phase: 'NIGHT_CLOSING', cardStep: 'closing', hunterStep: null };
    const dawn: GameState = { ...base, phase: 'DAWN_REPORT', cardStep: null, hunterStep: null, dawnSummary: { deadPlayers: [] } };
    expect(narrate(closing, dawn)).toBe('Fajar tiba. Malam ini, tidak ada korban.');
  });
});

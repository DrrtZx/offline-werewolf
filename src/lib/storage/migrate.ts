import {
  MAX_PLAYERS,
  PHASES,
  ROLES,
  STATE_VERSION,
  type DeathCause,
  type DiscussionTimerState,
  type FinalRoles,
  type GameBase,
  type GameSettings,
  type GameState,
  type HunterOrigin,
  type HunterStep,
  type NightActions,
  type PhaseState,
  type Player,
  type Role,
  type RoleConfig,
  type RoleCount,
  type RoleStatus,
  type SetupStep,
  type Winner,
} from '@/types/game';
import { recoverState } from '@/lib/engine/recovery';
import { defaultRoleConfig, defaultSettings, emptyNightActions } from '@/lib/engine/reducer';
import { TIMER_OFF } from '@/lib/engine/timer';

// --------------------------------------------------------------------------
// Guard kecil (tanpa library schema)
// --------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
function isInt(v: unknown, min = 0): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min;
}
function isBool(v: unknown): v is boolean {
  return typeof v === 'boolean';
}
function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}
function strOrNull(v: unknown): string | null {
  return isString(v) ? v : null;
}
function stringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (!isString(item)) return null;
    out.push(item);
  }
  return out;
}

const DEATH_CAUSES: readonly DeathCause[] = ['wolf_attack', 'hunter_shot', 'vote_lynch'];
const SETUP_STEPS: readonly SetupStep[] = ['players', 'roles', 'settings', 'summary'];
const STATUSES: readonly RoleStatus[] = ['must', 'random', 'off'];
const HUNTER_STEPS: readonly HunterStep[] = ['public', 'cover', 'action', 'closing'];

function parsePlayer(v: unknown): Player | null {
  if (!isRecord(v)) return null;
  const { id, name, role, isAlive, deathCause, deathRound } = v;
  if (!isString(id) || !isString(name)) return null;
  if (role !== null && !isOneOf<Role>(role, ROLES)) return null;
  if (!isBool(isAlive)) return null;
  const cause = deathCause === null || deathCause === undefined ? null : deathCause;
  if (cause !== null && !isOneOf<DeathCause>(cause, DEATH_CAUSES)) return null;
  const round = deathRound === null || deathRound === undefined ? null : deathRound;
  if (round !== null && !isInt(round)) return null;
  return { id, name, role: role ?? null, isAlive, deathCause: cause, deathRound: round };
}

function parsePlayers(v: unknown): Player[] | null {
  if (!Array.isArray(v) || v.length > MAX_PLAYERS) return null;
  const out: Player[] = [];
  const ids = new Set<string>();
  for (const item of v) {
    const p = parsePlayer(item);
    if (!p || ids.has(p.id)) return null;
    ids.add(p.id);
    out.push(p);
  }
  return out;
}

function parseVotes(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (isString(val)) out[k] = val;
  }
  return out;
}

function parseNightActions(v: unknown): NightActions {
  const base = emptyNightActions();
  if (!isRecord(v)) return base;
  return {
    wolfVotes: parseVotes(v.wolfVotes),
    hunterVotes: parseVotes(v.hunterVotes),
    doctorTarget: strOrNull(v.doctorTarget) ?? base.doctorTarget,
    guardianTarget: strOrNull(v.guardianTarget) ?? base.guardianTarget,
    seerTarget: strOrNull(v.seerTarget) ?? base.seerTarget,
  };
}

function parseSettings(v: unknown): GameSettings {
  const d = defaultSettings();
  if (!isRecord(v)) return d;
  const num = (x: unknown, fallback: number, min: number): number => (isInt(x, min) ? x : fallback);
  return {
    revealDeadRole: isBool(v.revealDeadRole) ? v.revealDeadRole : d.revealDeadRole,
    showWolfTeam: isBool(v.showWolfTeam) ? v.showWolfTeam : d.showWolfTeam,
    showHunterTeam: isBool(v.showHunterTeam) ? v.showHunterTeam : d.showHunterTeam,
    discussionTimerMinutes: num(v.discussionTimerMinutes, d.discussionTimerMinutes, 0),
    minNightDurationSeconds: num(v.minNightDurationSeconds, d.minNightDurationSeconds, 1),
    doctorSelfProtect: isBool(v.doctorSelfProtect) ? v.doctorSelfProtect : d.doctorSelfProtect,
    hunterMandatory: isBool(v.hunterMandatory) ? v.hunterMandatory : d.hunterMandatory,
    ttsEnabled: isBool(v.ttsEnabled) ? v.ttsEnabled : d.ttsEnabled,
  };
}

function parseRoleConfig(v: unknown): RoleConfig {
  const d = defaultRoleConfig();
  if (!isRecord(v)) return d;
  const count = (x: unknown, fallback: RoleCount): RoleCount => {
    if (x === 'auto') return 'auto';
    if (isInt(x)) return x;
    // versi asli bisa menyimpan angka sebagai string
    if (isString(x) && /^\d+$/.test(x)) return Number.parseInt(x, 10);
    return fallback;
  };
  const status = (x: unknown, fallback: RoleStatus): RoleStatus => (isOneOf<RoleStatus>(x, STATUSES) ? x : fallback);
  return {
    werewolf: count(v.werewolf, d.werewolf),
    hunter: count(v.hunter, d.hunter),
    seer: status(v.seer, d.seer),
    doctor: status(v.doctor, d.doctor),
    guardian: status(v.guardian, d.guardian),
  };
}

function parseFinalRoles(v: unknown): FinalRoles | null {
  if (!isRecord(v)) return null;
  const { werewolf, hunter, seer, doctor, guardian, villager } = v;
  if (
    isInt(werewolf) && isInt(hunter) && isInt(seer) && isInt(doctor) && isInt(guardian) && isInt(villager)
  ) {
    return { werewolf, hunter, seer, doctor, guardian, villager };
  }
  return null;
}

function parseTimer(v: unknown, version: number, minutes: number): DiscussionTimerState {
  if (version >= 4 && isRecord(v)) {
    const { endsAt, remainingMs, isPaused } = v;
    if (
      (endsAt === null || (typeof endsAt === 'number' && Number.isFinite(endsAt))) &&
      typeof remainingMs === 'number' && Number.isFinite(remainingMs) && remainingMs >= 0 &&
      isBool(isPaused)
    ) {
      return { endsAt, remainingMs, isPaused };
    }
  }
  // Migrasi dari v3 (tidak ada timer tersimpan): mulai dijeda dengan durasi penuh.
  return minutes > 0 ? { endsAt: null, remainingMs: minutes * 60_000, isPaused: true } : TIMER_OFF;
}

// --------------------------------------------------------------------------
// Normalisasi + validasi
// --------------------------------------------------------------------------

/**
 * Validasi bentuk data tersimpan dan ubah menjadi `GameState` yang bersih.
 * Mengembalikan `null` bila data tidak dapat dipakai.
 * `version` 3 = format versi asli (variabel sub-step belum tersimpan).
 */
export function parseSavedState(raw: unknown, version: number): GameState | null {
  if (!isRecord(raw)) return null;
  if (!isInt(version, 3) || version > STATE_VERSION) return null;

  const phase = raw.phase;
  if (!isOneOf(phase, PHASES)) return null;

  const players = parsePlayers(raw.players);
  if (!players) return null;
  const playerIds = new Set(players.map((p) => p.id));

  const settings = parseSettings(raw.settings);
  const turnQueue = stringArray(raw.turnQueue) ?? [];
  if (!turnQueue.every((id) => playerIds.has(id))) return null;
  const turnIndex = isInt(raw.turnIndex) ? raw.turnIndex : 0;
  const round = isInt(raw.round, 1) ? raw.round : 1;

  const hunterQueue = (stringArray(raw.hunterQueue) ?? []).filter((id) => playerIds.has(id));
  const activeHunterShooterId = strOrNull(raw.activeHunterShooterId);

  const dayEliminatedPlayer = raw.dayEliminatedPlayer == null ? null : parsePlayer(raw.dayEliminatedPlayer);
  if (raw.dayEliminatedPlayer != null && !dayEliminatedPlayer) return null;

  let dawnSummary: GameBase['dawnSummary'] = null;
  if (isRecord(raw.dawnSummary)) {
    const dead = parsePlayers(raw.dawnSummary.deadPlayers);
    if (!dead) return null;
    dawnSummary = { deadPlayers: dead };
  }

  const winner: Winner | null = raw.winner === 'wolf' || raw.winner === 'village' ? raw.winner : null;

  const rawHistory = isRecord(raw.history) ? raw.history : {};
  const history = {
    lastDoctorTarget: strOrNull(rawHistory.lastDoctorTarget),
    doctorSelfUsed: isBool(rawHistory.doctorSelfUsed) ? rawHistory.doctorSelfUsed : false,
    log: [] as string[],
  };

  const hunterOriginRaw = raw.hunterOrigin;
  let hunterOrigin: HunterOrigin | null =
    hunterOriginRaw === 'night' || hunterOriginRaw === 'day' ? hunterOriginRaw : null;
  if (phase === 'HUNTER_TRIGGER' && hunterOrigin === null) {
    hunterOrigin = dayEliminatedPlayer ? 'day' : 'night';
  }

  const base: GameBase = {
    setupStep: isOneOf<SetupStep>(raw.setupStep, SETUP_STEPS) ? raw.setupStep : 'players',
    players,
    roleConfig: parseRoleConfig(raw.roleConfig),
    settings,
    round,
    finalRoles: parseFinalRoles(raw.finalRoles),
    turnQueue,
    turnIndex,
    nightActions: parseNightActions(raw.nightActions),
    aimedTargetId: strOrNull(raw.aimedTargetId),
    history,
    hunterQueue,
    activeHunterShooterId,
    lastHunterVictimId: strOrNull(raw.lastHunterVictimId),
    hunterOrigin,
    dawnSummary,
    dayEliminatedPlayer,
    discussionTimer: phase === 'DAY_PHASE' ? parseTimer(raw.discussionTimer, version, settings.discussionTimerMinutes) : TIMER_OFF,
    winner,
    _version: STATE_VERSION,
  };

  // Konsistensi per fase
  if (phase !== 'SETUP') {
    if (players.length < 4 || players.some((p) => p.role === null)) return null;
  }
  const needsQueue =
    phase === 'ROLE_REVEAL' || phase === 'NIGHT_HANDOVER' || phase === 'NIGHT_ACTION' || phase === 'NIGHT_CLOSING';
  if (needsQueue && (turnQueue.length === 0 || turnIndex >= turnQueue.length)) return null;
  if (phase === 'HUNTER_TRIGGER' && (activeHunterShooterId === null || !playerIds.has(activeHunterShooterId))) {
    return null;
  }
  if (phase === 'GAME_OVER' && winner === null) return null;

  let ps: PhaseState;
  switch (phase) {
    case 'ROLE_REVEAL': {
      const step = raw.cardStep === 'card' || raw.cardStep === 'closing' ? raw.cardStep : 'cover';
      ps = { phase, cardStep: step, hunterStep: null };
      break;
    }
    case 'NIGHT_HANDOVER':
      ps = { phase, cardStep: 'cover', hunterStep: null };
      break;
    case 'NIGHT_ACTION':
      ps = { phase, cardStep: 'action', hunterStep: null };
      break;
    case 'NIGHT_CLOSING':
      ps = { phase, cardStep: 'closing', hunterStep: null };
      break;
    case 'HUNTER_TRIGGER': {
      const step = isOneOf<HunterStep>(raw.hunterStep, HUNTER_STEPS) ? raw.hunterStep : 'public';
      ps = { phase, cardStep: null, hunterStep: step };
      break;
    }
    default:
      ps = { phase, cardStep: null, hunterStep: null };
  }

  return recoverState({ ...base, ...ps });
}

/** Dipakai oleh `persist.migrate`: ubah data versi lama menjadi `GameState` v4 (atau lempar galat). */
export function migrateSaved(persisted: unknown, version: number): GameState {
  const state = parseSavedState(persisted, version);
  if (!state) throw new Error('Data permainan tersimpan tidak valid.');
  return state;
}

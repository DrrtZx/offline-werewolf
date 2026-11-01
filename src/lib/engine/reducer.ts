import {
  MAX_PLAYERS,
  STATE_VERSION,
  type GameAction,
  type GameBase,
  type GameSettings,
  type GameState,
  type HunterOrigin,
  type NightActions,
  type Player,
  type PhaseState,
  type ReducerEnv,
  type Role,
  type RoleConfig,
  type RoleStatus,
  type Winner,
} from '@/types/game';
import { getHunterQueue, resolveDawn } from './dawn';
import { applyNightChoice, getNightActionCard, isValidNightChoice } from './night';
import { calculateFinalRoles, getPreset, maxWolvesFor } from './presets';
import { POOL_ORDER } from './roles';
import { shuffleArray } from './rng';
import { addTime, startTimer, TIMER_OFF, toggleTimer } from './timer';
import { checkAddPlayer, validateSetup } from './validation';
import { checkWinCondition } from './win';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

export const QUICK_FILL_NAMES: readonly string[] = Array.from({ length: MAX_PLAYERS }, (_, i) => `Player ${i + 1}`);

export function createPlayer(id: string, name: string): Player {
  return { id, name, role: null, isAlive: true, deathCause: null, deathRound: null };
}

export function emptyNightActions(): NightActions {
  return { wolfVotes: {}, hunterVotes: {}, doctorTarget: null, guardianTarget: null, seerTarget: null };
}

export function defaultSettings(): GameSettings {
  return {
    revealDeadRole: true,
    showWolfTeam: true,
    showHunterTeam: true,
    discussionTimerMinutes: 5,
    minNightDurationSeconds: 8,
    doctorSelfProtect: true,
    hunterMandatory: false,
    ttsEnabled: true,
  };
}

export function defaultRoleConfig(): RoleConfig {
  return { werewolf: 'auto', hunter: 'auto', seer: 'must', doctor: 'must', guardian: 'off' };
}

export function getInitialState(): GameState {
  return {
    phase: 'SETUP',
    cardStep: null,
    hunterStep: null,
    setupStep: 'players',
    players: QUICK_FILL_NAMES.slice(0, 6).map((name, i) => createPlayer(`p${i + 1}`, name)),
    roleConfig: defaultRoleConfig(),
    settings: defaultSettings(),
    round: 1,
    finalRoles: null,
    turnQueue: [],
    turnIndex: 0,
    nightActions: emptyNightActions(),
    aimedTargetId: null,
    history: { lastDoctorTarget: null, doctorSelfUsed: false, log: [] },
    hunterQueue: [],
    activeHunterShooterId: null,
    lastHunterVictimId: null,
    hunterOrigin: null,
    dawnSummary: null,
    dayEliminatedPlayer: null,
    discussionTimer: TIMER_OFF,
    winner: null,
    _version: STATE_VERSION,
  };
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

type Patch = Partial<GameBase>;

function to(state: GameState, ps: PhaseState, patch: Patch = {}): GameState {
  return { ...state, ...patch, ...ps };
}

function withPatch(state: GameState, patch: Patch): GameState {
  return { ...state, ...patch };
}

function markDead(players: readonly Player[], id: string, cause: Player['deathCause'], round: number): Player[] {
  return players.map((p) => (p.id === id ? { ...p, isAlive: false, deathCause: cause, deathRound: round } : p));
}

function endGame(state: GameState, winner: Winner, patch: Patch = {}): GameState {
  return to(state, { phase: 'GAME_OVER', cardStep: null, hunterStep: null }, { ...patch, winner });
}

function startNight(state: GameState, env: ReducerEnv, patch: Patch = {}): GameState {
  const living = state.players.filter((p) => p.isAlive).map((p) => p.id);
  return to(
    state,
    { phase: 'NIGHT_INTRO', cardStep: null, hunterStep: null },
    {
      ...patch,
      turnQueue: shuffleArray(living, env.rng),
      turnIndex: 0,
      nightActions: emptyNightActions(),
      aimedTargetId: null,
      hunterQueue: [],
      activeHunterShooterId: null,
      lastHunterVictimId: null,
      hunterOrigin: null,
      // Perbaikan bug asli #2: tidak boleh bocor antar-ronde.
      dayEliminatedPlayer: null,
      discussionTimer: TIMER_OFF,
    },
  );
}

/** Mulai tembakan Hunter berikutnya dari antrean, atau selesaikan alur bila antrean kosong. */
function advanceHunterQueue(state: GameState, queue: readonly string[], origin: HunterOrigin, patch: Patch = {}): GameState {
  const [nextId, ...rest] = queue;
  if (nextId === undefined) {
    return finishHunterFlow(withPatch(state, { ...patch, hunterQueue: [] }), origin);
  }
  return to(
    state,
    { phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'public' },
    { ...patch, hunterQueue: rest, activeHunterShooterId: nextId, hunterOrigin: origin },
  );
}

function finishHunterFlow(state: GameState, origin: HunterOrigin): GameState {
  const winner = checkWinCondition(state.players);
  if (winner) return endGame(state, winner, { hunterQueue: [], activeHunterShooterId: null });
  const next: PhaseState =
    origin === 'day'
      ? { phase: 'DAY_RESULT', cardStep: null, hunterStep: null }
      : { phase: 'DAWN_REPORT', cardStep: null, hunterStep: null };
  return to(state, next, { activeHunterShooterId: null });
}

function resolveNight(state: GameState, env: ReducerEnv): GameState {
  const res = resolveDawn(state.players, state.nightActions, state.round, env.rng);
  const queue = getHunterQueue(res.deadPlayers);
  const patch: Patch = {
    players: res.players,
    history: { ...state.history, lastDoctorTarget: state.nightActions.doctorTarget },
    aimedTargetId: res.aimedTargetId,
    dawnSummary: { deadPlayers: res.deadPlayers },
    dayEliminatedPlayer: null,
  };

  if (queue.length > 0) return advanceHunterQueue(state, queue, 'night', patch);

  const winner = checkWinCondition(res.players);
  if (winner) return endGame(state, winner, patch);
  return to(state, { phase: 'DAWN_REPORT', cardStep: null, hunterStep: null }, patch);
}

function currentTurnPlayer(state: GameState): Player | undefined {
  const id = state.turnQueue[state.turnIndex];
  return id === undefined ? undefined : state.players.find((p) => p.id === id);
}

function newPlayerId(players: readonly Player[], env: ReducerEnv): string {
  const taken = new Set(players.map((p) => p.id));
  let attempt = 0;
  for (;;) {
    const id = `p_${env.now.toString(36)}_${env.rng(0, 36 ** 4 - 1).toString(36)}${attempt ? `_${attempt}` : ''}`;
    if (!taken.has(id)) return id;
    attempt++;
  }
}

const STATUSES: readonly RoleStatus[] = ['must', 'random', 'off'];

function pickStatus(env: ReducerEnv): RoleStatus {
  return STATUSES[env.rng(0, 2)] ?? 'off';
}

// --------------------------------------------------------------------------
// Reducer
// --------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction, env: ReducerEnv): GameState {
  switch (action.type) {
    // ----- Setup -----
    case 'SETUP_STEP':
      return state.phase === 'SETUP' ? withPatch(state, { setupStep: action.step }) : state;

    case 'ADD_PLAYER': {
      if (state.phase !== 'SETUP') return state;
      const check = checkAddPlayer(state.players, action.name);
      if (!check.ok) return state;
      return withPatch(state, {
        players: [...state.players, createPlayer(newPlayerId(state.players, env), check.name)],
      });
    }

    case 'REMOVE_PLAYER':
      if (state.phase !== 'SETUP') return state;
      return withPatch(state, { players: state.players.filter((p) => p.id !== action.playerId) });

    case 'CLEAR_PLAYERS':
      return state.phase === 'SETUP' ? withPatch(state, { players: [] }) : state;

    case 'QUICK_FILL_PLAYERS': {
      if (state.phase !== 'SETUP') return state;
      const count = Math.max(0, Math.min(QUICK_FILL_NAMES.length, Math.trunc(action.count)));
      return withPatch(state, {
        players: QUICK_FILL_NAMES.slice(0, count).map((name, i) => createPlayer(`p${i + 1}`, name)),
      });
    }

    case 'ADJUST_ROLE_COUNT': {
      if (state.phase !== 'SETUP') return state;
      const N = state.players.length;
      const roles = calculateFinalRoles(N, state.roleConfig, env.rng);
      const current = roles[action.role];
      if (action.role === 'werewolf') {
        const next = Math.max(1, Math.min(maxWolvesFor(N), current + action.delta));
        return withPatch(state, { roleConfig: { ...state.roleConfig, werewolf: next } });
      }
      const next = Math.max(0, Math.min(N - roles.werewolf - 1, current + action.delta));
      return withPatch(state, { roleConfig: { ...state.roleConfig, hunter: next } });
    }

    case 'SET_ROLE_STATUS':
      if (state.phase !== 'SETUP') return state;
      return withPatch(state, { roleConfig: { ...state.roleConfig, [action.role]: action.status } });

    case 'APPLY_PRESET': {
      if (state.phase !== 'SETUP') return state;
      const p = getPreset(state.players.length);
      return withPatch(state, {
        roleConfig: { werewolf: p.werewolf, hunter: p.hunter, seer: p.seer, doctor: p.doctor, guardian: p.guardian },
      });
    }

    case 'RANDOMIZE_ALL_ROLES': {
      if (state.phase !== 'SETUP') return state;
      const N = state.players.length;
      const maxW = Math.min(4, Math.floor((N - 1) / 2));
      const werewolf = env.rng(1, Math.max(1, maxW));
      const hunter = env.rng(0, 2);
      const seer = pickStatus(env);
      const doctor = pickStatus(env);
      const guardian = pickStatus(env);
      return withPatch(state, { roleConfig: { werewolf, hunter, seer, doctor, guardian } });
    }

    case 'TOGGLE_SETTING':
      return withPatch(state, { settings: { ...state.settings, [action.key]: !state.settings[action.key] } });

    case 'SET_NIGHT_DURATION':
      return Number.isFinite(action.seconds)
        ? withPatch(state, {
            settings: { ...state.settings, minNightDurationSeconds: Math.max(1, Math.trunc(action.seconds)) },
          })
        : state;

    case 'SET_DISCUSSION_TIMER':
      return Number.isFinite(action.minutes)
        ? withPatch(state, {
            settings: { ...state.settings, discussionTimerMinutes: Math.max(0, Math.trunc(action.minutes)) },
          })
        : state;

    // ----- Start & role reveal -----
    case 'START_GAME': {
      if (state.phase !== 'SETUP') return state;
      const val = validateSetup(state.players, state.roleConfig, env.rng);
      if (!val.valid) return state;

      const pool: Role[] = [];
      for (const role of POOL_ORDER) {
        for (let i = 0; i < val.roles[role]; i++) pool.push(role);
      }
      const shuffled = shuffleArray(pool, env.rng);
      const players = state.players.map((p, idx) => ({
        ...p,
        role: shuffled[idx] ?? 'villager',
        isAlive: true,
        deathCause: null,
        deathRound: null,
      }));

      return to(
        state,
        { phase: 'ROLE_REVEAL', cardStep: 'cover', hunterStep: null },
        {
          players,
          finalRoles: val.roles,
          turnQueue: shuffleArray(
            players.map((p) => p.id),
            env.rng,
          ),
          turnIndex: 0,
          round: 1,
          nightActions: emptyNightActions(),
          history: { lastDoctorTarget: null, doctorSelfUsed: false, log: [] },
          hunterQueue: [],
          activeHunterShooterId: null,
          lastHunterVictimId: null,
          hunterOrigin: null,
          dawnSummary: null,
          dayEliminatedPlayer: null,
          aimedTargetId: null,
          discussionTimer: TIMER_OFF,
          winner: null,
        },
      );
    }

    case 'REVEAL_OPEN':
      if (state.phase !== 'ROLE_REVEAL' || state.cardStep !== 'cover') return state;
      return to(state, { phase: 'ROLE_REVEAL', cardStep: 'card', hunterStep: null });

    case 'REVEAL_CLOSE':
      if (state.phase !== 'ROLE_REVEAL' || state.cardStep !== 'card') return state;
      return to(state, { phase: 'ROLE_REVEAL', cardStep: 'closing', hunterStep: null });

    case 'REVEAL_NEXT': {
      if (state.phase !== 'ROLE_REVEAL' || state.cardStep !== 'closing') return state;
      const nextIndex = state.turnIndex + 1;
      if (nextIndex >= state.turnQueue.length) return startNight(state, env);
      return to(state, { phase: 'ROLE_REVEAL', cardStep: 'cover', hunterStep: null }, { turnIndex: nextIndex });
    }

    // ----- Night -----
    case 'NIGHT_BEGIN':
      if (state.phase !== 'NIGHT_INTRO') return state;
      return to(state, { phase: 'NIGHT_HANDOVER', cardStep: 'cover', hunterStep: null });

    case 'NIGHT_OPEN_ACTION':
      if (state.phase !== 'NIGHT_HANDOVER') return state;
      return to(state, { phase: 'NIGHT_ACTION', cardStep: 'action', hunterStep: null });

    case 'NIGHT_CONFIRM': {
      if (state.phase !== 'NIGHT_ACTION') return state;
      const player = currentTurnPlayer(state);
      if (!player) return state;
      const card = getNightActionCard({
        player,
        players: state.players,
        history: state.history,
        nightActions: state.nightActions,
        doctorSelfProtect: state.settings.doctorSelfProtect,
        round: state.round,
        turnIndex: state.turnIndex,
      });
      if (!isValidNightChoice(card, action.targetId)) return state;
      const applied = applyNightChoice(player, action.targetId, state.nightActions, state.history);
      return to(
        state,
        { phase: 'NIGHT_CLOSING', cardStep: 'closing', hunterStep: null },
        { nightActions: applied.nightActions, history: applied.history },
      );
    }

    case 'PRIVACY_BLUR':
      // Perbaikan bug asli #1: kembali ke cover (bukan kartu aksi tanpa timer).
      if (state.phase !== 'NIGHT_ACTION') return state;
      return to(state, { phase: 'NIGHT_HANDOVER', cardStep: 'cover', hunterStep: null });

    case 'NIGHT_NEXT': {
      if (state.phase !== 'NIGHT_CLOSING') return state;
      const nextIndex = state.turnIndex + 1;
      if (nextIndex >= state.turnQueue.length) {
        return resolveNight(withPatch(state, { turnIndex: nextIndex }), env);
      }
      return to(state, { phase: 'NIGHT_HANDOVER', cardStep: 'cover', hunterStep: null }, { turnIndex: nextIndex });
    }

    // ----- Dawn -----
    case 'DAWN_CONTINUE':
      if (state.phase !== 'DAWN_REPORT') return state;
      return to(
        state,
        { phase: 'DAY_PHASE', cardStep: null, hunterStep: null },
        {
          dayEliminatedPlayer: null,
          discussionTimer: startTimer(state.settings.discussionTimerMinutes, env.now),
        },
      );

    // ----- Hunter -----
    case 'HUNTER_PUBLIC_NEXT':
      if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'public') return state;
      return to(state, { phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'cover' });

    case 'HUNTER_COVER_OPEN':
      if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'cover') return state;
      return to(state, { phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'action' });

    case 'HUNTER_CONFIRM': {
      if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'action') return state;
      const shooterId = state.activeHunterShooterId;
      const victim = state.players.find((p) => p.id === action.targetId);
      if (!victim || !victim.isAlive || victim.id === shooterId) return state;

      return to(
        state,
        { phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'closing' },
        {
          players: markDead(state.players, victim.id, 'hunter_shot', state.round),
          hunterQueue: victim.role === 'hunter' ? [...state.hunterQueue, victim.id] : state.hunterQueue,
          lastHunterVictimId: victim.id,
        },
      );
    }

    case 'HUNTER_SKIP':
      if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'action' || state.settings.hunterMandatory) return state;
      return to(
        state,
        { phase: 'HUNTER_TRIGGER', cardStep: null, hunterStep: 'closing' },
        { lastHunterVictimId: null },
      );

    case 'HUNTER_DONE': {
      if (state.phase !== 'HUNTER_TRIGGER' || state.hunterStep !== 'closing') return state;
      const origin: HunterOrigin = state.hunterOrigin ?? (state.dayEliminatedPlayer ? 'day' : 'night');
      return advanceHunterQueue(state, state.hunterQueue, origin);
    }

    // ----- Day -----
    case 'TIMER_ADD':
      if (state.phase !== 'DAY_PHASE') return state;
      return withPatch(state, { discussionTimer: addTime(state.discussionTimer, action.ms, env.now) });

    case 'TIMER_TOGGLE':
      if (state.phase !== 'DAY_PHASE') return state;
      return withPatch(state, { discussionTimer: toggleTimer(state.discussionTimer, env.now) });

    case 'ELIMINATE_PLAYER': {
      if (state.phase !== 'DAY_PHASE') return state;
      const target = state.players.find((p) => p.id === action.playerId);
      if (!target || !target.isAlive) return state;

      const players = markDead(state.players, target.id, 'vote_lynch', state.round);
      const eliminated = players.find((p) => p.id === target.id) ?? null;
      const patch: Patch = {
        players,
        dayEliminatedPlayer: eliminated,
        discussionTimer: TIMER_OFF,
        hunterQueue: [],
      };

      if (target.role === 'hunter') return advanceHunterQueue(state, [target.id], 'day', patch);

      const winner = checkWinCondition(players);
      if (winner) return endGame(state, winner, patch);
      return to(state, { phase: 'DAY_RESULT', cardStep: null, hunterStep: null }, patch);
    }

    case 'SKIP_DAY_VOTE':
      if (state.phase !== 'DAY_PHASE') return state;
      return to(
        state,
        { phase: 'DAY_RESULT', cardStep: null, hunterStep: null },
        { dayEliminatedPlayer: null, discussionTimer: TIMER_OFF },
      );

    case 'NEXT_NIGHT':
      if (state.phase !== 'DAY_RESULT') return state;
      return startNight(state, env, { round: state.round + 1 });

    // ----- Reset -----
    case 'RESET_GAME': {
      const fresh = getInitialState();
      if (action.fullReset) return fresh;
      return {
        ...fresh,
        players: state.players.map((p) => createPlayer(p.id, p.name)),
        roleConfig: state.roleConfig,
        settings: state.settings,
      };
    }

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

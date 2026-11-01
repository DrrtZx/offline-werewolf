// ==========================================================================
// GAME TYPES - Type definitions for Werewolf Pass-and-Play
// ==========================================================================

export const ROLES = ['werewolf', 'villager', 'seer', 'doctor', 'guardian', 'hunter'] as const;
export type Role = (typeof ROLES)[number];

export type RoleTeam = 'Serigala' | 'Warga';
export type TeamTone = 'wolf' | 'village' | 'special';

/** Mode untuk role opsional (seer / doctor / guardian). */
export type RoleStatus = 'must' | 'random' | 'off';
/** Mode untuk role berjumlah (werewolf / hunter): `auto` memakai preset, angka = jumlah tetap. */
export type RoleCount = 'auto' | number;

export const PHASES = [
  'SETUP',
  'ROLE_REVEAL',
  'NIGHT_INTRO',
  'NIGHT_HANDOVER',
  'NIGHT_ACTION',
  'NIGHT_CLOSING',
  'DAWN_REPORT',
  'HUNTER_TRIGGER',
  'DAY_PHASE',
  'DAY_RESULT',
  'GAME_OVER',
] as const;
export type Phase = (typeof PHASES)[number];

export type CardStep = 'cover' | 'card' | 'action' | 'closing';
export type HunterStep = 'public' | 'cover' | 'action' | 'closing';
export type SetupStep = 'players' | 'roles' | 'settings' | 'summary';

export type DeathCause = 'wolf_attack' | 'hunter_shot' | 'vote_lynch';
export type Winner = 'wolf' | 'village';
export type HunterOrigin = 'night' | 'day';

export interface Player {
  id: string;
  name: string;
  role: Role | null;
  isAlive: boolean;
  deathCause: DeathCause | null;
  deathRound: number | null;
}

export interface RoleMeta {
  name: string;
  icon: string;
  team: RoleTeam;
  tone: TeamTone;
  desc: string;
}

export interface RoleConfig {
  werewolf: RoleCount;
  hunter: RoleCount;
  seer: RoleStatus;
  doctor: RoleStatus;
  guardian: RoleStatus;
}

export interface PresetConfig {
  werewolf: number;
  hunter: number;
  seer: RoleStatus;
  doctor: RoleStatus;
  guardian: RoleStatus;
}

export interface FinalRoles {
  werewolf: number;
  hunter: number;
  seer: number;
  doctor: number;
  guardian: number;
  villager: number;
}

export interface GameSettings {
  revealDeadRole: boolean;
  showWolfTeam: boolean;
  showHunterTeam: boolean;
  discussionTimerMinutes: number;
  minNightDurationSeconds: number;
  /** Didefinisikan di versi asli tetapi tidak dipakai logika game. */
  doctorSelfProtect: boolean;
  /** Didefinisikan di versi asli tetapi tidak dipakai logika game. */
  hunterMandatory: boolean;
  ttsEnabled: boolean;
}

export type BooleanSettingKey = {
  [K in keyof GameSettings]: GameSettings[K] extends boolean ? K : never;
}[keyof GameSettings];

export interface NightActions {
  wolfVotes: Record<string, string>;
  hunterVotes: Record<string, string>;
  doctorTarget: string | null;
  guardianTarget: string | null;
  seerTarget: string | null;
}

export interface GameHistory {
  lastDoctorTarget: string | null;
  doctorSelfUsed: boolean;
  log: string[];
}

export interface DawnSummary {
  deadPlayers: Player[];
}

/**
 * Timer diskusi berbasis timestamp.
 * - berjalan : `endsAt` terisi, `isPaused === false`
 * - dijeda   : `endsAt === null`, `isPaused === true`, sisa waktu ada di `remainingMs`
 * - mati     : `endsAt === null`, `isPaused === false`, `remainingMs === 0`
 */
export interface DiscussionTimerState {
  endsAt: number | null;
  remainingMs: number;
  isPaused: boolean;
}

export interface QuizPlayerQuestion {
  q: string;
  type: 'player';
}
export interface QuizCustomQuestion {
  q: string;
  type: 'custom';
  options: readonly [string, string, string, string];
}
export type QuizQuestion = QuizPlayerQuestion | QuizCustomQuestion;

export type RNG = (min: number, max: number) => number;

export interface NightOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface NightActionCard {
  title: string;
  options: NightOption[];
}

// --------------------------------------------------------------------------
// Game state (discriminated union pada `phase`, sub-step ikut tersimpan)
// --------------------------------------------------------------------------

export interface GameBase {
  setupStep: SetupStep;
  players: Player[];
  roleConfig: RoleConfig;
  settings: GameSettings;
  round: number;
  finalRoles: FinalRoles | null;

  turnQueue: string[];
  turnIndex: number;

  nightActions: NightActions;
  /** Target siaga Hunter hasil voting malam. */
  aimedTargetId: string | null;
  history: GameHistory;

  hunterQueue: string[];
  activeHunterShooterId: string | null;
  lastHunterVictimId: string | null;
  /** Asal pemicu tembakan Hunter: menentukan layar tujuan setelah rantai tembakan selesai. */
  hunterOrigin: HunterOrigin | null;

  dawnSummary: DawnSummary | null;
  dayEliminatedPlayer: Player | null;
  discussionTimer: DiscussionTimerState;

  winner: Winner | null;
  _version: number;
}

export type PhaseState =
  | {
      phase: 'SETUP' | 'NIGHT_INTRO' | 'DAWN_REPORT' | 'DAY_PHASE' | 'DAY_RESULT' | 'GAME_OVER';
      cardStep: null;
      hunterStep: null;
    }
  | { phase: 'ROLE_REVEAL'; cardStep: Extract<CardStep, 'cover' | 'card' | 'closing'>; hunterStep: null }
  | { phase: 'NIGHT_HANDOVER'; cardStep: Extract<CardStep, 'cover'>; hunterStep: null }
  | { phase: 'NIGHT_ACTION'; cardStep: Extract<CardStep, 'action'>; hunterStep: null }
  | { phase: 'NIGHT_CLOSING'; cardStep: Extract<CardStep, 'closing'>; hunterStep: null }
  | { phase: 'HUNTER_TRIGGER'; cardStep: null; hunterStep: HunterStep };

export type GameState = GameBase & PhaseState;

// --------------------------------------------------------------------------
// Actions
// --------------------------------------------------------------------------

export type GameAction =
  | { type: 'SETUP_STEP'; step: SetupStep }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'CLEAR_PLAYERS' }
  | { type: 'QUICK_FILL_PLAYERS'; count: number }
  | { type: 'ADJUST_ROLE_COUNT'; role: 'werewolf' | 'hunter'; delta: number }
  | { type: 'SET_ROLE_STATUS'; role: 'seer' | 'doctor' | 'guardian'; status: RoleStatus }
  | { type: 'APPLY_PRESET' }
  | { type: 'RANDOMIZE_ALL_ROLES' }
  | { type: 'TOGGLE_SETTING'; key: BooleanSettingKey }
  | { type: 'SET_NIGHT_DURATION'; seconds: number }
  | { type: 'SET_DISCUSSION_TIMER'; minutes: number }
  | { type: 'START_GAME' }
  | { type: 'REVEAL_OPEN' }
  | { type: 'REVEAL_CLOSE' }
  | { type: 'REVEAL_NEXT' }
  | { type: 'NIGHT_BEGIN' }
  | { type: 'NIGHT_OPEN_ACTION' }
  | { type: 'NIGHT_CONFIRM'; targetId: string }
  | { type: 'NIGHT_NEXT' }
  | { type: 'PRIVACY_BLUR' }
  | { type: 'DAWN_CONTINUE' }
  | { type: 'HUNTER_PUBLIC_NEXT' }
  | { type: 'HUNTER_COVER_OPEN' }
  | { type: 'HUNTER_CONFIRM'; targetId: string }
  | { type: 'HUNTER_DONE' }
  | { type: 'TIMER_ADD'; ms: number }
  | { type: 'TIMER_TOGGLE' }
  | { type: 'ELIMINATE_PLAYER'; playerId: string }
  | { type: 'SKIP_DAY_VOTE' }
  | { type: 'NEXT_NIGHT' }
  | { type: 'RESET_GAME'; fullReset: boolean };

export interface ReducerEnv {
  rng: RNG;
  /** Waktu saat ini (ms epoch) - di-inject agar reducer tetap murni. */
  now: number;
}

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

export const STORAGE_KEY = 'werewolf_pass_and_play_v3_state';
/** Versi skema state tersimpan. v3 = format versi asli (tanpa `_version`). */
export const STATE_VERSION = 4;
export const MAX_PLAYERS = 16;
export const MIN_PLAYERS = 4;
export const MAX_NAME_LENGTH = 12;

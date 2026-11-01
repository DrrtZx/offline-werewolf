import type { DiscussionTimerState } from '@/types/game';

export const TIMER_OFF: DiscussionTimerState = { endsAt: null, remainingMs: 0, isPaused: false };

export function startTimer(minutes: number, now: number): DiscussionTimerState {
  if (!(minutes > 0)) return TIMER_OFF;
  const ms = minutes * 60_000;
  return { endsAt: now + ms, remainingMs: ms, isPaused: false };
}

export function getRemainingMs(timer: DiscussionTimerState, now: number): number {
  if (timer.endsAt !== null) return Math.max(0, timer.endsAt - now);
  return Math.max(0, timer.remainingMs);
}

export function isTimerActive(timer: DiscussionTimerState): boolean {
  return timer.endsAt !== null || timer.isPaused;
}

export function addTime(timer: DiscussionTimerState, ms: number, now: number): DiscussionTimerState {
  if (!isTimerActive(timer)) return timer;
  if (timer.endsAt !== null) {
    return { ...timer, endsAt: Math.max(timer.endsAt, now) + ms };
  }
  return { ...timer, remainingMs: Math.max(0, timer.remainingMs) + ms };
}

export function toggleTimer(timer: DiscussionTimerState, now: number): DiscussionTimerState {
  if (!isTimerActive(timer)) return timer;
  if (timer.endsAt !== null) {
    return { endsAt: null, remainingMs: Math.max(0, timer.endsAt - now), isPaused: true };
  }
  return { endsAt: now + Math.max(0, timer.remainingMs), remainingMs: Math.max(0, timer.remainingMs), isPaused: false };
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

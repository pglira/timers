export interface Timer {
  id: string;
  name: string;
  durationMs: number;
  // Remaining time of a stopped timer.
  remainingMs: number;
  // Clock time at which a running timer gets to zero; null when stopped.
  endAt: number | null;
  finished: boolean;
}

const STORAGE_KEY = 'timers.v1';

export function loadTimers(): Timer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Timer[]) : [];
  } catch {
    return [];
  }
}

export function saveTimers(timers: Timer[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  } catch {
    // Storage is full or blocked; the timers stay in memory only.
  }
}

export function createTimer(name: string, durationMs: number): Timer {
  return {
    id: crypto.randomUUID(),
    name,
    durationMs,
    remainingMs: durationMs,
    endAt: null,
    finished: false,
  };
}

export function remainingMs(timer: Timer, now: number): number {
  return timer.endAt === null ? timer.remainingMs : Math.max(0, timer.endAt - now);
}

export function start(timer: Timer, now: number): Timer {
  if (timer.endAt !== null) return timer;
  // A finished timer starts again from its full duration.
  const remaining = timer.finished || timer.remainingMs <= 0 ? timer.durationMs : timer.remainingMs;
  return { ...timer, endAt: now + remaining, remainingMs: remaining, finished: false };
}

export function stop(timer: Timer, now: number): Timer {
  if (timer.endAt === null) return timer;
  return { ...timer, endAt: null, remainingMs: remainingMs(timer, now) };
}

export function reset(timer: Timer): Timer {
  return { ...timer, endAt: null, remainingMs: timer.durationMs, finished: false };
}

export function finish(timer: Timer): Timer {
  return { ...timer, endAt: null, remainingMs: 0, finished: true };
}

export function edit(timer: Timer, name: string, durationMs: number): Timer {
  if (durationMs === timer.durationMs) return { ...timer, name };
  return { ...timer, name, durationMs, remainingMs: durationMs, endAt: null, finished: false };
}

export function splitDuration(ms: number): { h: number; m: number; s: number } {
  const total = Math.ceil(ms / 1000);
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

export function formatDuration(ms: number): string {
  const { h, m, s } = splitDuration(ms);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

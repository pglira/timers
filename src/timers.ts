export interface Timer {
  id: string;
  name: string;
  color: string;
  durationMs: number;
  // Remaining time of a stopped timer.
  remainingMs: number;
  // Clock time at which a running timer gets to zero; null when stopped.
  endAt: number | null;
  finished: boolean;
}

const STORAGE_KEY = 'timers.v1';

// Colors that the user can select for a timer.
export const COLORS = [
  '#43a047',
  '#1e88e5',
  '#8e24aa',
  '#d81b60',
  '#f4511e',
  '#fb8c00',
  '#00897b',
  '#6d4c41',
];

// Return the first color that no timer uses, or cycle through COLORS when all
// colors are in use.
export function nextColor(timers: Timer[]): string {
  const used = new Set(timers.map((t) => t.color));
  return COLORS.find((c) => !used.has(c)) ?? COLORS[timers.length % COLORS.length];
}

export function loadTimers(): Timer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Timers stored without a color get the first color.
    return (parsed as Timer[]).map((t) => ({ ...t, color: t.color ?? COLORS[0] }));
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

export function createTimer(name: string, color: string, durationMs: number): Timer {
  return {
    id: crypto.randomUUID(),
    name,
    color,
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

// True for a timer that has not started since its last reset.
export function isIdle(timer: Timer): boolean {
  return timer.endAt === null && !timer.finished && timer.remainingMs === timer.durationMs;
}

// Set the remaining time and keep the running or stopped state.
function setRemaining(timer: Timer, leftMs: number, now: number): Timer {
  if (leftMs <= 0) return finish(timer);
  const endAt = timer.endAt === null ? null : now + leftMs;
  return { ...timer, endAt, remainingMs: leftMs, finished: false };
}

// Apply the values of the edit form. `leftMs` is a new remaining time, or null
// to keep the remaining time. An idle timer always gets its full duration. The
// duration is never less than the remaining time.
export function edit(
  timer: Timer,
  name: string,
  color: string,
  durationMs: number,
  leftMs: number | null,
  now: number,
): Timer {
  const base = { ...timer, name, color };
  if (leftMs === null) {
    if (durationMs === timer.durationMs) return base;
    if (isIdle(timer)) return reset({ ...base, durationMs });
    leftMs = Math.min(remainingMs(timer, now), durationMs);
  }
  return setRemaining({ ...base, durationMs: Math.max(durationMs, leftMs) }, leftMs, now);
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

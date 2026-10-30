import { type CSSProperties, useEffect, useState } from 'react';
import {
  COLORS,
  type Timer,
  createTimer,
  edit,
  finish,
  formatDuration,
  isIdle,
  loadTimers,
  nextColor,
  remainingMs,
  reset,
  saveTimers,
  splitDuration,
  start,
  stop,
} from './timers';
import { playBeep, unlockSound } from './sound';
import { useWakeLock } from './useWakeLock';
import { type Theme, useTheme } from './theme';

const THEME_ICONS: Record<Theme, string> = { auto: '◐', light: '☀\uFE0E', dark: '☾\uFE0E' };
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

// The icons are drawn in a 24×24 box with the shape at the center of the box.
function PauseIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" />
      <rect x="14" y="5" width="4" height="14" />
    </svg>
  );
}

// The triangle is shifted right so that its centroid is at the center of the box.
function PlayIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5 L20 12 L8 19 Z" />
    </svg>
  );
}

// A timer that got to zero more than this time ago finished while the app was
// in the background, so it gets no sound.
const SOUND_WINDOW_MS = 3000;

export default function App() {
  const [timers, setTimers] = useState<Timer[]>(loadTimers);
  const [now, setNow] = useState(Date.now);
  // The id of the timer in the edit form, 'new' for a new timer, or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();

  const anyRunning = timers.some((t) => t.endAt !== null);

  useEffect(() => saveTimers(timers), [timers]);

  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Mark running timers as finished when they get to zero.
  useEffect(() => {
    const done = timers.filter((t) => t.endAt !== null && t.endAt <= now);
    if (done.length === 0) return;
    if (
      document.visibilityState === 'visible' &&
      done.some((t) => now - (t.endAt as number) < SOUND_WINDOW_MS)
    ) {
      playBeep();
    }
    const ids = new Set(done.map((t) => t.id));
    setTimers((ts) => ts.map((t) => (ids.has(t.id) ? finish(t) : t)));
  }, [timers, now]);

  // Update the display at once when the app comes back to the foreground.
  useEffect(() => {
    const onVisibility = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useWakeLock(anyRunning);

  const update = (id: string, fn: (t: Timer) => Timer) =>
    setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  const toggle = (timer: Timer) => {
    unlockSound();
    const t = Date.now();
    setNow(t);
    update(timer.id, (x) => (x.endAt === null ? start(x, t) : stop(x, t)));
  };

  const editingTimer = timers.find((t) => t.id === editing);

  return (
    <main>
      <header>
        <h1>Timers</h1>
        <div className="header-buttons">
          <button
            className="theme"
            onClick={nextTheme}
            aria-label={THEME_LABELS[theme]}
            title={THEME_LABELS[theme]}
          >
            {THEME_ICONS[theme]}
          </button>
          <button className="add" onClick={() => setEditing('new')} aria-label="Add timer">
            +
          </button>
        </div>
      </header>

      {timers.length === 0 && editing === null && (
        <p className="empty">No timers. Tap + to add a timer.</p>
      )}

      <ul>
        {timers.map((timer) => {
          const running = timer.endAt !== null;
          const left = remainingMs(timer, now);
          const progress = timer.durationMs > 0 ? left / timer.durationMs : 0;
          const state = timer.finished ? 'finished' : running ? 'running' : 'stopped';
          return (
            <li
              key={timer.id}
              className={`timer ${state}`}
              style={{ '--color': timer.color } as CSSProperties}
            >
              <div className="bar" style={{ transform: `scaleX(${progress})` }} />
              <button className="info" onClick={() => setEditing(timer.id)}>
                <span className="name">{timer.name}</span>
                <span className="time">{formatDuration(left)}</span>
              </button>
              <div className="actions">
                <button
                  className="reset"
                  onClick={() => update(timer.id, reset)}
                  disabled={isIdle(timer)}
                  aria-label="Reset"
                >
                  ↺
                </button>
                <button
                  className="toggle"
                  onClick={() => toggle(timer)}
                  aria-label={running ? 'Stop' : 'Start'}
                >
                  {running ? <PauseIcon /> : <PlayIcon />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {editing !== null && (
        <TimerForm
          key={editing}
          timer={editingTimer}
          defaultColor={nextColor(timers)}
          onCancel={() => setEditing(null)}
          onSave={(name, color, durationMs, leftMs) => {
            if (editingTimer) {
              const t = Date.now();
              setNow(t);
              update(editingTimer.id, (x) => edit(x, name, color, durationMs, leftMs, t));
            } else {
              setTimers((ts) => [...ts, createTimer(name, color, durationMs)]);
            }
            setEditing(null);
          }}
          onDelete={
            editingTimer
              ? () => {
                  setTimers((ts) => ts.filter((t) => t.id !== editingTimer.id));
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

interface TimerFormProps {
  timer: Timer | undefined;
  defaultColor: string;
  // `leftMs` is the new remaining time, or null when the user did not change it.
  onSave: (name: string, color: string, durationMs: number, leftMs: number | null) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function TimerForm({ timer, defaultColor, onSave, onCancel, onDelete }: TimerFormProps) {
  // The fields for the remaining time show only for a timer that has started.
  const started = timer !== undefined && !isIdle(timer);
  const [name, setName] = useState(timer?.name ?? '');
  const [color, setColor] = useState(timer?.color ?? defaultColor);
  const duration = useDuration(timer?.durationMs ?? 5 * 60 * 1000);
  const left = useDuration(timer ? remainingMs(timer, Date.now()) : 0);

  const leftMs = started && left.changed ? left.ms : null;
  const valid = duration.ms > 0 && (leftMs === null || leftMs > 0);

  return (
    <div className="backdrop" onClick={onCancel}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(name.trim() || 'Timer', color, duration.ms, leftMs);
        }}
      >
        <h2>{timer ? 'Edit timer' : 'New timer'}</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Timer" />
        </label>
        <div className="colors" role="radiogroup" aria-label="Color">
          {COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={`Color ${i + 1}`}
              className="swatch"
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        {started && <DurationFields label="Time left" state={left} />}
        <DurationFields label="Duration" state={duration} />
        <div className="buttons">
          {onDelete && (
            <button type="button" className="delete" onClick={onDelete}>
              Delete
            </button>
          )}
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!valid}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

type DurationPart = 'h' | 'm' | 's';

// State of three input fields for hours, minutes and seconds.
function useDuration(initialMs: number) {
  const initial = splitDuration(initialMs);
  const [parts, setParts] = useState<Record<DurationPart, string>>({
    h: String(initial.h),
    m: String(initial.m),
    s: String(initial.s),
  });
  const [changed, setChanged] = useState(false);

  const toInt = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
  const ms = (toInt(parts.h) * 3600 + toInt(parts.m) * 60 + toInt(parts.s)) * 1000;
  const set = (part: DurationPart, value: string) => {
    setParts((p) => ({ ...p, [part]: value }));
    setChanged(true);
  };
  return { parts, set, ms, changed };
}

function DurationFields(props: { label: string; state: ReturnType<typeof useDuration> }) {
  const { parts, set } = props.state;
  return (
    <fieldset className="duration">
      <legend>{props.label}</legend>
      <DurationField label="h" value={parts.h} onChange={(v) => set('h', v)} />
      <DurationField label="min" value={parts.m} onChange={(v) => set('m', v)} />
      <DurationField label="s" value={parts.s} onChange={(v) => set('s', v)} />
    </fieldset>
  );
}

function DurationField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={props.value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {props.label}
    </label>
  );
}

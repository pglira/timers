import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
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
import { unlockSound } from './sound';
import { ALARM_MS, useAlarm } from './useAlarm';
import { useWakeLock } from './useWakeLock';
import { type Theme, useTheme } from './theme';
import { SwipeRow } from './SwipeRow';
import {
  AutoThemeIcon,
  DarkThemeIcon,
  LightThemeIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  ResetIcon,
} from './icons';

const THEME_ICONS: Record<Theme, ReactNode> = {
  auto: <AutoThemeIcon />,
  light: <LightThemeIcon />,
  dark: <DarkThemeIcon />,
};
const THEME_LABELS: Record<Theme, string> = {
  auto: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export default function App() {
  const [timers, setTimers] = useState<Timer[]>(loadTimers);
  const [now, setNow] = useState(Date.now);
  // The id of the timer in the edit form, 'new' for a new timer, or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [theme, nextTheme] = useTheme();
  // The time at which each timer with an active alarm got to zero, by id.
  const [alarms, setAlarms] = useState<Record<string, number>>({});

  const anyRunning = timers.some((t) => t.endAt !== null);

  useEffect(() => saveTimers(timers), [timers]);

  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [anyRunning]);

  // Mark running timers as finished when they get to zero and start their
  // alarms.
  useEffect(() => {
    const done = timers.filter((t) => t.endAt !== null && t.endAt <= now);
    if (done.length === 0) return;
    const ids = new Set(done.map((t) => t.id));
    setTimers((ts) => ts.map((t) => (ids.has(t.id) ? finish(t) : t)));
    const ends = Object.fromEntries(done.map((t) => [t.id, t.endAt as number]));
    setAlarms((a) => ({ ...a, ...ends }));
  }, [timers, now]);

  // An alarm stays active until the user stops it or changes its timer.
  const ringing = timers.filter((t) => t.id in alarms);
  // A timer that got to zero long ago, for example while the app was closed,
  // shows its alarm without sound.
  const loud = ringing.some((t) => Date.now() - alarms[t.id] < ALARM_MS);
  useAlarm(loud);
  const stopAlarms = () => setAlarms({});

  // Update the display at once when the app comes back to the foreground.
  useEffect(() => {
    const onVisibility = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useWakeLock(anyRunning);

  const clearAlarm = (id: string) =>
    setAlarms((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== id)));

  const update = (id: string, fn: (t: Timer) => Timer) => {
    clearAlarm(id);
    setTimers((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  };

  const remove = (id: string) => {
    clearAlarm(id);
    setTimers((ts) => ts.filter((t) => t.id !== id));
  };

  const toggle = (timer: Timer) => {
    unlockSound();
    const t = Date.now();
    setNow(t);
    update(timer.id, (x) => (x.endAt === null ? start(x, t) : stop(x, t)));
  };

  const editingTimer = timers.find((t) => t.id === editing);

  return (
    <main className={ringing.length > 0 ? 'alarm-shown' : undefined}>
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
            <PlusIcon />
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
          const alarm = timer.id in alarms ? ' alarm' : '';
          return (
            <SwipeRow
              key={timer.id}
              className={`timer ${state}${alarm}`}
              style={{ '--color': timer.color } as CSSProperties}
              onDelete={() => remove(timer.id)}
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
                  <ResetIcon />
                </button>
                <button
                  className="toggle"
                  onClick={() => toggle(timer)}
                  aria-label={running ? 'Stop' : 'Start'}
                >
                  {running ? <PauseIcon /> : <PlayIcon />}
                </button>
              </div>
            </SwipeRow>
          );
        })}
      </ul>

      {ringing.length > 0 && (
        <div className="alarm-banner" role="alert">
          <span className="alarm-names">
            {ringing.map((t) => t.name).join(', ')} finished
          </span>
          <button onClick={stopAlarms}>Stop</button>
        </div>
      )}

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
                  remove(editingTimer.id);
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

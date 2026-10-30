import { useEffect } from 'react';
import { playBeep } from './sound';

// Time between two beep groups of the alarm.
const REPEAT_MS = 1200;
// The alarm sound stops after this time, also without a tap on "Stop".
export const ALARM_MS = 60_000;

// Repeat the beep while `active` is true and the page is visible, for at most
// ALARM_MS.
export function useAlarm(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const ring = () => {
      if (document.visibilityState === 'visible') playBeep();
    };
    ring();
    const repeat = setInterval(ring, REPEAT_MS);
    const end = setTimeout(() => clearInterval(repeat), ALARM_MS);
    return () => {
      clearInterval(repeat);
      clearTimeout(end);
    };
  }, [active]);
}

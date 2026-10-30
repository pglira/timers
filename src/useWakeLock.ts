import { useEffect } from 'react';

// Hold a screen wake lock while `active` is true and the page is visible.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        // The browser refuses the lock, for example in low power mode.
      }
    };

    // The browser releases the lock when the page is hidden.
    const onVisibility = () => void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    void acquire();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (sentinel) void sentinel.release();
    };
  }, [active]);
}

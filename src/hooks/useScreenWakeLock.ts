import { useEffect } from 'react';

export const useScreenWakeLock = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const wakeLock = navigator.wakeLock;
    if (!wakeLock) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const release = async () => {
      if (!sentinel || sentinel.released) return;
      try {
        await sentinel.release();
      } catch {
        // Browser wake-lock release failures are non-critical.
      }
    };

    const request = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        sentinel = await wakeLock.request('screen');
        if (cancelled) {
          await release();
        }
      } catch {
        // Unsupported, blocked, or denied wake locks should not affect scoring.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void request();
      }
    };

    void request();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void release();
    };
  }, [enabled]);
};

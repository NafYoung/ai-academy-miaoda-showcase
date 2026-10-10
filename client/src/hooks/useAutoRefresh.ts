import { useCallback, useEffect, useReducer, useRef } from 'react';

const AUTO_REFRESH_INTERVAL_MS = 45_000;
const MINIMUM_REFRESH_GAP_MS = 1_000;

/**
 * 页面重新获得焦点、重新回到前台或停留满 45 秒时触发数据刷新。
 * 返回值只用于放进数据请求 effect 的依赖数组。
 */
export function useAutoRefresh(): number {
  const [refreshKey, bumpRefreshKey] = useReducer(
    (currentValue: number): number => currentValue + 1,
    0,
  );
  const lastRefreshAtRef = useRef(0);

  const requestRefresh = useCallback((): void => {
    const now: number = Date.now();
    if (now - lastRefreshAtRef.current < MINIMUM_REFRESH_GAP_MS) return;
    lastRefreshAtRef.current = now;
    bumpRefreshKey();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') requestRefresh();
    };
    const intervalId: number = window.setInterval(
      requestRefresh,
      AUTO_REFRESH_INTERVAL_MS,
    );

    window.addEventListener('focus', requestRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', requestRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestRefresh]);

  return refreshKey;
}

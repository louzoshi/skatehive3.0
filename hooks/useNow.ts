'use client';

import { useSyncExternalStore } from 'react';

/**
 * One shared 1s ticker for every live countdown on the page.
 *
 * Each card mounting its own setInterval would mean dozens of timers firing out
 * of phase; this keeps a single interval alive while at least one component is
 * subscribed and hands everyone the same timestamp, so the countdowns tick in
 * unison.
 *
 * Returns 0 on the server and on the first client render so hydration matches —
 * callers should treat 0 as "not ready yet".
 */

const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let snapshot = 0;

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange);

  if (intervalId === null) {
    snapshot = Date.now();
    intervalId = setInterval(() => {
      snapshot = Date.now();
      subscribers.forEach((fn) => fn());
    }, 1000);
  }

  // The first render returned 0; nudge React once the real clock is available.
  queueMicrotask(onStoreChange);

  return () => {
    subscribers.delete(onStoreChange);
    if (subscribers.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      snapshot = 0;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => 0;

/** Current epoch millis, refreshed every second. 0 until the client is live. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default useNow;

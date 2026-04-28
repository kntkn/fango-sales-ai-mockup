'use client';

import { useSyncExternalStore } from 'react';

export type UiFlag = 'classic' | 'liquid';

const STORAGE_KEY = 'fng26.ui-flag';
const DEFAULT_FLAG: UiFlag = 'liquid';

function readClient(): UiFlag {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('ui');
  if (q === 'liquid' || q === 'classic') {
    try {
      window.localStorage.setItem(STORAGE_KEY, q);
    } catch {
      /* private mode etc. */
    }
    return q;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'liquid' || stored === 'classic') return stored;
  } catch {
    /* swallow */
  }
  return DEFAULT_FLAG;
}

// Subscribe to storage events so a flip in another tab propagates here.
function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * UI flag for migrating chat panel from classic (3009 ChatThread) to
 * liquid (3002 LineChatPanel-derived) implementation.
 *
 * Resolution order:
 *   1. URL query `?ui=liquid` or `?ui=classic` (also persists to localStorage)
 *   2. localStorage `fng26.ui-flag`
 *   3. default 'classic'
 *
 * SSR-safe via useSyncExternalStore: server snapshot is always 'classic'.
 */
export function useUiFlag(): UiFlag {
  return useSyncExternalStore(
    subscribe,
    readClient,
    () => DEFAULT_FLAG,
  );
}

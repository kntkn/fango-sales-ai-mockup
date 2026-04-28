'use client';

import { useSyncExternalStore } from 'react';
import type { FunnelStage } from './types';

const EVENT_NAME = 'conversation-stages-updated';
const STORAGE_KEY = 'conversation-stages';

export type StageMap = Record<string, FunnelStage>;

function readStages(): StageMap {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as StageMap;
  } catch {
    // ignore malformed payloads
  }
  return EMPTY;
}

// Shared empty sentinel so successive reads with no data return the same
// reference — required by `useSyncExternalStore` to avoid infinite re-renders.
const EMPTY: StageMap = Object.freeze({}) as StageMap;

// Snapshot cache — `useSyncExternalStore` requires the same reference back
// from `getSnapshot` until subscribers signal a change. We hand out the
// cached map and refresh it only when `invalidate()` is called (from the
// write path or the storage-event handler).
let snapshotCache: StageMap | null = null;
function getSnapshot(): StageMap {
  if (snapshotCache === null) {
    const fresh = readStages();
    // Re-use EMPTY so identical "no data" reads return the same reference.
    snapshotCache = Object.keys(fresh).length === 0 ? EMPTY : fresh;
  }
  return snapshotCache;
}
function invalidate(): void {
  snapshotCache = null;
}

function writeStages(map: StageMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / privacy-mode — we still want listeners to pick up the new
    // value even if persistence failed, so don't bail here.
  }
  invalidate();
  window.dispatchEvent(new CustomEvent<StageMap>(EVENT_NAME, { detail: map }));
}

export function setConversationStage(
  conversationId: string,
  stage: FunnelStage,
): void {
  const current = readStages();
  if (current[conversationId] === stage) return;
  writeStages({ ...current, [conversationId]: stage });
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => {
    invalidate();
    onStoreChange();
  };
  window.addEventListener(EVENT_NAME, handler);
  // Pick up cross-tab updates too.
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function useConversationStages(): StageMap {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

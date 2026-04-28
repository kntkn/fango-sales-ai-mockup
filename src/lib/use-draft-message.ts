'use client';

// Per-conversation message draft, stored in localStorage. One draft per
// conversation (== one customer); saving a new one overwrites the old. Mirrors
// use-call-memo's storage + event-bus pattern so multiple components stay in
// sync within the same tab.

import { useCallback, useEffect, useMemo, useState } from 'react';

const EVENT_NAME = 'message-draft-updated';
const KEY_PREFIX = 'message-draft:';

interface StoredDraft {
  text: string;
  savedAt: string;
}

interface DraftUpdateDetail {
  conversationId: string;
  text: string;
  savedAt: string;
  cleared: boolean;
}

export interface UseDraftMessageResult {
  draft: string;
  savedAt: string | null;
  hasDraft: boolean;
  /** Persist `text` as the draft for this conversation (overwrites). */
  saveDraft: (text: string) => void;
  /** Remove the draft for this conversation. */
  clearDraft: () => void;
}

function storageKey(conversationId: string): string {
  return `${KEY_PREFIX}${conversationId}`;
}

function readFromStorage(conversationId: string): StoredDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (typeof parsed.text !== 'string' || parsed.text.length === 0) return null;
    return {
      text: parsed.text,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

function dispatchUpdate(detail: DraftUpdateDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DraftUpdateDetail>(EVENT_NAME, { detail }));
}

export function useDraftMessage(conversationId: string): UseDraftMessageResult {
  const key = useMemo(() => storageKey(conversationId), [conversationId]);
  // Derived-from-props via "previous id in state" (React 19 idiom).
  const [prevConvId, setPrevConvId] = useState(conversationId);
  const [draft, setDraftState] = useState<string>(
    () => readFromStorage(conversationId)?.text ?? '',
  );
  const [savedAt, setSavedAt] = useState<string | null>(
    () => readFromStorage(conversationId)?.savedAt ?? null,
  );
  if (prevConvId !== conversationId) {
    setPrevConvId(conversationId);
    const stored = readFromStorage(conversationId);
    setDraftState(stored?.text ?? '');
    setSavedAt(stored?.savedAt ?? null);
  }

  // Subscribe to in-tab updates from other components / hooks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DraftUpdateDetail>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      if (detail.cleared) {
        setDraftState('');
        setSavedAt(null);
      } else {
        setDraftState(detail.text);
        setSavedAt(detail.savedAt || null);
      }
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [conversationId]);

  const saveDraft = useCallback(
    (text: string) => {
      if (typeof window === 'undefined') return;
      const trimmed = text.trim();
      if (!trimmed) {
        // Treat empty save as clear so we never persist a blank draft (which
        // would still flip the "has-draft" badge on without the user noticing).
        window.localStorage.removeItem(key);
        setDraftState('');
        setSavedAt(null);
        dispatchUpdate({ conversationId, text: '', savedAt: '', cleared: true });
        return;
      }
      const ts = new Date().toISOString();
      const payload: StoredDraft = { text, savedAt: ts };
      window.localStorage.setItem(key, JSON.stringify(payload));
      setDraftState(text);
      setSavedAt(ts);
      dispatchUpdate({ conversationId, text, savedAt: ts, cleared: false });
    },
    [key, conversationId],
  );

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    setDraftState('');
    setSavedAt(null);
    dispatchUpdate({ conversationId, text: '', savedAt: '', cleared: true });
  }, [key, conversationId]);

  return {
    draft,
    savedAt,
    hasDraft: draft.length > 0,
    saveDraft,
    clearDraft,
  };
}

// ---------------------------------------------------------------------------
// useHasDraft — light variant for list views that only need a boolean. Avoids
// re-rendering on every keystroke if the full text were exposed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// useAllDrafts — full Record<conversationId, draftText> map for list views
// (e.g. the liquid ConversationList draft tab). Reads every `message-draft:*`
// key from localStorage on mount, then merges in updates from the in-tab
// EVENT_NAME bus and cross-tab `storage` events.
// ---------------------------------------------------------------------------

export function useAllDrafts(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>(() => readAllDraftMap());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DraftUpdateDetail>).detail;
      if (!detail) return;
      setMap((prev) => {
        const next = { ...prev };
        if (detail.cleared || detail.text.length === 0) {
          delete next[detail.conversationId];
        } else {
          next[detail.conversationId] = detail.text;
        }
        return next;
      });
    };
    const storageHandler = (e: StorageEvent) => {
      if (!e.key || !e.key.startsWith(KEY_PREFIX)) return;
      setMap(readAllDraftMap());
    };
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  return map;
}

function readAllDraftMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || !k.startsWith(KEY_PREFIX)) continue;
      const id = k.slice(KEY_PREFIX.length);
      const stored = readFromStorage(id);
      if (stored && stored.text.length > 0) out[id] = stored.text;
    }
  } catch {
    /* private mode etc. */
  }
  return out;
}

export function useHasDraft(conversationId: string): boolean {
  const [has, setHas] = useState(false);

  useEffect(() => {
    setHas(readFromStorage(conversationId) !== null);
  }, [conversationId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DraftUpdateDetail>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setHas(!detail.cleared && detail.text.length > 0);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [conversationId]);

  return has;
}

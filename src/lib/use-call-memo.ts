'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const EVENT_NAME = 'call-memo-updated';

interface StoredMemo {
  text: string;
  savedAt: string;
}

interface MemoUpdateDetail {
  conversationId: string;
  text: string;
  savedAt: string;
}

export interface UseCallMemoResult {
  memo: string;
  savedAt: string | null;
  setMemo: (text: string) => void;
  save: () => void;
}

function storageKey(conversationId: string): string {
  return `call-memo:${conversationId}`;
}

function readFromStorage(conversationId: string): StoredMemo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredMemo>;
    if (typeof parsed.text !== 'string') return null;
    return {
      text: parsed.text,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
    };
  } catch {
    return null;
  }
}

export function useCallMemo(conversationId: string): UseCallMemoResult {
  const key = useMemo(() => storageKey(conversationId), [conversationId]);
  const [memo, setMemoState] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Reload when conversationId changes
  useEffect(() => {
    const stored = readFromStorage(conversationId);
    setMemoState(stored?.text ?? '');
    setSavedAt(stored?.savedAt ?? null);
  }, [conversationId]);

  // Subscribe to in-tab updates from other components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<MemoUpdateDetail>).detail;
      if (!detail || detail.conversationId !== conversationId) return;
      setMemoState(detail.text);
      setSavedAt(detail.savedAt || null);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [conversationId]);

  const setMemo = useCallback((text: string) => {
    setMemoState(text);
  }, []);

  const save = useCallback(() => {
    if (typeof window === 'undefined') return;
    const ts = new Date().toISOString();
    const payload: StoredMemo = { text: memo, savedAt: ts };
    window.localStorage.setItem(key, JSON.stringify(payload));
    setSavedAt(ts);
    window.dispatchEvent(
      new CustomEvent<MemoUpdateDetail>(EVENT_NAME, {
        detail: { conversationId, text: memo, savedAt: ts },
      }),
    );
  }, [memo, key, conversationId]);

  return { memo, savedAt, setMemo, save };
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { OBIKAE_BASE_URL } from "@/lib/obikae-launch";

export interface ObikaeVacancyInput {
  reinsId: string;
  /**
   * URL to a pre-fetched maisoku (PDF or image) from the bukkaku server.
   * When present, the obikae popup proxies it server-side so it can skip the
   * slow `/api/reins/fetch-maisoku` round-trip. Falls back to REINS re-fetch
   * if this URL is missing or the proxy fails.
   */
  maisokuUrl?: string | null;
  propertyName?: string;
  roomNumber?: string;
  address?: string;
  rent?: string | number | null;
  managementCompany?: string;
  platformId?: string;
}

export interface ObikaeDonePayload {
  sessionId: string;
  proposeUrl: string;
  customerName: string;
  listings: Array<{ title: string; url: string }>;
  closeRequested?: boolean;
}

export interface ObikaeSession {
  customerName: string;
  vacancies: ObikaeVacancyInput[];
  /** Timestamp of the click that opened this popup (used as identity). */
  startedAt: number;
  /** Reference to the popup window already opened synchronously from the click. */
  popup: Window | null;
}

interface Props {
  session: ObikaeSession | null;
  obikaeBaseUrl?: string;
  onComplete: (payload: ObikaeDonePayload) => void;
  onDismiss: () => void;
  /** Re-attempt opening the popup (user gesture from the banner retry button). */
  onReopenPopup: () => void;
}

const DEFAULT_OBIKAE_URL = OBIKAE_BASE_URL;

/**
 * Shows a floating status banner in the mockup while the separate obikae
 * popup window is open. The popup itself is opened synchronously from the
 * click handler in the caller (required to avoid popup blockers) and the
 * window reference is threaded into `session.popup`. This component manages:
 *
 *  - polling for manual close (to hide the banner)
 *  - "bring to front" button
 *  - postMessage listener for `obikae:done`
 *  - popup-blocked fallback (re-try via gesture)
 */
export default function ObikaeLauncher({
  session,
  obikaeBaseUrl,
  onComplete,
  onDismiss,
  onReopenPopup,
}: Props) {
  const baseUrl = obikaeBaseUrl ?? DEFAULT_OBIKAE_URL;
  const baseOrigin = useMemo(() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return baseUrl;
    }
  }, [baseUrl]);

  const popupRef = useRef<Window | null>(null);
  const closedPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for manual close of the popup. Keep the latest popup ref in sync.
  useEffect(() => {
    popupRef.current = session?.popup ?? null;

    if (closedPollRef.current) {
      clearInterval(closedPollRef.current);
      closedPollRef.current = null;
    }

    if (session?.popup) {
      closedPollRef.current = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          if (closedPollRef.current) {
            clearInterval(closedPollRef.current);
            closedPollRef.current = null;
          }
          popupRef.current = null;
          onDismiss();
        }
      }, 500);
    }

    return () => {
      if (closedPollRef.current) {
        clearInterval(closedPollRef.current);
        closedPollRef.current = null;
      }
    };
  }, [session, onDismiss]);

  // postMessage listener
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== baseOrigin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "obikae:done") return;

      const payload = data as ObikaeDonePayload & { type: string };
      onComplete({
        sessionId: payload.sessionId,
        proposeUrl: payload.proposeUrl,
        customerName: payload.customerName,
        listings: Array.isArray(payload.listings) ? payload.listings : [],
        closeRequested: Boolean(payload.closeRequested),
      });

      if (popupRef.current && !popupRef.current.closed) {
        try {
          popupRef.current.close();
        } catch {
          /* ignore */
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [baseOrigin, onComplete]);

  if (!session) return null;

  const focusPopup = () => {
    const win = popupRef.current;
    if (win && !win.closed) {
      try {
        win.focus();
      } catch {
        /* ignore */
      }
    }
  };

  const dismiss = () => {
    if (popupRef.current && !popupRef.current.closed) {
      try {
        popupRef.current.close();
      } catch {
        /* ignore */
      }
    }
    popupRef.current = null;
    if (closedPollRef.current) {
      clearInterval(closedPollRef.current);
      closedPollRef.current = null;
    }
    onDismiss();
  };

  const blocked = session.popup == null;

  if (blocked) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-[320px] rounded-xl border border-red-200 bg-white shadow-lg p-4">
        <div className="text-sm font-bold text-red-700 mb-1">
          🚫 ポップアップがブロックされました
        </div>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          ブラウザのアドレスバー右側でこのサイトのポップアップを許可してから「再度開く」を押してください。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onReopenPopup}
            className="flex-1 rounded-md bg-primary text-white text-xs font-bold py-2 hover:bg-primary-hover"
          >
            再度開く
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-border text-xs text-text-secondary px-3 py-2 hover:bg-surface"
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[320px] rounded-xl border border-border bg-white shadow-lg p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-ai-surface flex items-center justify-center text-base">
          🎨
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-text-primary">
            帯替えウィンドウで作業中
          </div>
          <div className="text-xs text-text-tertiary mt-0.5 truncate">
            {session.customerName}様 · {session.vacancies.length}物件
          </div>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed">
            別ウィンドウで帯調整と提案リンク作成を進めてください。完了するとこちらのチャット入力欄に自動で貼り付けます。
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={focusPopup}
              className="flex-1 rounded-md bg-primary text-white text-xs font-bold py-1.5 hover:bg-primary-hover"
            >
              ウィンドウを前面へ
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md border border-border text-xs text-text-secondary px-3 py-1.5 hover:bg-surface"
            >
              中断
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { OBIKAE_BASE_URL } from "@/lib/obikae-launch";
import { BlockIcon, PaletteIcon } from "./Icons";

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
  /**
   * Whether a popup Window was successfully opened. The actual Window handle is
   * kept in a ref (see Props.popupRef) to avoid React dev-mode serializers
   * walking into a cross-origin Window and throwing SecurityError.
   */
  popupOpen: boolean;
}

interface Props {
  session: ObikaeSession | null;
  obikaeBaseUrl?: string;
  onComplete: (payload: ObikaeDonePayload) => void;
  onDismiss: () => void;
  /** Re-attempt opening the popup (user gesture from the banner retry button). */
  onReopenPopup: () => void;
  /** Mutable ref holding the popup Window handle. Kept outside state. */
  popupRef: RefObject<Window | null>;
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
  popupRef,
}: Props) {
  const baseUrl = obikaeBaseUrl ?? DEFAULT_OBIKAE_URL;
  const baseOrigin = useMemo(() => {
    try {
      return new URL(baseUrl).origin;
    } catch {
      return baseUrl;
    }
  }, [baseUrl]);

  const closedPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for manual close of the popup window (ref is owned by the parent).
  useEffect(() => {
    if (closedPollRef.current) {
      clearInterval(closedPollRef.current);
      closedPollRef.current = null;
    }

    if (session?.popupOpen) {
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
  }, [session?.popupOpen, onDismiss, popupRef]);

  // postMessage listener
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== baseOrigin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if ((data as { type?: unknown }).type !== "obikae:done") return;

      // Validate shape rather than trusting the string as-is. `proposeUrl`
      // gets prefilled into the composer and potentially sent to the
      // customer, so we reject non-http(s) URLs up-front (defense against a
      // compromised obikae origin).
      const p = data as Record<string, unknown>;
      const sessionId = typeof p.sessionId === 'string' ? p.sessionId : '';
      const rawUrl = typeof p.proposeUrl === 'string' ? p.proposeUrl : '';
      const customerName = typeof p.customerName === 'string' ? p.customerName.slice(0, 200) : '';
      let safeUrl = '';
      try {
        const u = new URL(rawUrl);
        if (u.protocol === 'http:' || u.protocol === 'https:') safeUrl = u.toString();
      } catch {
        /* invalid URL — drop */
      }
      if (!sessionId || !safeUrl) return;

      const listings = Array.isArray(p.listings)
        ? p.listings
            .filter((l) => l && typeof l === 'object')
            .map((l) => {
              const o = l as Record<string, unknown>;
              const title = typeof o.title === 'string' ? o.title.slice(0, 200) : '';
              const url = typeof o.url === 'string' ? o.url : '';
              let safeListingUrl = '';
              try {
                const u = new URL(url);
                if (u.protocol === 'http:' || u.protocol === 'https:') safeListingUrl = u.toString();
              } catch {
                /* drop */
              }
              return title && safeListingUrl ? { title, url: safeListingUrl } : null;
            })
            .filter((x): x is { title: string; url: string } => x !== null)
        : [];

      onComplete({
        sessionId,
        proposeUrl: safeUrl,
        customerName,
        listings,
        closeRequested: Boolean(p.closeRequested),
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
  }, [baseOrigin, onComplete, popupRef]);

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

  const blocked = !session.popupOpen;

  if (blocked) {
    return (
      <div className="fixed bottom-6 right-6 z-40 w-[320px] rounded-xl border border-red-200 bg-white shadow-lg p-4">
        <div className="inline-flex items-center gap-1.5 text-sm font-bold text-red-700 mb-1">
          <BlockIcon className="h-4 w-4" />
          ポップアップがブロックされました
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
        <div className="h-8 w-8 shrink-0 rounded-full bg-ai-surface flex items-center justify-center text-accent">
          <PaletteIcon className="h-4 w-4" />
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

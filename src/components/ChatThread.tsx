'use client';

import { Fragment, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type {
  Conversation,
  Message,
  AiSuggestion,
  SmartReply,
  FunnelStage,
  SalesAgent,
} from '@/lib/types';
import { STAGE_CONFIG, AI_MODE_CONFIG } from '@/lib/types';
import { AiModeIcon, SearchIcon as LookupIcon } from './Icons';
import { useCallMemo } from '@/lib/use-call-memo';
import { setConversationStage } from '@/lib/use-conversation-stage';
import { useKeyboardInset } from '@/lib/use-keyboard-inset';
import { useCoarsePointer } from '@/lib/use-coarse-pointer';
import { useDraftMessage } from '@/lib/use-draft-message';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  conversation: Conversation;
  messages: Message[];
  aiSuggestion: AiSuggestion | null;
  smartReplies: SmartReply[];
  onBack?: () => void;
  /**
   * Open the context panel / drawer. The optional tab argument controls
   * which section is shown first (物件 or 顧客).
   */
  onShowContext?: (tab?: 'property' | 'customer') => void;
  onSend?: (
    text: string,
    reply?: { quoteToken?: string; quotedMessageId: string },
  ) => Promise<void> | void;
  onSendImages?: (
    images: Array<{ original: Blob; preview: Blob; fileName: string }>,
  ) => Promise<void> | void;
  sendError?: string | null;
  lineDisplayName?: string;
  lineAliasName?: string;
  onRename?: (aliasName: string | null) => Promise<void> | void;
  assignedAgentName?: string;
  assignedAgentId?: string | null;
  agents?: SalesAgent[];
  onAssignAgent?: (agentId: string | null) => void;
  /**
   * External text to inject into the composer. Changes with `prefillNonce`
   * trigger an overwrite of the textarea contents and auto-focus.
   */
  prefillText?: string;
  prefillNonce?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a) === startOfDay(b);
}

function formatDateSeparator(date: Date, now: Date): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  const dow = DOW_JP[date.getDay()];
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}(${dow})`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${dow})`;
}

function DateSeparator({ date, now }: { date: Date; now: Date }) {
  return (
    <div className="flex justify-center py-2">
      <span className="text-[11px] text-text-tertiary bg-surface border border-border-light rounded-full px-3 py-0.5">
        {formatDateSeparator(date, now)}
      </span>
    </div>
  );
}

function readStatusLabel(status?: string): string | null {
  if (!status) return null;
  if (status === 'sent') return '\u2713';
  if (status === 'delivered') return '\u2713\u2713';
  if (status === 'read') return '\u2713\u2713';
  return null;
}

// Material Symbols inline icons (path data from fonts.google.com/icons)
function EditIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function AttachFileIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
    </svg>
  );
}

function SendIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

// Material Symbols "reply" — curved arrow pointing left/back.
function ReplyIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </svg>
  );
}

// Material Symbols "open_in_full" — diagonal corner-to-corner arrows (expand).
function OpenInFullIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Material Symbols "close_fullscreen" — diagonal arrows pointing inward.
function CloseInFullIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M20 4l-6 6M14 4v6h6M4 20l6-6M10 20v-6H4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Material Symbols "edit_note" (lines + pencil). Reads as "write a memo" —
// deliberately not a phone, so users don't think tapping places a call.
// Ref: fonts.google.com/icons
function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  // Google Material Symbols — "home" (outlined, 24dp)
  return (
    <svg className={className} viewBox="0 -960 960 960" fill="currentColor" aria-hidden>
      <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H560v-240h-160v240H160Zm320-350Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MemoIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 10h11v2H3zm0-4h11v2H3zm0 8h7v2H3zm15.01-3.13.71-.71c.39-.39 1.02-.39 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-.71.71-2.12-2.12zm-.71.71-5.3 5.3V21h2.12l5.3-5.3-2.12-2.12z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Call Memo Button (phone icon opens a popover textarea; persisted per conversation)
// ---------------------------------------------------------------------------
function CallMemoButton({ conversationId }: { conversationId: string }) {
  const { memo, savedAt, setMemo, save: persist } = useCallMemo(conversationId);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click — use `pointerdown` so the first tap on touch
  // devices also closes the popover (plain `mousedown` doesn't fire on some
  // mobile Safaris).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const save = useCallback(() => {
    persist();
    setOpen(false);
  }, [persist]);

  const hasMemo = memo.trim().length > 0;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 flex items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary transition-colors relative"
        aria-label="電話メモ"
        title="電話メモ"
      >
        <MemoIcon />
        {hasMemo && (
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" />
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-12 z-20 w-[320px] bg-white border border-border rounded-lg shadow-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <MemoIcon className="h-4 w-4" />
              電話メモ
            </span>
            {savedAt && (
              <span className="text-[10px] text-text-tertiary">
                保存: {new Date(savedAt).toLocaleString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="電話で話した重要なことをメモ..."
            rows={6}
            className="w-full resize-none border border-border rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-accent"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-text-tertiary hover:text-text-secondary px-2 py-1"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={save}
              className="bg-accent text-white text-xs font-bold rounded px-3 py-1 hover:bg-accent-hover"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread Header
// ---------------------------------------------------------------------------
function ThreadHeader({
  conversation,
  onBack,
  onShowContext,
  lineDisplayName,
  lineAliasName,
  onRename,
}: {
  conversation: Conversation;
  onBack?: () => void;
  onShowContext?: (tab?: 'property' | 'customer') => void;
  lineDisplayName?: string;
  lineAliasName?: string;
  onRename?: (aliasName: string | null) => Promise<void> | void;
}) {
  const avatarInitial = conversation.customerName.charAt(0);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lineAliasName ?? '');
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    setDraft(lineAliasName ?? '');
    setEditing(true);
  }, [lineAliasName]);

  const submit = useCallback(async () => {
    if (!onRename) return;
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    const current = lineAliasName ?? null;
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(next);
      setEditing(false);
    } catch (err) {
      console.error('rename failed', err);
    } finally {
      setSaving(false);
    }
  }, [draft, lineAliasName, onRename]);

  return (
    <div className="h-14 shrink-0 border-b border-border flex items-center px-2 md:px-4 gap-2 md:gap-3">
      {/* Back button (mobile only) */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm shrink-0"
          aria-label="戻る"
        >
          ←
        </button>
      )}

      {/* Avatar — clickable on mobile to open the 顧客 tab */}
      {onShowContext ? (
        <button
          type="button"
          onClick={() => onShowContext('customer')}
          className="shrink-0 rounded-full touch-manipulation xl:pointer-events-none"
          aria-label="顧客情報を開く"
        >
          <span className="flex w-8 h-8 items-center justify-center rounded-full bg-primary-light text-white text-xs font-bold overflow-hidden">
            {conversation.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.avatarUrl}
                alt={conversation.customerName}
                className="w-full h-full object-cover"
              />
            ) : (
              avatarInitial
            )}
          </span>
        </button>
      ) : (
        <div className="w-8 h-8 shrink-0 rounded-full bg-primary-light text-white text-xs font-bold overflow-hidden flex items-center justify-center">
          {conversation.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={conversation.avatarUrl}
              alt={conversation.customerName}
              className="w-full h-full object-cover"
            />
          ) : (
            avatarInitial
          )}
        </div>
      )}

      {/* Name + inline rename */}
      {editing && onRename ? (
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={lineDisplayName ?? '表示名'}
            disabled={saving}
            autoFocus
            className="min-w-0 flex-1 border border-border rounded px-2 py-1 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === 'Enter') void submit();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="shrink-0 bg-accent text-white text-xs font-bold rounded px-2 py-1 hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? '保存中' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="shrink-0 text-xs text-text-tertiary hover:text-text-secondary px-1"
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm md:text-base font-bold text-text-primary whitespace-nowrap truncate">
            {conversation.customerName}
          </span>
          {lineAliasName && lineDisplayName && lineDisplayName !== lineAliasName && (
            <span
              className="text-xs text-text-tertiary truncate hidden md:inline"
              title={`LINE表示名: ${lineDisplayName}`}
            >
              ({lineDisplayName})
            </span>
          )}
          {onRename && (
            <button
              type="button"
              onClick={startEdit}
              className="shrink-0 flex items-center justify-center text-text-tertiary hover:text-text-secondary h-10 w-10 md:h-7 md:w-7 rounded-md hover:bg-surface transition-colors touch-manipulation"
              aria-label="表示名を編集"
              title="表示名を編集"
            >
              <EditIcon />
            </button>
          )}
        </div>
      )}
      <div className="flex-1" />
      <select
        className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-accent hidden sm:block"
        value={conversation.stage}
        onChange={(e) =>
          setConversationStage(conversation.id, e.target.value as FunnelStage)
        }
      >
        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>
      <CallMemoButton conversationId={conversation.id} />

      {/* Property tab shortcut (mobile + tablet) */}
      {onShowContext && (
        <button
          type="button"
          onClick={() => onShowContext('property')}
          className="xl:hidden w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-text-secondary shrink-0 border border-border touch-manipulation"
          aria-label="物件情報を開く"
        >
          <HomeIcon />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment rendering
// ---------------------------------------------------------------------------

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  );
}

function AttachmentView({ message }: { message: Message }) {
  const att = message.attachment;
  if (!att) return null;

  if (att.kind === 'image') {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt="画像"
          className="max-w-[240px] max-h-[320px] rounded-xl border border-border-light object-cover bg-surface"
          loading="lazy"
        />
      </a>
    );
  }

  if (att.kind === 'sticker') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={att.url}
        alt="スタンプ"
        className="w-32 h-32 object-contain"
        loading="lazy"
      />
    );
  }

  if (att.kind === 'video') {
    return (
      <video
        controls
        className="max-w-[280px] rounded-xl border border-border-light bg-black"
        preload="metadata"
      >
        <source src={att.url} type={att.contentType ?? 'video/mp4'} />
      </video>
    );
  }

  if (att.kind === 'audio') {
    return (
      <audio controls className="max-w-[280px]" preload="metadata">
        <source src={att.url} type={att.contentType ?? 'audio/mp4'} />
      </audio>
    );
  }

  // file
  const sizeLabel = formatFileSize(att.fileSize);
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      download={att.fileName}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border-light bg-white hover:bg-surface transition-colors max-w-[280px]"
    >
      <FileIcon className="h-6 w-6 text-text-secondary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-text-primary truncate">
          {att.fileName ?? 'ファイル'}
        </div>
        {sizeLabel && (
          <div className="text-[10px] text-text-tertiary">{sizeLabel}</div>
        )}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// OGP link preview
// ---------------------------------------------------------------------------
type OgpData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

// Module-scoped cache so the same URL isn't refetched per re-render.
const ogpCache = new Map<string, OgpData | null>();
const ogpInFlight = new Map<string, Promise<OgpData | null>>();

function fetchOgp(url: string): Promise<OgpData | null> {
  const cached = ogpCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);
  const inflight = ogpInFlight.get(url);
  if (inflight) return inflight;

  const p = fetch(`/api/ogp?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? (r.json() as Promise<OgpData>) : null))
    .catch(() => null)
    .then((data) => {
      ogpCache.set(url, data);
      ogpInFlight.delete(url);
      return data;
    });
  ogpInFlight.set(url, p);
  return p;
}

const URL_REGEX = /https?:\/\/[^\s<>"'、。　]+/g;

function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) ?? [];
  // Dedupe while preserving order, cap at 3 to avoid spam.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    // Strip common trailing punctuation that URL_REGEX tends to over-eat.
    const clean = m.replace(/[.,;:!?)\]]+$/g, '');
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= 3) break;
    }
  }
  return out;
}

function OgpCard({ url }: { url: string; isAgent?: boolean }) {
  const [data, setData] = useState<OgpData | null | undefined>(() => {
    const cached = ogpCache.get(url);
    return cached === undefined ? undefined : cached;
  });

  useEffect(() => {
    if (data !== undefined) return;
    let cancelled = false;
    fetchOgp(url).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url, data]);

  if (data === undefined) {
    return (
      <div className="mt-1.5 w-full max-w-[320px] rounded-xl border border-border-light bg-white px-3 py-2 text-xs text-text-tertiary shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
        リンク情報を取得中…
      </div>
    );
  }

  if (!data || (!data.title && !data.description && !data.image)) return null;

  // Hotlink-protected sites (SUUMO etc.) reject direct browser fetch of og:image,
  // so go through our server-side proxy that forwards Referer.
  const proxiedImage = data.image
    ? `/api/ogp-image?url=${encodeURIComponent(data.image)}&ref=${encodeURIComponent(data.url)}`
    : undefined;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex w-full max-w-[320px] overflow-hidden rounded-xl border border-border-light bg-white text-text-primary shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:brightness-95 transition-[filter]"
    >
      {proxiedImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxiedImage}
          alt=""
          className="w-20 h-20 object-cover shrink-0 bg-surface"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="min-w-0 flex-1 p-2">
        {data.siteName && (
          <div className="text-[10px] truncate text-text-tertiary">{data.siteName}</div>
        )}
        {data.title && (
          <div className="text-xs font-bold leading-snug line-clamp-2">{data.title}</div>
        )}
        {data.description && (
          <div className="text-[11px] mt-0.5 leading-snug line-clamp-2 text-text-tertiary">
            {data.description}
          </div>
        )}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Message Bubble + Interpretation
// ---------------------------------------------------------------------------
// Preview snippet for a message referenced by a quote — kept short so it fits
// above (or inside) the replying bubble. Images/files show a placeholder.
function quotePreviewText(m: Message): string {
  if (m.attachment) {
    switch (m.attachment.kind) {
      case 'image': return '[画像]';
      case 'video': return '[動画]';
      case 'audio': return '[音声メッセージ]';
      case 'file':  return m.attachment.fileName ? `[ファイル] ${m.attachment.fileName}` : '[ファイル]';
      case 'sticker': return '[スタンプ]';
    }
  }
  return m.text || '';
}

function QuotedMessageCard({
  source,
  senderLabel,
  onJump,
  variant,
}: {
  source: Message | null;
  senderLabel: string;
  onJump?: () => void;
  // "agent" bubbles render a translucent-white card; "customer" renders a
  // subtle gray card so the quote reads as distinct from the main bubble.
  variant: 'agent' | 'customer';
}) {
  const text = source ? quotePreviewText(source) : '（引用元のメッセージ）';
  const base =
    variant === 'agent'
      ? 'border-l-2 border-white/70 bg-white/15 text-white/90'
      : 'border-l-2 border-[#cbd5e1] bg-[#f8fafc] text-text-secondary';
  return (
    <button
      type="button"
      onClick={onJump}
      className={`w-full text-left px-2 py-1 rounded-sm mb-1 cursor-pointer ${base}`}
    >
      <div className={`text-[10px] font-semibold ${variant === 'agent' ? 'text-white/95' : 'text-text-tertiary'}`}>
        {senderLabel}
      </div>
      <div className="text-xs line-clamp-2 whitespace-pre-wrap break-all">{text}</div>
    </button>
  );
}

function MessageBubble({
  message,
  quotedSource,
  quotedSenderLabel,
  onReply,
  onJumpTo,
  canReply,
}: {
  message: Message;
  // Resolved source message for `message.quotedMessageId` (null if unresolved,
  // e.g. the quoted message is before the loaded window or sent from LINE app
  // where we don't have the body — only the id).
  quotedSource: Message | null;
  quotedSenderLabel: string;
  onReply?: (m: Message) => void;
  onJumpTo?: (id: string) => void;
  canReply: boolean;
}) {
  const isCoarsePointer = useCoarsePointer();
  const bubbleRef = useRef<HTMLDivElement>(null);
  // When the menu is open we anchor it to the bubble rect captured at fire
  // time — scrolling then closes the menu (see effect below) so the anchor
  // never drifts. `origin` holds the press point in screen coords, used as
  // the popover's transform-origin for a natural "grow from finger" feel.
  const [menu, setMenu] = useState<{
    rect: DOMRect;
    origin: { x: number; y: number };
  } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Vertical-only threshold. Finger naturally jitters a few px sideways while
  // resting on the screen; cancelling on that killed the long-press about
  // half the time. Vertical movement > 18px is treated as scroll intent.
  const PRESS_CANCEL_Y_PX = 18;

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStart.current = null;
  }, []);

  const openMenuAt = useCallback(
    (pressX: number, pressY: number, pointerId: number | null, target: Element | null) => {
      // Unconditionally release any implicit pointer capture on the pressed
      // bubble. Without this, the same finger's subsequent pointerup / click
      // fires on the bubble instead of on whatever popover item it's now over
      // — which is why the menu looked "dead" to the tap. Silent no-op if
      // the browser didn't actually capture.
      if (pointerId != null && target) {
        try {
          (target as Element & {
            releasePointerCapture?: (id: number) => void;
          }).releasePointerCapture?.(pointerId);
        } catch {
          /* ignore */
        }
      }
      // Haptic cue — Android fires the actual vibrator, iOS Safari silently
      // ignores this (Web Vibration API unsupported). On iOS the visual
      // reply-bubble-active animation stands in as a pseudo-haptic cue.
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ignore */
      }
      const el = bubbleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenu({ rect, origin: { x: pressX, y: pressY } });
      // Clear any text selection the browser may have kicked off during the
      // long press, so the reply menu is the only interactive surface.
      try {
        window.getSelection()?.removeAllRanges();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canReply) return;
      // Only fire on touch/pen — mouse users get the hover button instead.
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
      pressStart.current = { x: e.clientX, y: e.clientY };
      const x = e.clientX;
      const y = e.clientY;
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      longPressTimer.current = window.setTimeout(
        () => openMenuAt(x, y, pointerId, target),
        450,
      );
    },
    [canReply, openMenuAt],
  );
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStart.current;
      if (!start) return;
      // Only vertical movement cancels (that's a scroll). Horizontal drift
      // while the finger is resting in place should *not* abort the gesture.
      const dy = Math.abs(e.clientY - start.y);
      if (dy > PRESS_CANCEL_Y_PX) {
        cancelLongPress();
      }
    },
    [cancelLongPress],
  );

  // Close the menu on scroll — otherwise the popover stays anchored to stale
  // coords as the thread moves under it. matches LINE's behaviour.
  useEffect(() => {
    if (!menu) return;
    const onScroll = () => setMenu(null);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [menu]);

  if (message.sender === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-text-tertiary italic">{message.text}</span>
      </div>
    );
  }

  const isAgent = message.sender === 'agent';
  const readLabel = isAgent ? readStatusLabel(message.readStatus) : null;
  const isReadBlue = message.readStatus === 'read';
  const urls = message.attachment ? [] : extractUrls(message.text);
  const att = message.attachment;
  const hasQuote = !!message.quotedMessageId;

  // Stickers/images/videos/audio don't carry meaningful text (just a placeholder
  // like "[画像]"), so we suppress the bubble in those cases and render only
  // the media. Files keep the bubble-less card directly. If the message has a
  // quote, we keep the text bubble even for media so the quote bar can anchor.
  const hideTextBubble =
    !hasQuote &&
    !!att && (att.kind === 'image' || att.kind === 'sticker' || att.kind === 'video' || att.kind === 'audio' || att.kind === 'file');

  const handleReplyClick = () => {
    setMenu(null);
    onReply?.(message);
  };
  const handleCopyClick = async () => {
    setMenu(null);
    const textToCopy = message.text || quotePreviewText(message);
    if (!textToCopy) return;
    try {
      await navigator.clipboard?.writeText(textToCopy);
    } catch {
      /* Clipboard denied — silent. */
    }
  };
  const handleJumpClick = () => {
    if (!quotedSource) return;
    setMenu(null);
    onJumpTo?.(quotedSource.id);
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`msg-enter group flex ${isAgent ? 'justify-end' : 'justify-start'} px-4 py-1`}
      // On touch devices only: suppress iOS' default long-press behaviour —
      // the callout (share / copy sheet) and text selection both hijack the
      // gesture and leave our reply menu's button un-tappable. Desktop users
      // keep normal text selection because the coarse-pointer check is false
      // there (and the long-press timer never arms for mouse input anyway).
      style={
        isCoarsePointer
          ? {
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }
          : undefined
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        <div className="flex items-end gap-1">
          {isAgent && (
            <div className="shrink-0 flex flex-col items-end leading-tight pb-0.5">
              {readLabel && (
                <span className={`text-[11px] ${isReadBlue ? 'text-accent' : 'text-text-tertiary'}`}>
                  {readLabel}
                </span>
              )}
              <span className="text-[11px] text-text-tertiary">{formatTime(message.timestamp)}</span>
            </div>
          )}

          {/* Desktop hover reply button — placed *outside* the bubble on the
              opposite side so it's easy to click without overlapping content. */}
          {canReply && isAgent && (
            <button
              type="button"
              onClick={handleReplyClick}
              className="self-center hidden md:flex opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 w-7 h-7 rounded-full bg-white border border-border-light shadow-sm items-center justify-center text-text-tertiary hover:text-accent hover:border-accent cursor-pointer"
              aria-label="リプライ"
              title="リプライ"
            >
              <ReplyIcon className="h-3.5 w-3.5" />
            </button>
          )}

          <div
            ref={bubbleRef}
            className={`flex flex-col min-w-0 ${isAgent ? 'items-end' : 'items-start'} ${
              menu ? 'reply-bubble-active' : ''
            }`}
          >
            {!hideTextBubble && (
              <div
                className={`px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  isAgent
                    ? 'agent-bubble-grad text-white rounded-2xl rounded-tr-sm'
                    : 'bg-white border border-border-light text-text-primary rounded-2xl rounded-tl-sm shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                }`}
              >
                {hasQuote && (
                  <QuotedMessageCard
                    source={quotedSource}
                    senderLabel={quotedSenderLabel}
                    variant={isAgent ? 'agent' : 'customer'}
                    onJump={
                      quotedSource && onJumpTo
                        ? () => onJumpTo(quotedSource.id)
                        : undefined
                    }
                  />
                )}
                {message.text}
              </div>
            )}

            {att && <AttachmentView message={message} />}
          </div>

          {canReply && !isAgent && (
            <button
              type="button"
              onClick={handleReplyClick}
              className="self-center hidden md:flex opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 w-7 h-7 rounded-full bg-white border border-border-light shadow-sm items-center justify-center text-text-tertiary hover:text-accent hover:border-accent cursor-pointer"
              aria-label="リプライ"
              title="リプライ"
            >
              <ReplyIcon className="h-3.5 w-3.5" />
            </button>
          )}

          {!isAgent && (
            <span className="shrink-0 text-[11px] text-text-tertiary pb-0.5">
              {formatTime(message.timestamp)}
            </span>
          )}
        </div>

        {urls.map((u) => (
          <OgpCard key={u} url={u} />
        ))}

        {/* Interpretation — surface the customer's real intent */}
        {message.sender === 'customer' && message.interpretation && (
          <div className="interpretation-fade mt-1.5 bg-[#fef9c3] border border-[#fde68a] rounded-md px-2 py-1 flex items-start gap-1.5 text-xs leading-snug">
            <LookupIcon className="shrink-0 h-3.5 w-3.5 mt-0.5 text-[#92400e]" />
            <span className="text-[#92400e] font-bold">{message.interpretation}</span>
          </div>
        )}
      </div>

      {/* Long-press popover (touch devices). LINE-style: anchored above the
          pressed bubble (falls back below if no room), flipped to the bubble's
          side, with a scale-from-press-point entrance animation. */}
      {menu && (
        <ReplyPopover
          anchor={menu.rect}
          origin={menu.origin}
          isAgent={isAgent}
          canJump={!!quotedSource}
          hasText={!!message.text}
          onReply={handleReplyClick}
          onCopy={handleCopyClick}
          onJumpToSource={handleJumpClick}
          onDismiss={() => setMenu(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reply popover (LINE-style long-press action menu)
// ---------------------------------------------------------------------------
const POPOVER_GAP_PX = 8;
const POPOVER_EDGE_PX = 12;

function ReplyPopover({
  anchor,
  origin,
  isAgent,
  canJump,
  hasText,
  onReply,
  onCopy,
  onJumpToSource,
  onDismiss,
}: {
  anchor: DOMRect;
  origin: { x: number; y: number };
  isAgent: boolean;
  canJump: boolean;
  hasText: boolean;
  onReply: () => void;
  onCopy: () => void;
  onJumpToSource: () => void;
  onDismiss: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  // We measure the popover once it mounts so we can flip/clamp it on screen.
  const [layout, setLayout] = useState<{
    top: number;
    left: number;
    originX: string;
    originY: string;
    placeAbove: boolean;
  } | null>(null);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Vertical: prefer above the bubble, fall back below if not enough room.
    const roomAbove = anchor.top - POPOVER_GAP_PX;
    const roomBelow = viewportH - anchor.bottom - POPOVER_GAP_PX;
    const placeAbove = roomAbove >= ph || roomAbove >= roomBelow;
    const top = placeAbove
      ? Math.max(POPOVER_EDGE_PX, anchor.top - ph - POPOVER_GAP_PX)
      : Math.min(viewportH - ph - POPOVER_EDGE_PX, anchor.bottom + POPOVER_GAP_PX);

    // Horizontal: align to the bubble's side — right for agent, left for
    // customer — then clamp inside the viewport.
    let left = isAgent ? anchor.right - pw : anchor.left;
    left = Math.max(POPOVER_EDGE_PX, Math.min(viewportW - pw - POPOVER_EDGE_PX, left));

    // Transform-origin anchors on the press point so the popover appears to
    // emerge from under the finger.
    const originXpx = Math.max(0, Math.min(pw, origin.x - left));
    const originYpx = placeAbove ? ph : 0;

    setLayout({
      top,
      left,
      originX: `${originXpx}px`,
      originY: `${originYpx}px`,
      placeAbove,
    });
  }, [anchor, origin, isAgent]);

  // Server-safe portal target — only mount in the browser.
  if (typeof document === 'undefined') return null;

  // Dismiss on a *new* pointerdown outside the panel. pointerdown only fires
  // for fresh touches — the long-press finger lifting doesn't fire a new
  // pointerdown on the backdrop — so this cleanly avoids the "menu dismisses
  // itself immediately on finger release" problem that plagued the old
  // onClick-based backdrop.
  const backdropPointerDown = (e: React.PointerEvent) => {
    // Ignore touches that landed inside the popover panel.
    if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
      return;
    }
    onDismiss();
  };

  return createPortal(
    <div
      // High z-index so the overlay sits above the composer / sticky bars.
      className="fixed inset-0 z-[60]"
      style={{ WebkitUserSelect: 'none', userSelect: 'none' }}
      onPointerDown={backdropPointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 bg-black/25" />
      <div
        ref={popoverRef}
        className="reply-menu-pop absolute bg-white rounded-2xl shadow-2xl border border-border-light overflow-hidden min-w-[220px]"
        style={{
          top: layout?.top ?? -9999,
          left: layout?.left ?? -9999,
          visibility: layout ? 'visible' : 'hidden',
          // CSS vars consumed by the .reply-menu-pop keyframe for
          // transform-origin — gives the "grow from finger" feel.
          ['--reply-menu-origin-x' as string]: layout?.originX ?? '50%',
          ['--reply-menu-origin-y' as string]: layout?.originY ?? '100%',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <PopoverItem
          icon={<ReplyIcon className="h-5 w-5" />}
          label="リプライ"
          onSelect={onReply}
        />
        {hasText && (
          <PopoverItem
            icon={<CopyIcon className="h-5 w-5" />}
            label="コピー"
            onSelect={onCopy}
          />
        )}
        {canJump && (
          <PopoverItem
            icon={<JumpIcon className="h-5 w-5" />}
            label="引用元へ移動"
            onSelect={onJumpToSource}
          />
        )}
        <div className="border-t border-border-light">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full px-4 py-3 flex items-center justify-center text-[14px] text-text-tertiary active:bg-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PopoverItem({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full px-4 py-3 flex items-center gap-3 text-[15px] text-text-primary active:bg-gray-100 hover:bg-gray-50 cursor-pointer"
    >
      <span className="shrink-0 text-text-secondary">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Material Symbols "content_copy"
function CopyIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  );
}

// Material Symbols "arrow_upward_alt" — used for "jump to source"
function JumpIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Smart Reply Pills
// ---------------------------------------------------------------------------
function SmartReplyPills({ replies }: { replies: SmartReply[] }) {
  if (replies.length === 0) return null;
  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto shrink-0">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          className="pill-hover whitespace-nowrap px-3 py-1.5 rounded-full bg-ai-surface text-ai-text text-xs border border-ai-border cursor-pointer"
          onClick={() => console.log('Smart reply:', reply.text)}
        >
          {reply.text}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Refine Input
// ---------------------------------------------------------------------------
function RefineInput({
  placeholder,
  buttonLabel,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  buttonLabel: string;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div className="flex gap-1.5 mt-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 border border-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-accent bg-white"
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && value.trim()) { onSubmit(value); setValue(''); }
        }}
        autoFocus
      />
      <button
        type="button"
        className="shrink-0 bg-accent text-white text-xs font-bold rounded px-2 py-1 hover:bg-accent-hover"
        onClick={() => { onSubmit(value); setValue(''); }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Suggestion Zone (Compact)
// ---------------------------------------------------------------------------
function AiSuggestionZone({
  suggestion,
  conversationId,
}: {
  suggestion: AiSuggestion;
  conversationId: string;
}) {
  const modeConfig = AI_MODE_CONFIG[suggestion.mode];
  const [expanded, setExpanded] = useState(false);
  const [refining, setRefining] = useState<'none' | 'message' | 'property'>('none');
  const [showReasoning, setShowReasoning] = useState(false);
  const { saveDraft, hasDraft } = useDraftMessage(conversationId);
  const [justSaved, setJustSaved] = useState(false);

  const handleStash = useCallback(() => {
    saveDraft(suggestion.text);
    setJustSaved(true);
    // Brief visual confirmation, then revert label
    window.setTimeout(() => setJustSaved(false), 1500);
  }, [saveDraft, suggestion.text]);

  // Preview: first line only
  const firstLine = suggestion.text.split('\n')[0];
  const props = suggestion.suggestedProperties ?? [];

  return (
    <div className="mx-4 mb-2 shrink-0">
      {/* Collapsed: single-line preview */}
      {!expanded && (
        <button
          type="button"
          className="w-full flex items-center gap-2 ai-glass rounded-lg px-3 py-2 text-left hover:brightness-[1.03] transition-[filter,box-shadow]"
          onClick={() => setExpanded(true)}
        >
          <span className="inline-flex items-center text-ai-text bg-white/70 rounded-full px-1.5 py-0.5 shrink-0">
            <AiModeIcon mode={suggestion.mode} className="h-3 w-3" />
          </span>
          <span className="text-xs text-text-primary truncate flex-1">{firstLine}</span>
          {props.length > 0 && (
            <span className="text-xs text-text-tertiary shrink-0">+{props.length}物件</span>
          )}
          <span className="text-xs text-accent shrink-0">展開</span>
        </button>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="ai-glass rounded-lg p-2.5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-ai-text bg-white/70 rounded-full px-1.5 py-0.5">
              <AiModeIcon mode={suggestion.mode} className="h-3 w-3" />
              {modeConfig.label}
            </span>
            <button type="button" className="text-xs text-text-tertiary hover:text-text-secondary" onClick={() => { setExpanded(false); setRefining('none'); }}>
              折りたたむ
            </button>
          </div>

          {/* Message preview (2 lines max) */}
          <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed line-clamp-3 mb-1.5">
            {suggestion.text}
          </p>

          {/* Message actions */}
          <div className="flex items-center gap-1.5 mb-2">
            <button type="button" className="bg-accent text-white rounded px-2 py-0.5 text-xs font-bold hover:bg-accent-hover" onClick={() => console.log('Adopt')}>採用</button>
            <button
              type="button"
              className={`border rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                justSaved
                  ? 'border-[color:var(--score-high)] text-[color:var(--score-high)] bg-[color:var(--score-high)]/10'
                  : 'border-accent text-accent hover:bg-accent/10'
              }`}
              onClick={handleStash}
              title={hasDraft ? '既存の下書きを上書きします' : 'この提案を下書きとして保存'}
            >
              {justSaved ? '保存しました' : hasDraft ? '下書きを上書き' : '下書きに保存'}
            </button>
            <button type="button" className="border border-border rounded px-2 py-0.5 text-xs text-text-secondary hover:bg-surface" onClick={() => setRefining(refining === 'message' ? 'none' : 'message')}>修正...</button>
            <button type="button" className="text-xs text-text-tertiary hover:text-text-secondary" onClick={() => console.log('Dismiss')}>却下</button>
          </div>

          {refining === 'message' && (
            <RefineInput placeholder="修正の指示..." buttonLabel="再生成" onSubmit={(v) => { console.log('Refine msg:', v); setRefining('none'); }} onCancel={() => setRefining('none')} />
          )}

          {/* Property chips */}
          {props.length > 0 && (
            <>
              <div className="border-t border-ai-border/50 my-2" />
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-text-tertiary shrink-0">物件:</span>
                {props.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 bg-white/60 rounded px-1.5 py-0.5 text-xs text-text-primary">
                    {p.name} <span className="text-text-tertiary">{p.rent}</span>
                  </span>
                ))}
                <button type="button" className="text-xs text-accent hover:underline" onClick={() => setRefining(refining === 'property' ? 'none' : 'property')}>変更...</button>
              </div>

              {refining === 'property' && (
                <RefineInput placeholder="条件を変更..." buttonLabel="再検索" onSubmit={(v) => { console.log('Refine props:', v); setRefining('none'); }} onCancel={() => setRefining('none')} />
              )}
            </>
          )}

          {/* Reasoning */}
          <div className="mt-1.5">
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => setShowReasoning(!showReasoning)}>
              {showReasoning ? '▾ 根拠' : '▸ 根拠'}
            </button>
            {showReasoning && (
              <p className="text-xs text-text-secondary mt-1 leading-relaxed bg-white/50 rounded p-1.5">{suggestion.reasoning}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Client-side image resize (Canvas). Returns a JPEG Blob.
// ---------------------------------------------------------------------------
async function resizeImageToBlob(
  file: File,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas ctx unavailable');
      ctx.drawImage(bitmap, 0, 0, w, h);
      return await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas ctx unavailable');
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        quality,
      );
    });
  } finally {
    bitmap.close?.();
  }
}

// ---------------------------------------------------------------------------
// Message Composer
// ---------------------------------------------------------------------------
const MAX_ATTACH_IMAGES = 10;

function MessageComposer({
  onSend,
  onSendImages,
  sendError,
  prefillText,
  prefillNonce,
  onAfterSend,
  onSaveDraft,
  hasDraft,
  replyTo,
  onCancelReply,
}: {
  onSend?: (
    text: string,
    reply?: { quoteToken?: string; quotedMessageId: string },
  ) => Promise<void> | void;
  onSendImages?: (
    images: Array<{ original: Blob; preview: Blob; fileName: string }>,
  ) => Promise<void> | void;
  sendError?: string | null;
  prefillText?: string;
  prefillNonce?: number;
  /** Called after a successful text or image send. Used to clear the draft. */
  onAfterSend?: () => void;
  /** Persist the current composer text as a draft for this conversation. */
  onSaveDraft?: (text: string) => void;
  /** Whether a draft already exists for this conversation. Drives the button label. */
  hasDraft?: boolean;
  /** The message being quoted (reply target). When set, the composer shows a
   *  preview bar and sends with LINE's quoteToken (if available — legacy
   *  messages have no token, in which case the message is sent plain but our
   *  UI still renders the quote card locally). */
  replyTo?: {
    messageId: string;
    quoteToken?: string;
    senderLabel: string;
    preview: string;
  } | null;
  onCancelReply?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  // Object URLs created for the preview thumbnails. We map by File identity
  // instead of index so that the URL for a given File never shifts under us
  // while pendingImages updates — previously `previewUrls[idx]` went stale for
  // one render each time the array changed and could point at a revoked URL.
  const previewUrlsRef = useRef<Map<File, string>>(new Map());
  const [, bumpPreviewRev] = useState(0);
  const getPreviewUrl = useCallback((f: File) => {
    const cached = previewUrlsRef.current.get(f);
    if (cached) return cached;
    const url = URL.createObjectURL(f);
    previewUrlsRef.current.set(f, url);
    return url;
  }, []);
  const [attachError, setAttachError] = useState<string | null>(null);
  // We don't push every keystroke through React (the textarea is uncontrolled
  // for performance), but we do need to know whether the textarea is non-empty
  // to enable the 下書き保存 button — so we track a single boolean.
  const [hasText, setHasText] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  // On touch-primary devices (iOS/Android) the soft keyboard's Return key
  // should insert a newline instead of sending; sending is driven by the
  // dedicated send button.
  const isCoarsePointer = useCoarsePointer();
  // 拡大トグル: false → 通常 (max 8 行), true → 拡大 (max ~24 行)。長文編集
  // (物件提案など) を中央パネル内で扱うための切替。右パネルや別ウィンドウは
  // 開かない — 真ん中だけが伸びる。
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Reconcile the File→URL cache with the current pendingImages list and
    // revoke any URLs whose File is no longer pending.
    const set = new Set(pendingImages);
    for (const [file, url] of previewUrlsRef.current) {
      if (!set.has(file)) {
        URL.revokeObjectURL(url);
        previewUrlsRef.current.delete(file);
      }
    }
    bumpPreviewRev((n) => n + 1);
  }, [pendingImages]);

  useEffect(() => {
    const cache = previewUrlsRef.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const lineHeight = 22;
    if (expanded) {
      // 拡大モードは「常に 12 行の枠」— 空でも縮まない、長文時は内部スクロール。
      el.style.height = `${lineHeight * 12}px`;
    } else {
      el.style.height = 'auto';
      const minHeight = lineHeight * 2;
      const maxHeight = lineHeight * 8;
      el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
    }
    const nowHasText = el.value.trim().length > 0;
    setHasText((prev) => (prev === nowHasText ? prev : nowHasText));
    // Editing invalidates the "saved" indicator
    if (draftSaved) setDraftSaved(false);
  }, [draftSaved, expanded]);

  // Re-apply height bounds whenever the cap changes (expand <-> collapse).
  useEffect(() => {
    adjustHeight();
  }, [expanded, adjustHeight]);

  const handleSaveDraft = useCallback(() => {
    if (!onSaveDraft) return;
    const el = textareaRef.current;
    const text = el?.value ?? '';
    if (!text.trim()) return;
    onSaveDraft(text);
    if (el) {
      el.value = '';
      adjustHeight();
    }
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1500);
  }, [onSaveDraft, adjustHeight]);

  const handleToggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // External prefill injection: runs each time `prefillNonce` changes (even if
  // prefillText stays the same string, since the parent bumps the nonce). The
  // nonce-guard is critical: `adjustHeight` identity flips whenever
  // `draftSaved` / `expanded` change, and without this guard the effect would
  // re-fire and wipe user edits every time the textarea height toggled.
  const lastAppliedPrefillNonceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (prefillNonce === undefined) return;
    if (lastAppliedPrefillNonceRef.current === prefillNonce) return;
    const el = textareaRef.current;
    if (!el || !prefillText) return;
    lastAppliedPrefillNonceRef.current = prefillNonce;
    // Blur first so mid-composition IME state on the old value is cleared
    // before we replace the text under it; then re-focus and caret-to-end.
    el.blur();
    el.value = prefillText;
    adjustHeight();
    el.focus();
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }, [prefillNonce, prefillText, adjustHeight]);

  const doSend = useCallback(async () => {
    const el = textareaRef.current;
    const hasImages = pendingImages.length > 0;
    if (!el && !hasImages) return;

    // Image takes priority: sending image + text in one click is not supported
    // by LINE (each image is its own message), so we send the images first and
    // leave any typed text in the composer for the user to send next.
    if (hasImages) {
      if (!onSendImages) {
        setAttachError('image send handler unavailable');
        return;
      }
      setSending(true);
      setAttachError(null);
      try {
        // LINE spec: originalContentUrl ≤ 10MB / previewImageUrl ≤ 1MB.
        // Client-side resize keeps both within limits regardless of source
        // file size (iPhone photos are typically 3–5MB).
        const resized = await Promise.all(
          pendingImages.map(async (file) => {
            const [original, preview] = await Promise.all([
              resizeImageToBlob(file, 2048, 0.9),
              resizeImageToBlob(file, 240, 0.8),
            ]);
            return { original, preview, fileName: file.name };
          }),
        );
        await onSendImages(resized);
        setPendingImages([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onAfterSend?.();
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : 'send failed');
      } finally {
        setSending(false);
      }
      return;
    }

    const text = el?.value.trim() ?? '';
    if (!text) return;
    if (!onSend) {
      console.log('Send (no handler):', text);
      if (el) {
        el.value = '';
        adjustHeight();
      }
      return;
    }
    setSending(true);
    try {
      // Always forward quotedMessageId when replying — it's our local link for
      // the quote card UI. quoteToken is only included when present; without
      // it LINE sends a plain message (no quote bubble on the recipient side),
      // but our own thread still renders the quoted snippet.
      const reply = replyTo
        ? {
            quotedMessageId: replyTo.messageId,
            ...(replyTo.quoteToken ? { quoteToken: replyTo.quoteToken } : {}),
          }
        : undefined;
      await onSend(text, reply);
      if (el) {
        el.value = '';
        adjustHeight();
      }
      onAfterSend?.();
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  }, [onSend, onSendImages, pendingImages, adjustHeight, onAfterSend, replyTo, onCancelReply]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAttachError(null);
      const picked = Array.from(e.target.files ?? []);
      if (picked.length === 0) return;

      const rejected: string[] = [];
      const accepted: File[] = [];
      for (const f of picked) {
        if (!/^image\/(jpeg|png)$/.test(f.type)) {
          rejected.push(f.name);
          continue;
        }
        accepted.push(f);
      }

      // Reset input so re-selecting the same file fires onChange again.
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (rejected.length > 0) {
        setAttachError(`JPEG / PNG のみ対応 (無視: ${rejected.join(', ')})`);
      }
      if (accepted.length === 0) return;

      setPendingImages((prev) => {
        const merged = [...prev, ...accepted];
        if (merged.length > MAX_ATTACH_IMAGES) {
          setAttachError(`一度に送れる画像は ${MAX_ATTACH_IMAGES} 枚までです`);
          return merged.slice(0, MAX_ATTACH_IMAGES);
        }
        return merged;
      });
    },
    [],
  );

  const removePendingImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setAttachError(null);
  }, []);

  const clearPendingImages = useCallback(() => {
    setPendingImages([]);
    setAttachError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="border-t border-border bg-white px-4 py-3 shrink-0">
      {replyTo && (
        <div className="mb-2 flex items-stretch gap-2 rounded-lg border-l-4 border-accent bg-accent/5 pl-2 pr-1 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold text-accent flex items-center gap-1">
              <ReplyIcon className="h-3 w-3" />
              {replyTo.senderLabel} に返信
              {!replyTo.quoteToken && (
                <span
                  className="ml-1 text-[9px] font-normal text-text-tertiary"
                  title="このメッセージは引用トークン未取得のため、LINE側では通常メッセージとして送信されます（このアプリ内では引用表示されます）"
                >
                  ・LINE 引用なし
                </span>
              )}
            </div>
            <div className="text-xs text-text-secondary line-clamp-1 whitespace-pre-wrap break-all">
              {replyTo.preview || '（本文なし）'}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            disabled={sending}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-text-tertiary hover:bg-black/5 hover:text-text-primary disabled:opacity-60"
            aria-label="リプライを取消"
            title="リプライを取消"
          >
            ×
          </button>
        </div>
      )}
      {pendingImages.length > 0 && (
        <div className="mb-2 rounded-lg border border-border-light bg-surface px-2 py-1.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] text-text-tertiary">
              {pendingImages.length} 枚の画像を送信
              {pendingImages.length >= MAX_ATTACH_IMAGES && (
                <span className="ml-1 text-red-500">(上限)</span>
              )}
            </div>
            <button
              type="button"
              onClick={clearPendingImages}
              disabled={sending}
              className="text-[10px] text-text-tertiary hover:text-text-primary transition-colors disabled:opacity-60"
            >
              すべて取消
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingImages.map((file, idx) => (
              <div
                key={`${file.lastModified}-${file.name}-${file.size}`}
                className="relative shrink-0 group"
                title={`${file.name} (${formatFileSize(file.size)})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPreviewUrl(file)}
                  alt={file.name}
                  className="h-16 w-16 rounded-md object-cover bg-white border border-border-light"
                />
                <button
                  type="button"
                  onClick={() => removePendingImage(idx)}
                  disabled={sending}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-black/70 text-white text-[10px] hover:bg-black disabled:opacity-60"
                  aria-label={`${file.name} を取り消し`}
                  title="取り消し"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rounded-xl border border-border bg-white focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-[box-shadow,border-color] duration-150">
        <textarea
          ref={textareaRef}
          className="block w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-sm text-text-primary placeholder:text-text-tertiary outline-none border-0 disabled:opacity-60"
          placeholder={
            pendingImages.length > 0
              ? '送信ボタンで画像を送信（テキストは画像送信後）'
              : 'メッセージを入力...'
          }
          rows={2}
          disabled={sending}
          onInput={adjustHeight}
          onKeyDown={(e) => {
            // Skip while an IME is composing (e.g. Japanese conversion) —
            // the Enter press is confirming the conversion, not sending.
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            // On touch devices, let Return behave as a newline; the dedicated
            // send button is the only way to send.
            if (isCoarsePointer) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void doSend();
            }
          }}
        />
        <div className="flex items-center justify-between px-2 pb-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            disabled={sending || !onSendImages || pendingImages.length >= MAX_ATTACH_IMAGES}
            className="h-11 w-11 md:h-8 md:w-8 flex items-center justify-center rounded-md text-text-tertiary hover:bg-surface hover:text-text-secondary transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="画像添付"
            title={
              onSendImages
                ? `画像を添付 (JPEG/PNG、最大 ${MAX_ATTACH_IMAGES} 枚)`
                : '画像添付はLINE接続時のみ'
            }
            onClick={() => fileInputRef.current?.click()}
          >
            <AttachFileIcon />
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={handleToggleExpanded}
            aria-pressed={expanded}
            className={`h-11 w-11 md:h-8 md:w-8 flex items-center justify-center rounded-md transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${
              expanded
                ? 'text-accent bg-accent/10 hover:bg-accent/20'
                : 'text-text-tertiary hover:bg-surface hover:text-text-secondary'
            }`}
            aria-label={expanded ? '入力欄を縮小' : '入力欄を拡大'}
            title={expanded ? '通常サイズに戻す' : '入力欄を拡大 (12 行表示)'}
          >
            {expanded ? (
              <CloseInFullIcon className="h-4 w-4" />
            ) : (
              <OpenInFullIcon className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1" />
          {onSaveDraft && (
            <button
              type="button"
              disabled={sending || !hasText}
              onClick={handleSaveDraft}
              title={hasDraft ? '既存の下書きを上書きします' : 'テキストを下書きとして保存'}
              className={`mr-2 rounded-lg px-3 min-h-11 md:min-h-0 md:py-1.5 md:px-2.5 text-xs font-bold flex items-center gap-1 transition-colors touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed ${
                draftSaved
                  ? 'border border-[color:var(--score-high)] text-[color:var(--score-high)] bg-[color:var(--score-high)]/10'
                  : 'border border-accent text-accent hover:bg-accent/10'
              }`}
            >
              {draftSaved ? '保存しました' : hasDraft ? '下書き上書き' : '下書き保存'}
            </button>
          )}
          <button
            type="button"
            disabled={sending}
            className="bg-primary text-white rounded-lg px-4 min-h-11 md:min-h-0 md:py-1.5 md:px-3 text-xs font-bold flex items-center gap-1.5 hover:bg-primary-hover hover:shadow-[var(--shadow-1)] transition-[background-color,box-shadow] duration-150 disabled:opacity-60 touch-manipulation"
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
            onClick={() => void doSend()}
          >
            {sending ? '送信中…' : (
              <>
                <span>
                  {pendingImages.length > 1
                    ? `画像送信 (${pendingImages.length})`
                    : pendingImages.length === 1
                      ? '画像送信'
                      : '送信'}
                </span>
                <SendIcon className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      {attachError && (
        <div className="mt-1 text-xs text-red-500">{attachError}</div>
      )}
      {sendError && (
        <div className="mt-1 text-xs text-red-500">送信失敗: {sendError}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatThread (default export)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Mobile sticky status bar — score / SLA / assigned agent, tappable to open context sheet.
// Only visible < md; desktop relies on the right-column ContextPanel.
// ---------------------------------------------------------------------------
function MobileChatStickyBar({
  conversation,
  assignedAgentName,
  assignedAgentId,
  agents,
  onAssignAgent,
  onShowContext,
}: {
  conversation: Conversation;
  assignedAgentName?: string;
  assignedAgentId?: string | null;
  agents?: SalesAgent[];
  onAssignAgent?: (agentId: string | null) => void;
  onShowContext?: (tab?: 'property' | 'customer') => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!conversation.unansweredSince) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [conversation.unansweredSince]);

  const slaMinutes = conversation.unansweredSince
    ? Math.max(0, Math.floor((now - conversation.unansweredSince.getTime()) / 60_000))
    : null;
  const slaUrgent = slaMinutes !== null && slaMinutes >= 5;

  const scoreClass =
    conversation.score === 'high'
      ? 'bg-score-high'
      : conversation.score === 'mid'
      ? 'bg-score-mid'
      : 'bg-score-low';
  const scoreLabel =
    conversation.score === 'high' ? '高' : conversation.score === 'mid' ? '中' : '低';

  const canPickAgent = Boolean(agents && agents.length > 0 && onAssignAgent);

  return (
    <div className="md:hidden shrink-0 w-full flex items-stretch bg-surface border-b border-border-light">
      {/* Left region: score + SLA — opens drawer on property tab */}
      <button
        type="button"
        onClick={() => onShowContext?.('property')}
        disabled={!onShowContext}
        className="flex-1 min-w-0 flex items-center gap-2 px-3 min-h-11 text-left active:bg-surface/70 disabled:cursor-default touch-manipulation"
        aria-label="物件情報を開く"
      >
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${scoreClass}`}
        >
          内見確度 {scoreLabel}
        </span>
        {slaMinutes !== null && (
          <span
            className={`text-xs font-bold whitespace-nowrap ${
              slaUrgent ? 'text-urgent sla-pulse' : 'text-score-mid'
            }`}
          >
            未応答 {slaMinutes}分
          </span>
        )}
      </button>

      {/* Right region: agent picker — opens native select, independent of drawer */}
      {canPickAgent && (
        <label
          className="relative flex items-center gap-1 pl-2 pr-3 min-h-11 border-l border-border-light text-xs text-text-secondary active:bg-surface/70 touch-manipulation"
          aria-label="担当者を選択"
        >
          <span className="truncate max-w-[7rem]">
            担当: {assignedAgentName ?? '未設定'}
          </span>
          <ChevronDownIcon className="h-3 w-3 text-text-tertiary shrink-0" />
          <select
            value={assignedAgentId ?? ''}
            onChange={(e) => onAssignAgent?.(e.target.value || null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="担当者を選択"
          >
            {agents!.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DraftBanner — shown above the composer whenever the current conversation has
// a saved-but-not-yet-sent draft. "展開" injects the draft text into the
// composer (via the same prefill mechanism the obikae proposal flow uses);
// "削除" clears it. The draft itself stays put on expand so the user can still
// abort the edit without losing the stash; it's only cleared by an explicit
// 削除 click or by sending a message.
// ---------------------------------------------------------------------------
function DraftBanner({
  conversationId,
  onExpand,
}: {
  conversationId: string;
  onExpand: (text: string) => void;
}) {
  const { draft, hasDraft, clearDraft } = useDraftMessage(conversationId);
  if (!hasDraft) return null;

  const preview = draft.replace(/\s+/g, ' ').slice(0, 60);
  const truncated = draft.length > 60;

  return (
    <div className="mx-4 mb-2 shrink-0 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 px-2.5 py-1.5">
      <span className="shrink-0 text-[10px] font-bold text-accent bg-white rounded px-1.5 py-0.5 leading-none">
        下書き
      </span>
      <span className="flex-1 min-w-0 truncate text-xs text-text-primary">
        {preview}
        {truncated && '…'}
      </span>
      <button
        type="button"
        onClick={() => {
          // Expand consumes the draft: text moves into the composer and the
          // banner / left-panel badge vanish. The composer is now the source of
          // truth — if the user wants to re-stash, they hit 下書き保存 again.
          onExpand(draft);
          clearDraft();
        }}
        className="shrink-0 bg-accent text-white rounded px-2 py-0.5 text-xs font-bold hover:bg-accent-hover"
      >
        展開する
      </button>
      <button
        type="button"
        onClick={clearDraft}
        className="shrink-0 text-xs text-text-tertiary hover:text-text-secondary"
        title="下書きを削除"
      >
        削除
      </button>
    </div>
  );
}

export default function ChatThread({
  conversation,
  messages,
  aiSuggestion,
  smartReplies,
  onBack,
  onShowContext,
  onSend,
  onSendImages,
  sendError,
  lineDisplayName,
  lineAliasName,
  onRename,
  assignedAgentName,
  assignedAgentId,
  agents,
  onAssignAgent,
  prefillText,
  prefillNonce,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevConversationIdRef = useRef(conversation.id);
  const keyboardInset = useKeyboardInset();
  const { clearDraft, saveDraft, hasDraft } = useDraftMessage(conversation.id);

  // Internal prefill source — bumped when the draft banner is "展開"-ed. Merged
  // with the external (prop) prefill via nonce comparison: whichever was set
  // most recently wins, so the obikae prefill flow and the draft expand flow
  // can coexist without trampling each other.
  const [internalPrefill, setInternalPrefill] = useState<{
    text: string;
    nonce: number;
  } | null>(null);

  const externalNonce = prefillNonce ?? -1;
  const internalNonce = internalPrefill?.nonce ?? -1;
  const useInternal = internalNonce > externalNonce;
  const composerPrefillText = useInternal ? internalPrefill?.text : prefillText;
  const composerPrefillNonce = useInternal ? internalNonce : prefillNonce;

  const handleExpandDraft = useCallback((text: string) => {
    setInternalPrefill({ text, nonce: Date.now() });
  }, []);

  // Reply/quote target for the composer. Cleared when the conversation switches
  // so the reply doesn't leak across threads.
  // quoteToken is optional: legacy messages (stored before we started persisting
  // it, or file/location types LINE never emits it for) can still be replied to
  // — they just won't render the quote bubble on the recipient's LINE app. Our
  // own UI always shows the quote card via quotedMessageId.
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    quoteToken?: string;
    senderLabel: string;
    preview: string;
  } | null>(null);
  // Clear reply target when switching conversations — derived-from-props
  // via a "prev id in state" comparison (React 19 idiom; refs can't be read
  // during render).
  const [prevReplyConvId, setPrevReplyConvId] = useState(conversation.id);
  if (prevReplyConvId !== conversation.id) {
    setPrevReplyConvId(conversation.id);
    if (replyTo !== null) setReplyTo(null);
  }

  // Index of the thread's messages by id — used to resolve `quotedMessageId`
  // into a source message snippet inside each bubble. O(n) build per render is
  // fine at these message counts.
  const messagesById = useMemo(() => {
    const m = new Map<string, Message>();
    for (const msg of messages) m.set(msg.id, msg);
    return m;
  }, [messages]);

  const customerLabel = lineAliasName || lineDisplayName || conversation.customerName;
  const senderLabelFor = useCallback(
    (m: Message) => (m.sender === 'agent' ? '自分' : customerLabel),
    [customerLabel],
  );

  const handleReply = useCallback(
    (m: Message) => {
      setReplyTo({
        messageId: m.id,
        quoteToken: m.quoteToken,
        senderLabel: senderLabelFor(m),
        preview: quotePreviewText(m).slice(0, 120),
      });
    },
    [senderLabelFor],
  );
  const handleCancelReply = useCallback(() => setReplyTo(null), []);

  const handleJumpTo = useCallback((id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Brief highlight so the jump lands visibly.
    el.classList.add('ring-2', 'ring-accent');
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-accent');
    }, 1200);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 100;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  }, []);

  useEffect(() => {
    const conversationChanged = prevConversationIdRef.current !== conversation.id;
    prevConversationIdRef.current = conversation.id;

    if (conversationChanged) {
      const el = scrollContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
      return;
    }

    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, conversation.id]);

  // When the virtual keyboard opens, keep the latest message visible
  useEffect(() => {
    if (keyboardInset > 0 && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [keyboardInset]);

  return (
    <div
      className="flex flex-col h-full w-full min-w-0"
      style={{ paddingBottom: keyboardInset }}
    >
      <ThreadHeader
        conversation={conversation}
        onBack={onBack}
        onShowContext={onShowContext}
        lineDisplayName={lineDisplayName}
        lineAliasName={lineAliasName}
        onRename={onRename}
      />
      <MobileChatStickyBar
        conversation={conversation}
        assignedAgentName={assignedAgentName}
        assignedAgentId={assignedAgentId}
        agents={agents}
        onAssignAgent={onAssignAgent}
        onShowContext={onShowContext}
      />
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3"
      >
        {(() => {
          const now = new Date();
          return messages.map((msg, i) => {
            const prev = messages[i - 1];
            const showDate = !prev || !isSameDay(prev.timestamp, msg.timestamp);
            const quotedSource = msg.quotedMessageId
              ? messagesById.get(msg.quotedMessageId) ?? null
              : null;
            const quotedSenderLabel = quotedSource
              ? senderLabelFor(quotedSource)
              : '（引用元）';
            return (
              <Fragment key={msg.id}>
                {showDate && <DateSeparator date={msg.timestamp} now={now} />}
                <MessageBubble
                  message={msg}
                  quotedSource={quotedSource}
                  quotedSenderLabel={quotedSenderLabel}
                  onReply={handleReply}
                  onJumpTo={handleJumpTo}
                  canReply={!!onSend}
                />
              </Fragment>
            );
          });
        })()}
        <div ref={messagesEndRef} />
      </div>
      <SmartReplyPills replies={smartReplies} />
      {aiSuggestion && (
        <AiSuggestionZone
          key={`${conversation.id}:${aiSuggestion.text.slice(0, 24)}`}
          suggestion={aiSuggestion}
          conversationId={conversation.id}
        />
      )}
      <DraftBanner
        conversationId={conversation.id}
        onExpand={handleExpandDraft}
      />
      <MessageComposer
        onSend={onSend}
        onSendImages={onSendImages}
        sendError={sendError}
        prefillText={composerPrefillText}
        prefillNonce={composerPrefillNonce}
        onAfterSend={clearDraft}
        onSaveDraft={saveDraft}
        hasDraft={hasDraft}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
}

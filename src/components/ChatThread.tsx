'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  Conversation,
  Message,
  AiSuggestion,
  SmartReply,
  SuggestedProperty,
  FunnelStage,
} from '@/lib/types';
import { STAGE_CONFIG, AI_MODE_CONFIG } from '@/lib/types';
import { useCallMemo } from '@/lib/use-call-memo';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  conversation: Conversation;
  messages: Message[];
  aiSuggestion: AiSuggestion | null;
  smartReplies: SmartReply[];
  onBack?: () => void;
  onShowContext?: () => void;
  onSend?: (text: string) => Promise<void> | void;
  sendError?: string | null;
  lineDisplayName?: string;
  lineAliasName?: string;
  onRename?: (aliasName: string | null) => Promise<void> | void;
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

function readStatusLabel(status?: string): string | null {
  if (!status) return null;
  if (status === 'sent') return '\u2713';
  if (status === 'delivered') return '\u2713\u2713';
  if (status === 'read') return '\u2713\u2713';
  return null;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-xs tracking-tight text-score-mid">
      {Array.from({ length: 5 }, (_, i) => (i < count ? '★' : '☆')).join('')}
    </span>
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
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
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
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
        className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm relative"
        aria-label="電話メモ"
        title="電話メモ"
      >
        📞
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
            <span className="text-xs font-bold text-text-primary">📞 電話メモ</span>
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
  onShowContext?: () => void;
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

      {/* Avatar */}
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
              className="shrink-0 text-text-tertiary hover:text-text-secondary text-xs px-1"
              aria-label="表示名を編集"
              title="表示名を編集"
            >
              ✏️
            </button>
          )}
        </div>
      )}
      <div className="flex-1" />
      <select
        className="text-xs border border-border rounded-md px-2 py-1 bg-white text-text-primary focus:outline-none focus:ring-1 focus:ring-accent hidden sm:block"
        defaultValue={conversation.stage}
        onChange={(e) => console.log('Stage changed:', e.target.value as FunnelStage)}
      >
        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
          <option key={key} value={key}>{cfg.label}</option>
        ))}
      </select>
      <CallMemoButton conversationId={conversation.id} />

      {/* Context panel toggle (mobile + tablet) */}
      {onShowContext && (
        <button
          type="button"
          onClick={onShowContext}
          className="xl:hidden w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm shrink-0 border border-border"
          aria-label="顧客情報"
        >
          👤
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message Bubble + Interpretation
// ---------------------------------------------------------------------------
function MessageBubble({ message }: { message: Message }) {
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

  return (
    <div className={`msg-enter flex ${isAgent ? 'justify-end' : 'justify-start'} px-4 py-1`}>
      <div className={`max-w-[85%] md:max-w-[75%] flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
            isAgent
              ? 'bg-agent-bubble text-white rounded-2xl rounded-tr-sm'
              : 'bg-customer-bubble text-text-primary rounded-2xl rounded-tl-sm'
          }`}
        >
          {message.text}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs text-text-tertiary">{formatTime(message.timestamp)}</span>
          {readLabel && (
            <span className={`text-xs ${isReadBlue ? 'text-accent' : 'text-text-tertiary'}`}>
              {readLabel}
            </span>
          )}
        </div>

        {/* Interpretation — surface the customer's real intent */}
        {message.sender === 'customer' && message.interpretation && (
          <div className="interpretation-fade mt-1.5 bg-[#fef9c3] border border-[#fde68a] rounded-md px-2 py-1 flex items-start gap-1.5 text-xs leading-snug">
            <span className="shrink-0 text-sm">🔍</span>
            <span className="text-[#92400e] font-bold">{message.interpretation}</span>
          </div>
        )}
      </div>
    </div>
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
function AiSuggestionZone({ suggestion }: { suggestion: AiSuggestion }) {
  const modeConfig = AI_MODE_CONFIG[suggestion.mode];
  const [expanded, setExpanded] = useState(false);
  const [refining, setRefining] = useState<'none' | 'message' | 'property'>('none');
  const [showReasoning, setShowReasoning] = useState(false);

  // Preview: first line only
  const firstLine = suggestion.text.split('\n')[0];
  const props = suggestion.suggestedProperties ?? [];

  return (
    <div className="mx-4 mb-2 shrink-0">
      {/* Collapsed: single-line preview */}
      {!expanded && (
        <button
          type="button"
          className="w-full flex items-center gap-2 bg-ai-surface border border-ai-border rounded-lg px-3 py-2 text-left hover:bg-[#dcfce7] transition-colors"
          onClick={() => setExpanded(true)}
        >
          <span className="text-xs font-bold text-ai-text bg-white/70 rounded-full px-1.5 py-0.5 shrink-0">
            {modeConfig.icon}
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
        <div className="bg-ai-surface border border-ai-border rounded-lg p-2.5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ai-text bg-white/70 rounded-full px-1.5 py-0.5">
              {modeConfig.icon} {modeConfig.label}
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
// Message Composer
// ---------------------------------------------------------------------------
function MessageComposer({
  onSend,
  sendError,
  prefillText,
  prefillNonce,
}: {
  onSend?: (text: string) => Promise<void> | void;
  sendError?: string | null;
  prefillText?: string;
  prefillNonce?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight * 2;
    const maxHeight = lineHeight * 8;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, []);

  // External prefill injection: runs each time `prefillNonce` changes (even if
  // prefillText stays the same string, since the parent bumps the nonce).
  useEffect(() => {
    if (prefillNonce === undefined) return;
    const el = textareaRef.current;
    if (!el || !prefillText) return;
    el.value = prefillText;
    adjustHeight();
    el.focus();
    // Move cursor to end
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      /* ignore */
    }
  }, [prefillNonce, prefillText, adjustHeight]);

  const doSend = useCallback(async () => {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    if (!onSend) {
      console.log('Send (no handler):', text);
      el.value = '';
      adjustHeight();
      return;
    }
    setSending(true);
    try {
      await onSend(text);
      el.value = '';
      adjustHeight();
    } finally {
      setSending(false);
    }
  }, [onSend, adjustHeight]);

  return (
    <div className="border-t border-border bg-white px-4 py-3 shrink-0">
      <textarea
        ref={textareaRef}
        className="w-full resize-none border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
        placeholder="メッセージを入力..."
        rows={2}
        disabled={sending}
        onInput={adjustHeight}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void doSend();
          }
        }}
      />
      {sendError && (
        <div className="mt-1 text-xs text-red-500">送信失敗: {sendError}</div>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              console.log('File(s) selected:', files.map((f) => f.name));
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <button
            type="button"
            className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm"
            aria-label="ファイル添付"
            onClick={() => fileInputRef.current?.click()}
          >
            📎
          </button>
        </div>
        <button
          type="button"
          disabled={sending}
          className="bg-primary text-white rounded-lg px-4 py-1.5 text-xs font-bold flex items-center gap-1 hover:bg-primary-hover hover:shadow-[var(--shadow-1)] transition-[background-color,box-shadow] duration-150 disabled:opacity-60"
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
          onClick={() => void doSend()}
        >
          {sending ? '送信中…' : '送信 ⏎'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatThread (default export)
// ---------------------------------------------------------------------------
export default function ChatThread({
  conversation,
  messages,
  aiSuggestion,
  smartReplies,
  onBack,
  onShowContext,
  onSend,
  sendError,
  lineDisplayName,
  lineAliasName,
  onRename,
  prefillText,
  prefillNonce,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      <ThreadHeader
        conversation={conversation}
        onBack={onBack}
        onShowContext={onShowContext}
        lineDisplayName={lineDisplayName}
        lineAliasName={lineAliasName}
        onRename={onRename}
      />
      <div className="flex-1 overflow-y-auto py-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <SmartReplyPills replies={smartReplies} />
      {aiSuggestion && <AiSuggestionZone suggestion={aiSuggestion} />}
      <MessageComposer
        onSend={onSend}
        sendError={sendError}
        prefillText={prefillText}
        prefillNonce={prefillNonce}
      />
    </div>
  );
}

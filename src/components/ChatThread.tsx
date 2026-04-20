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
import { SCORE_CONFIG, STAGE_CONFIG, AI_MODE_CONFIG } from '@/lib/types';

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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', stable: '' };

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
// Thread Header
// ---------------------------------------------------------------------------
function ThreadHeader({
  conversation,
  onBack,
  onShowContext,
}: {
  conversation: Conversation;
  onBack?: () => void;
  onShowContext?: () => void;
}) {
  const score = SCORE_CONFIG[conversation.score];
  const trend = conversation.scoreTrend ? TREND_ICON[conversation.scoreTrend] : '';
  const conditionSummary = `${conversation.area} ${conversation.propertyType}`;

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

      <span className="text-sm md:text-base font-bold text-text-primary whitespace-nowrap truncate">
        {conversation.customerName}
      </span>
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 hidden sm:inline"
        style={{ color: score.color, backgroundColor: `color-mix(in srgb, ${score.color} 15%, transparent)` }}
      >
        {score.icon}{score.label}{trend}
      </span>
      <span className="text-sm text-text-secondary truncate hidden md:inline">{conditionSummary}</span>
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
      <button type="button" className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm shrink-0" aria-label="電話">📞</button>
      <button type="button" className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm shrink-0 hidden sm:flex" aria-label="メモ">📋</button>

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
function MessageComposer() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight * 2;
    const maxHeight = lineHeight * 8;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, []);

  return (
    <div className="border-t border-border bg-white px-4 py-3 shrink-0">
      <textarea
        ref={textareaRef}
        className="w-full resize-none border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
        placeholder="メッセージを入力..."
        rows={2}
        onInput={adjustHeight}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('Send:', textareaRef.current?.value);
          }
        }}
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button type="button" className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm" aria-label="ファイル添付">📎</button>
          <button type="button" className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm" aria-label="画像添付">📷</button>
          <button type="button" className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-surface transition-colors text-sm" aria-label="物件挿入">🏠</button>
        </div>
        <button
          type="button"
          className="bg-primary text-white rounded-lg px-4 py-1.5 text-xs font-bold flex items-center gap-1 hover:bg-primary-hover hover:shadow-[var(--shadow-1)] transition-[background-color,box-shadow] duration-150"
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
          onClick={() => console.log('Send:', textareaRef.current?.value)}
        >
          送信 ⏎
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
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full min-w-0">
      <ThreadHeader conversation={conversation} onBack={onBack} onShowContext={onShowContext} />
      <div className="flex-1 overflow-y-auto py-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <SmartReplyPills replies={smartReplies} />
      {aiSuggestion && <AiSuggestionZone suggestion={aiSuggestion} />}
      <MessageComposer />
    </div>
  );
}

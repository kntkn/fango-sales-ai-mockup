'use client';

import { useState, useMemo } from 'react';
import type { Conversation, SalesAgent } from '@/lib/types';
import { STAGE_CONFIG } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  agents: SalesAgent[];
  getAssignedAgentId: (conversationId: string) => string | null;
  onAssignAgent: (conversationId: string, agentId: string | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as a Japanese relative time string. */
function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-text-secondary"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx={11} cy={11} r={8} />
      <path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function StageBadge({ stage }: { stage: Conversation['stage'] }) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <span className="inline-flex items-center rounded-full bg-accent/10 text-accent px-1.5 py-0.5 text-[11px] font-bold leading-none">
      {cfg.labelShort}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ConversationCard
// ---------------------------------------------------------------------------

function ConversationCard({
  conversation,
  selected,
  onSelect,
  agents,
  assignedAgentId,
  onAssignAgent,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
  agents: SalesAgent[];
  assignedAgentId: string | null;
  onAssignAgent: (agentId: string | null) => void;
}) {
  const {
    customerName,
    avatarUrl,
    stage,
    lastMessage,
    lastMessageTime,
    unread,
  } = conversation;

  // First character for avatar
  const initial = customerName.charAt(0);

  // Left border: selected takes priority, then unread
  const borderCls = selected
    ? 'border-l-4 border-l-accent bg-ai-surface'
    : unread
      ? 'border-l-4 border-l-accent bg-bg hover:bg-surface'
      : 'border-l-4 border-l-transparent bg-bg hover:bg-surface';

  return (
    <div
      className={`conv-card flex w-full items-start gap-2.5 px-3 py-2.5 text-left ${borderCls}`}
      style={{ minHeight: 72 }}
    >
      {/* Avatar */}
      <button
        type="button"
        onClick={onSelect}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-white overflow-hidden"
        aria-label={`${customerName} の会話を開く`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={customerName}
            className="w-full h-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: name + time (click-to-open) */}
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center justify-between gap-1 text-left"
        >
          <span className="truncate text-sm font-bold text-text-primary">
            {customerName}
          </span>
          <span className="shrink-0 text-xs text-text-secondary">
            {relativeTime(lastMessageTime)}
          </span>
        </button>

        {/* Row 2: stage badge + preview (click-to-open) */}
        <button
          type="button"
          onClick={onSelect}
          className="flex items-center gap-1.5 text-left min-w-0"
        >
          <StageBadge stage={stage} />
          <span className="truncate text-xs text-text-secondary">{lastMessage}</span>
        </button>

        {/* Row 3: agent select + nurture badge */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <label className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
            <span className="shrink-0">担当</span>
            <select
              value={assignedAgentId ?? ''}
              onChange={(e) => onAssignAgent(e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 rounded border border-border-light bg-bg px-1.5 py-0.5 text-xs text-text-primary outline-none"
            >
              {agents.length === 0 && <option value="">未登録</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {conversation.nurtureRecommendation && conversation.stage !== 'deal' && (
            <span className="nurture-pulse inline-flex items-center gap-0.5 text-xs text-score-mid bg-[#b78f0019] rounded-full px-1.5 py-0.5">
              ⏰ 追客
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConversationList (main export)
// ---------------------------------------------------------------------------

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  agents,
  getAssignedAgentId,
  onAssignAgent,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = conversations;

    // Search by customer name, area, or property type
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.propertyType.toLowerCase().includes(q),
      );
    }

    // Always sort by most recent chat first
    return [...list].sort(
      (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
    );
  }, [conversations, search]);

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・物件名で検索"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="divide-y divide-border-light">
          {filtered.map((c) => (
            <ConversationCard
              key={c.id}
              conversation={c}
              selected={c.id === selectedId}
              onSelect={() => onSelect(c.id)}
              agents={agents}
              assignedAgentId={getAssignedAgentId(c.id)}
              onAssignAgent={(agentId) => onAssignAgent(c.id, agentId)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-text-tertiary">
            該当する会話がありません
          </div>
        )}
      </div>
    </div>
  );
}

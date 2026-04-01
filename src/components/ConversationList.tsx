'use client';

import { useState, useMemo } from 'react';
import type { Conversation, ScoreTier } from '@/lib/types';
import { SCORE_CONFIG } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type FilterKey = 'all' | 'unread' | 'action';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'unread', label: '未読' },
  { key: 'action', label: '要対応' },
];

type SortKey = 'unanswered' | 'score' | 'newest' | 'area';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'unanswered', label: '未返信順' },
  { key: 'score', label: '確度順' },
  { key: 'newest', label: '新着順' },
  { key: 'area', label: 'エリア別' },
];

const SCORE_ORDER: Record<ScoreTier, number> = { high: 0, mid: 1, low: 2 };

// SLA thresholds in milliseconds
const SLA_WARN_MS = 3 * 60_000; // 3 min
const SLA_CRIT_MS = 5 * 60_000; // 5 min

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

/** Return the SLA status based on unansweredSince. */
function slaStatus(unansweredSince?: Date): 'ok' | 'warn' | 'crit' {
  if (!unansweredSince) return 'ok';
  const elapsed = Date.now() - unansweredSince.getTime();
  if (elapsed >= SLA_CRIT_MS) return 'crit';
  if (elapsed >= SLA_WARN_MS) return 'warn';
  return 'ok';
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

function ScoreBadge({ score, trend }: { score: ScoreTier; trend?: 'up' | 'down' | 'stable' }) {
  const cfg = SCORE_CONFIG[score];

  const bgMap: Record<ScoreTier, string> = {
    high: 'bg-[#10b98119]',
    mid: 'bg-[#f59e0b19]',
    low: 'bg-[#6b728019]',
  };
  const textMap: Record<ScoreTier, string> = {
    high: 'text-score-high',
    mid: 'text-score-mid',
    low: 'text-score-low',
  };

  const trendEl =
    trend === 'up' ? (
      <span className="text-score-high">↑</span>
    ) : trend === 'down' ? (
      <span className="text-urgent">↓</span>
    ) : null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${bgMap[score]} ${textMap[score]}`}
    >
      {cfg.icon}&thinsp;{cfg.label}
      {trendEl}
    </span>
  );
}

function SlaIndicator({ unansweredSince }: { unansweredSince?: Date }) {
  const status = slaStatus(unansweredSince);
  if (status === 'ok') return null;

  const cls =
    status === 'crit'
      ? 'bg-urgent sla-shake'
      : 'bg-score-mid sla-pulse';

  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${cls}`} />;
}

// ---------------------------------------------------------------------------
// ConversationCard
// ---------------------------------------------------------------------------

function ConversationCard({
  conversation,
  selected,
  onSelect,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const {
    customerName,
    score,
    scoreTrend,
    lastMessage,
    lastMessageTime,
    unread,
    area,
    propertyType,
    unansweredSince,
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
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${borderCls}`}
      style={{ minHeight: 80 }}
    >
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-white">
        {initial}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: name + time + SLA */}
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-sm font-semibold text-text-primary">
            {customerName}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <SlaIndicator unansweredSince={unansweredSince} />
            <span className="text-[11px] text-text-secondary">
              {relativeTime(lastMessageTime)}
            </span>
          </div>
        </div>

        {/* Row 2: score badge + preview */}
        <div className="flex items-center gap-1.5">
          <ScoreBadge score={score} trend={scoreTrend} />
          <span className="truncate text-xs text-text-secondary">{lastMessage}</span>
        </div>

        {/* Row 3: area + property type tags */}
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <span>📍{area}</span>
          <span>🏠{propertyType}</span>
        </div>

        {/* Row 4: Nurture badge */}
        {conversation.nurtureRecommendation && conversation.stage !== 'deal' && (
          <span className="nurture-pulse inline-flex items-center gap-0.5 text-[10px] text-score-mid bg-[#f59e0b19] rounded-full px-1.5 py-0.5 mt-0.5">
            ⏰ 追客
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ConversationList (main export)
// ---------------------------------------------------------------------------

export default function ConversationList({ conversations, selectedId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('unanswered');

  /** Sort conversations within a group by urgency (unansweredSince oldest first, then lastMessageTime). */
  const sortByUrgency = (a: Conversation, b: Conversation) => {
    const aUn = a.unansweredSince?.getTime() ?? Infinity;
    const bUn = b.unansweredSince?.getTime() ?? Infinity;
    if (aUn !== bUn) return aUn - bUn;
    return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
  };

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

    // Filter
    if (filter === 'unread') {
      list = list.filter((c) => c.unread);
    } else if (filter === 'action') {
      list = list.filter((c) => c.unansweredSince != null);
    }

    // Sort
    const sorted = [...list];
    switch (sort) {
      case 'unanswered':
        // Items with unansweredSince come first, sorted oldest-first (most urgent)
        sorted.sort(sortByUrgency);
        break;
      case 'score':
        sorted.sort((a, b) => {
          const diff = SCORE_ORDER[a.score] - SCORE_ORDER[b.score];
          if (diff !== 0) return diff;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
        break;
      case 'newest':
        sorted.sort(
          (a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime(),
        );
        break;
      case 'area':
        // Sorting handled in grouped rendering
        break;
    }

    return sorted;
  }, [conversations, search, filter, sort]);

  // Grouped by area (only used when sort === 'area')
  const areaGroups = useMemo(() => {
    if (sort !== 'area') return null;
    const groups: Record<string, Conversation[]> = {};
    for (const c of filtered) {
      if (!groups[c.area]) groups[c.area] = [];
      groups[c.area].push(c);
    }
    // Sort within each group by urgency
    for (const area of Object.keys(groups)) {
      groups[area].sort(sortByUrgency);
    }
    // Return entries sorted alphabetically by area name
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'ja'));
  }, [filtered, sort]);

  return (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-border bg-bg">
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

      {/* Filter pills */}
      <div className="flex gap-1.5 px-3 pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-border-light'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center px-3 pb-2">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded border border-border bg-transparent px-1.5 py-0.5 text-xs text-text-secondary outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto relative">
        {sort === 'area' && areaGroups ? (
          // Grouped by area
          areaGroups.map(([area, convs]) => (
            <div key={area}>
              <div className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary border-b border-border-light">
                📍{area} ({convs.length})
              </div>
              <div className="divide-y divide-border-light">
                {convs.map((c) => (
                  <ConversationCard
                    key={c.id}
                    conversation={c}
                    selected={c.id === selectedId}
                    onSelect={() => onSelect(c.id)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Flat list
          <div className="divide-y divide-border-light">
            {filtered.map((c) => (
              <ConversationCard
                key={c.id}
                conversation={c}
                selected={c.id === selectedId}
                onSelect={() => onSelect(c.id)}
              />
            ))}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-text-tertiary">
            該当する会話がありません
          </div>
        )}
      </div>
    </div>
  );
}

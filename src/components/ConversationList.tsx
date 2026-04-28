'use client';

import { useState, useMemo, useSyncExternalStore } from 'react';

// Clock store for `relativeTime`. `useSyncExternalStore` requires
// `getSnapshot` to return a *cached* reference — if it returned `Date.now()`
// directly it would look newly-changed on every call and React would report
// an infinite-loop risk. So we hold the last-sampled timestamp in a
// module-scoped slot and only refresh it from inside `subscribe`'s ticker.
let cachedNow = 0;
function subscribeNow(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  // Prime immediately so the first client render has a non-zero snapshot.
  cachedNow = Date.now();
  onChange();
  const id = window.setInterval(() => {
    cachedNow = Date.now();
    onChange();
  }, 30_000);
  return () => window.clearInterval(id);
}
function getNowClient(): number {
  return cachedNow;
}
function getNowServer(): number {
  return 0;
}
import type { Conversation, SalesAgent, RecommendState } from '@/lib/types';
import type { BukkakuState } from '@/lib/types-bukkaku';
import { STAGE_CONFIG } from '@/lib/types';
import { useHasDraft } from '@/lib/use-draft-message';
import { ScheduleIcon } from './Icons';

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
  /** AI property recommendation state keyed by conversationId. */
  recommendations?: Record<string, RecommendState>;
  /** Bukkaku (物確&AD) pipeline state keyed by conversationId. */
  bukkakuStates?: Record<string, BukkakuState>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date as a Japanese relative time string. `now` is passed in so the
 * caller can pin it to a client-mount timestamp (avoids SSR/client hydration
 * mismatch when the server and client clocks straddle a minute boundary).
 */
function relativeTime(date: Date, now: number): string {
  const t = date.getTime();
  if (!Number.isFinite(t)) return '—';
  const diffMs = now - t;
  if (diffMs < 0) return 'たった今';
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
    <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-accent/10 text-accent px-1.5 py-0.5 text-[11px] font-bold leading-none">
      {cfg.labelShort}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Pipeline status badges (物件検索 / 物確&AD検索)
// ---------------------------------------------------------------------------

type PipelineBadgeProps = {
  label: string;
  /** Visual treatment. */
  tone: 'searching' | 'done' | 'error';
  /** Show a spinner dot before the label (running states only). */
  spinning?: boolean;
  /** Optional tooltip. */
  title?: string;
};

function PipelineBadge({ label, tone, spinning, title }: PipelineBadgeProps) {
  const toneCls =
    tone === 'done'
      ? 'bg-[color:var(--score-high)]/15 text-[color:var(--score-high)]'
      : tone === 'error'
        ? 'bg-urgent/10 text-urgent'
        : 'bg-score-mid/15 text-score-mid';

  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${toneCls}`}
    >
      {spinning && (
        <span
          className="inline-block h-2 w-2 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
          aria-hidden
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function recommendBadge(
  state: RecommendState | undefined,
): PipelineBadgeProps | null {
  if (!state || state.status === 'idle') return null;
  if (state.status === 'searching') {
    return {
      label: '物件検索中',
      tone: 'searching',
      spinning: true,
      title: 'Fango Recommend で物件検索中',
    };
  }
  if (state.status === 'error') {
    return {
      label: '物件検索エラー',
      tone: 'error',
      title: state.error ?? '検索エラー',
    };
  }
  // complete
  return {
    label: `物件${state.results.length}件`,
    tone: 'done',
    title: `物件検索完了 (${state.results.length}件)`,
  };
}

function bukkakuBadge(
  state: BukkakuState | undefined,
): PipelineBadgeProps | null {
  if (!state || state.status === 'idle') return null;

  if (state.status === 'connecting') {
    return {
      label: '物確接続中',
      tone: 'searching',
      spinning: true,
    };
  }

  if (state.status === 'reins_fetching') {
    const { current, total } = state.progress.reins;
    const suffix = total > 0 ? ` ${current}/${total}` : '';
    return {
      label: `REINS取得${suffix}`,
      tone: 'searching',
      spinning: true,
      title: 'REINS から物件情報を取得中',
    };
  }

  if (state.status === 'bukaku_running') {
    const { completed, total, found } = state.progress.bukaku;
    const suffix = total > 0 ? ` ${completed}/${total}` : '';
    return {
      label: `物確&AD${suffix}`,
      tone: 'searching',
      spinning: true,
      title: `物確&AD 検索中 (${completed}/${total}、ヒット ${found}件)`,
    };
  }

  if (state.status === 'error') {
    return {
      label: '物確エラー',
      tone: 'error',
      title: state.progress.error ?? '物確エラー',
    };
  }

  if (state.status === 'cancelled') {
    return {
      label: '物確中断',
      tone: 'error',
    };
  }

  // complete
  const vacancies = state.progress.vacancies.length;
  const foundTotal = state.progress.bukaku.found;
  return {
    label: `物確${vacancies > 0 ? `空${vacancies}件` : `完了${foundTotal}件`}`,
    tone: 'done',
    title: `物確&AD 検索完了 (ヒット ${foundTotal}件 / 空室 ${vacancies}件)`,
  };
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
  recommendState,
  bukkakuState,
  now,
}: {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
  agents: SalesAgent[];
  assignedAgentId: string | null;
  onAssignAgent: (agentId: string | null) => void;
  recommendState?: RecommendState;
  bukkakuState?: BukkakuState;
  /** Client-stable "now" timestamp, pinned in the list to avoid SSR mismatch. */
  now: number;
}) {
  const {
    customerName,
    avatarUrl,
    stage,
    lastMessage,
    lastMessageTime,
    unread,
  } = conversation;

  // First character for avatar (grapheme-aware so a leading surrogate-pair
  // codepoint such as 𠮟 doesn't render as a broken half).
  const initial = Array.from(customerName ?? '')[0] ?? '';

  // Draft indicator — true when this customer has a saved-but-not-sent draft
  const hasDraft = useHasDraft(conversation.id);

  // Background: selected takes priority, then unread
  const bgCls = selected
    ? 'bg-ai-surface'
    : unread
      ? 'bg-bg hover:bg-surface'
      : 'bg-bg hover:bg-surface';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        // Don't steal clicks that originated on an interactive descendant
        // (assignee <select>, its <option>, etc.).
        const t = e.target as HTMLElement;
        if (t.closest('select, option, input, textarea, button, a, label')) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        // Only act on keys that bubbled up from the card itself — let nested
        // selects/inputs handle their own Enter/Space so keyboard users can
        // operate the assignee dropdown and any future inline controls.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={`${customerName} の会話を開く`}
      className={`conv-card flex w-full items-start gap-2.5 px-3 py-2.5 text-left cursor-pointer touch-manipulation active:bg-surface/70 ${bgCls}`}
      style={{ minHeight: 72 }}
    >
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-white overflow-hidden">
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
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: name + stage + time (grid — fixed name column keeps stage aligned across cards) */}
        <div
          className="grid items-center gap-1.5 text-left"
          style={{ gridTemplateColumns: '6rem auto 1fr auto' }}
        >
          <span className="truncate text-sm font-bold text-text-primary">
            {customerName}
          </span>
          <StageBadge stage={stage} />
          <span />
          <span className="shrink-0 text-[11px] text-text-secondary">
            {relativeTime(lastMessageTime, now)}
          </span>
        </div>

        {/* Row 2: preview */}
        <div className="flex text-left min-w-0">
          <span className="truncate text-[11px] text-text-secondary">{lastMessage}</span>
        </div>

        {/* Row 2.5: pipeline status badges (物件検索 / 物確&AD) */}
        {(() => {
          const rec = recommendBadge(recommendState);
          const buk = bukkakuBadge(bukkakuState);
          if (!rec && !buk) return null;
          return (
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {rec && <PipelineBadge {...rec} />}
              {buk && <PipelineBadge {...buk} />}
            </div>
          );
        })()}

        {/* Row 3: agent select + nurture badge */}
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <label
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary"
          >
            <span className="shrink-0">担当</span>
            <select
              value={assignedAgentId ?? ''}
              onChange={(e) => onAssignAgent(e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 rounded border border-border-light bg-bg px-2 py-1.5 md:px-1.5 md:py-0.5 text-xs md:text-[11px] text-text-primary outline-none touch-manipulation"
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
            <span className="nurture-pulse inline-flex items-center gap-1 text-xs text-score-mid bg-[#b78f0019] rounded-full px-1.5 py-0.5">
              <ScheduleIcon className="h-3 w-3" />
              追客
            </span>
          )}

          {hasDraft && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-1.5 py-0.5 text-[11px] font-bold leading-none"
              title="この会話に未送信の下書きがあります"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                aria-hidden
              />
              下書きあり
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
  recommendations,
  bukkakuStates,
}: Props) {
  const [search, setSearch] = useState('');
  // Pinned "now" — 0 during SSR (so markup is deterministic), real timestamp
  // after hydration, ticking every 30s so relative labels stay fresh.
  const now = useSyncExternalStore(subscribeNow, getNowClient, getNowServer);

  const filtered = useMemo(() => {
    let list = conversations;

    // Search by customer name (incl. LINE display + alias), area, or property.
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          (c.lineDisplayName ?? '').toLowerCase().includes(q) ||
          (c.lineAliasName ?? '').toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.propertyType.toLowerCase().includes(q),
      );
    }

    // Always sort by most recent chat first. Coerce invalid Dates to 0 so a
    // malformed lastMessageTime doesn't poison Array.sort with NaN.
    return [...list].sort((a, b) => {
      const bt = b.lastMessageTime.getTime();
      const at = a.lastMessageTime.getTime();
      return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
    });
  }, [conversations, search]);

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 min-h-11 md:min-h-0">
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
              recommendState={recommendations?.[c.id]}
              bukkakuState={bukkakuStates?.[c.id]}
              now={now}
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

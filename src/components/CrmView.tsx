'use client';

import { useState, useMemo, useCallback, useSyncExternalStore } from 'react';

// Cached-snapshot clock for useSyncExternalStore. See ConversationList for
// the reasoning — getSnapshot MUST return a stable reference or React flags
// an infinite-loop risk.
let cachedNow = 0;
function subscribeNow(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
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
import type { Conversation, ScoreTier, FunnelStage } from '@/lib/types';
import { SCORE_CONFIG, STAGE_CONFIG } from '@/lib/types';
import { ScoreIcon, LocationIcon, ChatBubbleIcon } from './Icons';
import { setConversationStage } from '@/lib/use-conversation-stage';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  onRenameLine?: (lineUserId: string, aliasName: string | null) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortColumn = 'customerName' | 'stage' | 'score' | 'area' | 'lastMessageTime';
type SortDir = 'asc' | 'desc';

const SCORE_ORDER: Record<ScoreTier, number> = { high: 0, mid: 1, low: 2 };

const STAGE_ORDER: Record<FunnelStage, number> = {
  initial: 0,
  proposal_1: 1,
  proposal_2: 2,
  proposal_3: 3,
  proposal_4plus: 4,
  viewing: 5,
  screening: 6,
  deal: 7,
};

const STAGE_COLORS: Record<FunnelStage, string> = {
  initial: 'bg-[#76767619] text-score-low',
  proposal_1: 'bg-[#264af419] text-[#264af4]',
  proposal_2: 'bg-[#264af419] text-[#264af4]',
  proposal_3: 'bg-[#b78f0019] text-score-mid',
  proposal_4plus: 'bg-[#b78f0019] text-score-mid',
  viewing: 'bg-[#259d6319] text-score-high',
  screening: 'bg-[#6f23d019] text-[#6f23d0]',
  deal: 'bg-[#6f23d019] text-[#6f23d0]',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-text-tertiary ml-0.5">↕</span>;
  return <span className="text-accent ml-0.5">{dir === 'asc' ? '↑' : '↓'}</span>;
}

function ScoreBadge({ score }: { score: ScoreTier }) {
  const cfg = SCORE_CONFIG[score];
  const bgMap: Record<ScoreTier, string> = {
    high: 'bg-[#259d6319]',
    mid: 'bg-[#b78f0019]',
    low: 'bg-[#76767619]',
  };
  const textMap: Record<ScoreTier, string> = {
    high: 'text-score-high',
    mid: 'text-score-mid',
    low: 'text-score-low',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${bgMap[score]} ${textMap[score]}`}
    >
      <ScoreIcon tier={score} className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// NameCell — shows {alias}({displayName}) when renamed, with inline edit
// ---------------------------------------------------------------------------

function NameCell({
  conversation,
  onSelect,
  onRenameLine,
}: {
  conversation: Conversation;
  onSelect: () => void;
  onRenameLine?: (lineUserId: string, aliasName: string | null) => Promise<void>;
}) {
  const { customerName, lineUserId, lineDisplayName, lineAliasName, unread } = conversation;
  const initial = Array.from(customerName ?? '')[0] ?? '';
  const canRename = !!onRenameLine && !!lineUserId;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lineAliasName ?? '');
  const [saving, setSaving] = useState(false);

  const showParen =
    !!lineAliasName && !!lineDisplayName && lineAliasName !== lineDisplayName;

  const submit = useCallback(async () => {
    if (!onRenameLine || !lineUserId) return;
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    const current = lineAliasName ?? null;
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRenameLine(lineUserId, next);
      setEditing(false);
    } catch (err) {
      console.error('rename failed', err);
    } finally {
      setSaving(false);
    }
  }, [draft, lineAliasName, lineUserId, onRenameLine]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-white">
          {initial}
        </div>
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
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2.5 group min-w-0"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-white">
          {initial}
        </div>
        <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
          {customerName}
          {showParen && (
            <span className="ml-1 font-normal text-text-tertiary">
              ({lineDisplayName})
            </span>
          )}
        </span>
        {unread && (
          <span className="inline-block h-2 w-2 rounded-full bg-accent shrink-0" />
        )}
      </button>
      {canRename && (
        <button
          type="button"
          onClick={() => {
            setDraft(lineAliasName ?? '');
            setEditing(true);
          }}
          className="shrink-0 text-text-tertiary hover:text-text-secondary text-xs px-1"
          aria-label="表示名を編集"
          title="表示名を編集"
        >
          ✏️
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CrmView (default export)
// ---------------------------------------------------------------------------

export default function CrmView({ conversations, onSelectConversation, onRenameLine }: Props) {
  const [sortCol, setSortCol] = useState<SortColumn>('lastMessageTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  // "now" via useSyncExternalStore so SSR renders a stable 0 and the client
  // ticks every 30s. See ConversationList for the same pattern.
  const now = useSyncExternalStore(subscribeNow, getNowClient, getNowServer);

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const list = [...conversations];
    const dir = sortDir === 'asc' ? 1 : -1;
    const toTime = (d: Date) => {
      const t = new Date(d).getTime();
      return Number.isFinite(t) ? t : 0;
    };

    list.sort((a, b) => {
      let primary = 0;
      switch (sortCol) {
        case 'customerName':
          primary = dir * (a.customerName ?? '').localeCompare(b.customerName ?? '', 'ja');
          break;
        case 'stage':
          primary = dir * (STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
          break;
        case 'score':
          primary = dir * (SCORE_ORDER[a.score] - SCORE_ORDER[b.score]);
          break;
        case 'area':
          primary = dir * (a.area ?? '').localeCompare(b.area ?? '', 'ja');
          break;
        case 'lastMessageTime':
          primary = dir * (toTime(a.lastMessageTime) - toTime(b.lastMessageTime));
          break;
      }
      // Stable fallback by recency so ties don't jitter on re-renders.
      return primary || toTime(b.lastMessageTime) - toTime(a.lastMessageTime);
    });

    return list;
  }, [conversations, sortCol, sortDir]);

  // Summary stats
  const totalCount = conversations.length;
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of conversations) {
      const label = STAGE_CONFIG[c.stage].label;
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [conversations]);
  const scoreCounts = useMemo(() => {
    const counts: Record<ScoreTier, number> = { high: 0, mid: 0, low: 0 };
    for (const c of conversations) {
      counts[c.score]++;
    }
    return counts;
  }, [conversations]);

  const columns: { key: SortColumn; label: string }[] = [
    { key: 'customerName', label: '顧客名' },
    { key: 'stage', label: 'ステージ' },
    { key: 'score', label: '確度' },
    { key: 'area', label: 'エリア' },
    { key: 'lastMessageTime', label: '最終メッセージ' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary stats */}
      <div className="shrink-0 px-3 md:px-6 py-3 md:py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
          <div className="text-sm">
            <span className="text-text-secondary">総顧客数</span>{' '}
            <span className="font-bold text-text-primary text-lg">{totalCount}</span>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Stage counts — iterate STAGE_CONFIG so the order is stable,
              independent of which stage happened to appear first in the feed. */}
          <div className="flex items-center gap-3 text-xs">
            {(Object.keys(STAGE_CONFIG) as FunnelStage[]).map((key) => {
              const label = STAGE_CONFIG[key].label;
              const count = stageCounts[label] ?? 0;
              if (count === 0) return null;
              return (
                <span key={key} className="text-text-secondary">
                  {label} <span className="font-bold text-text-primary">{count}</span>
                </span>
              );
            })}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Score distribution */}
          <div className="flex items-center gap-3 text-xs">
            {(['high', 'mid', 'low'] as ScoreTier[]).map((tier) => {
              const cfg = SCORE_CONFIG[tier];
              return (
                <span key={tier} className="inline-flex items-center gap-1 text-text-secondary">
                  <ScoreIcon tier={tier} className="h-2.5 w-2.5" />
                  {cfg.label}{' '}
                  <span className="font-bold text-text-primary">{scoreCounts[tier]}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
        <div className="bg-white border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-[#f2f2f2] border-b-2 border-black">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      sortCol === col.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary select-none"
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-0.5 cursor-pointer hover:text-text-primary transition-colors"
                    >
                      {col.label}
                      <SortArrow active={sortCol === col.key} dir={sortDir} />
                    </button>
                  </th>
                ))}
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary">
                  経過時間
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {sorted.map((c) => {
                const stageColor = STAGE_COLORS[c.stage];

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-surface transition-colors"
                  >
                    {/* Customer name */}
                    <td className="px-4 py-3">
                      <NameCell
                        conversation={c}
                        onSelect={() => onSelectConversation(c.id)}
                        onRenameLine={onRenameLine}
                      />
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <select
                        value={c.stage}
                        onChange={(e) =>
                          setConversationStage(c.id, e.target.value as FunnelStage)
                        }
                        className={`rounded-full px-2 py-0.5 text-xs font-bold border-0 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer ${stageColor}`}
                      >
                        {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <ScoreBadge score={c.score} />
                    </td>

                    {/* Area */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                        <LocationIcon className="h-3 w-3" />
                        {c.area}
                      </span>
                    </td>

                    {/* Last message */}
                    <td className="px-4 py-3 max-w-[240px]">
                      <span className="text-xs text-text-secondary truncate block">
                        {c.lastMessage}
                      </span>
                    </td>

                    {/* Elapsed time */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary whitespace-nowrap">
                        {relativeTime(c.lastMessageTime, now)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled
                          title="未実装"
                          className="px-2 py-1 rounded text-xs font-bold bg-accent/5 text-accent/40 cursor-not-allowed"
                        >
                          電話
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          onClick={() => onSelectConversation(c.id)}
                        >
                          <ChatBubbleIcon className="h-3 w-3" />
                          チャット
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

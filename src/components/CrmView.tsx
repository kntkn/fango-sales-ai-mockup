'use client';

import { useState, useMemo } from 'react';
import type { Conversation, ScoreTier, FunnelStage } from '@/lib/types';
import { SCORE_CONFIG, STAGE_CONFIG } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortColumn = 'customerName' | 'stage' | 'score' | 'area' | 'lastMessageTime';
type SortDir = 'asc' | 'desc';

const SCORE_ORDER: Record<ScoreTier, number> = { high: 0, mid: 1, low: 2 };

const STAGE_ORDER: Record<FunnelStage, number> = {
  initial: 0,
  hearing: 1,
  proposal: 2,
  viewing: 3,
  deal: 4,
};

const STAGE_COLORS: Record<FunnelStage, string> = {
  initial: 'bg-[#76767619] text-score-low',
  hearing: 'bg-[#264af419] text-[#264af4]',
  proposal: 'bg-[#b78f0019] text-score-mid',
  viewing: 'bg-[#259d6319] text-score-high',
  deal: 'bg-[#6f23d019] text-[#6f23d0]',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none ${bgMap[score]} ${textMap[score]}`}
    >
      {cfg.icon}&thinsp;{cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CrmView (default export)
// ---------------------------------------------------------------------------

export default function CrmView({ conversations, onSelectConversation }: Props) {
  const [sortCol, setSortCol] = useState<SortColumn>('lastMessageTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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

    list.sort((a, b) => {
      switch (sortCol) {
        case 'customerName':
          return dir * a.customerName.localeCompare(b.customerName, 'ja');
        case 'stage':
          return dir * (STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
        case 'score':
          return dir * (SCORE_ORDER[a.score] - SCORE_ORDER[b.score]);
        case 'area':
          return dir * a.area.localeCompare(b.area, 'ja');
        case 'lastMessageTime':
          return dir * (a.lastMessageTime.getTime() - b.lastMessageTime.getTime());
        default:
          return 0;
      }
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

          {/* Stage counts */}
          <div className="flex items-center gap-3 text-xs">
            {Object.entries(stageCounts).map(([label, count]) => (
              <span key={label} className="text-text-secondary">
                {label} <span className="font-bold text-text-primary">{count}</span>
              </span>
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Score distribution */}
          <div className="flex items-center gap-3 text-xs">
            {(['high', 'mid', 'low'] as ScoreTier[]).map((tier) => {
              const cfg = SCORE_CONFIG[tier];
              return (
                <span key={tier} className="text-text-secondary">
                  {cfg.icon} {cfg.label}{' '}
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
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[60px]">
                  ID
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    <SortArrow active={sortCol === col.key} dir={sortDir} />
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
                const initial = c.customerName.charAt(0);
                const stageCfg = STAGE_CONFIG[c.stage];
                const stageColor = STAGE_COLORS[c.stage];

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-surface transition-colors"
                  >
                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-tertiary tabular-nums">C-{c.id.padStart(3, '0')}</span>
                    </td>

                    {/* Customer name */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onSelectConversation(c.id)}
                        className="flex items-center gap-2.5 group"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-white">
                          {initial}
                        </div>
                        <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
                          {c.customerName}
                        </span>
                        {c.unread && (
                          <span className="inline-block h-2 w-2 rounded-full bg-accent shrink-0" />
                        )}
                      </button>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${stageColor}`}>
                        {stageCfg.label}
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3">
                      <ScoreBadge score={c.score} />
                    </td>

                    {/* Area */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">📍{c.area}</span>
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
                        {relativeTime(c.lastMessageTime)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="px-2 py-1 rounded text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          onClick={() => console.log('Call:', c.customerName)}
                        >
                          📞 電話
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          onClick={() => onSelectConversation(c.id)}
                        >
                          💬 チャット
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

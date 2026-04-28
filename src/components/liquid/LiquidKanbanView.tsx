'use client';

/**
 * LiquidKanbanView — verbatim port of 3002 KanbanView
 * (`code/sales-ai-liquid/src/components/views/KanbanView.tsx`).
 *
 * Cards come from real mockup conversations. Stage moves persist via
 * `setConversationStage` (same store the classic UI uses), so dragging in
 * liquid is reflected back in the classic conversation list immediately.
 */

import { useMemo, useState } from 'react';
import type { Conversation, SalesAgent } from '@/lib/types';
import {
  toLiquidConversation,
  toLiquidStage,
  toMockupStage,
  type LiquidFunnelStage,
} from '@/lib/liquid-shape';
import { setConversationStage } from '@/lib/use-conversation-stage';

const STAGES: { id: LiquidFunnelStage; accent: string }[] = [
  { id: '反響/初回', accent: '#94a3b8' },
  { id: '提案', accent: '#38bdf8' },
  { id: '内見', accent: '#818cf8' },
  { id: '申込', accent: '#a78bfa' },
  { id: '成約', accent: '#34d399' },
];

const STAGE_ACCENT: Record<LiquidFunnelStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.accent]),
) as Record<LiquidFunnelStage, string>;

function relativeTime(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const totalHours = Math.abs(h) % (24 * 14);
  if (totalHours === 0) return 'now';
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  return `${days}d`;
}

interface Card {
  id: string;
  name: string;
  honorific: string;
  initial: string;
  tone: string;
  stage: LiquidFunnelStage;
  staffName: string;
  mockupStage: Conversation['stage'];
}

interface Props {
  conversations: Conversation[];
  agents: SalesAgent[];
  getAssignedAgentId: (conversationId: string) => string | null;
  onSelectCustomer: (conversationId: string) => void;
}

export default function LiquidKanbanView({
  conversations,
  agents,
  getAssignedAgentId,
  onSelectCustomer,
}: Props) {
  const cards = useMemo<Card[]>(() => {
    const agentById = new Map(agents.map((a) => [a.id, a]));
    return conversations.map((c) => {
      const liq = toLiquidConversation(c);
      const aid = getAssignedAgentId(c.id);
      return {
        id: c.id,
        name: liq.customer.name,
        honorific: liq.customer.honorific,
        initial: liq.customer.initial,
        tone: liq.customer.avatarTone,
        stage: liq.funnelStage,
        staffName: aid ? agentById.get(aid)?.name ?? '—' : '—',
        mockupStage: c.stage,
      };
    });
  }, [conversations, agents, getAssignedAgentId]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<LiquidFunnelStage | null>(null);

  const grouped = useMemo(() => {
    const map: Record<LiquidFunnelStage, Card[]> = {
      '反響/初回': [],
      提案: [],
      内見: [],
      申込: [],
      成約: [],
    };
    cards.forEach((c) => map[c.stage].push(c));
    return map;
  }, [cards]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setHoverStage(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: LiquidFunnelStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoverStage !== stage) setHoverStage(stage);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>, stage: LiquidFunnelStage) {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (hoverStage === stage) setHoverStage(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, stage: LiquidFunnelStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (!id) return;
    const card = cards.find((c) => c.id === id);
    if (card) {
      const next = toMockupStage(stage, card.mockupStage);
      setConversationStage(id, next);
    }
    setDraggingId(null);
    setHoverStage(null);
  }

  // Use the live `cards` (recomputed when stage changes propagate).
  void toLiquidStage;

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
        <div className="h-full min-w-max flex gap-5 px-6 py-5">
          {STAGES.map((stage) => {
            const items = grouped[stage.id];
            const isHover = hoverStage === stage.id;
            return (
              <div
                key={stage.id}
                className="w-[280px] flex flex-col min-h-0 shrink-0"
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="px-1 mb-2.5 flex items-center gap-2 h-7">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: stage.accent }}
                  />
                  <span className="text-[12.5px] font-semibold text-slate-800 tracking-tight">
                    {stage.id}
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {items.length}
                  </span>
                </div>

                <div
                  className={[
                    'flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1 rounded-md transition-colors duration-150',
                    isHover ? 'bg-sky-50/70 ring-2 ring-sky-300/60 ring-inset' : '',
                  ].join(' ')}
                >
                  {items.length === 0 ? (
                    <div
                      className={[
                        'text-[11px] text-center py-8 border border-dashed rounded-md transition-colors duration-150',
                        isHover ? 'border-sky-300 text-sky-500' : 'border-slate-200 text-slate-300',
                      ].join(' ')}
                    >
                      {isHover ? 'ここにドロップ' : '—'}
                    </div>
                  ) : (
                    items.map((c) => {
                      const isDragging = draggingId === c.id;
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectCustomer(c.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectCustomer(c.id);
                            }
                          }}
                          title="クリックでチャットを開く / ドラッグでステージ変更"
                          style={{
                            borderLeftColor: STAGE_ACCENT[c.stage],
                            borderLeftWidth: 2,
                          }}
                          className={[
                            'group relative rounded-md border border-slate-200 bg-white pl-3 pr-2 py-2 grid grid-cols-[1fr_auto] gap-2 items-center text-left',
                            'cursor-grab active:cursor-grabbing select-none',
                            'hover:bg-slate-50 hover:border-slate-300',
                            isDragging
                              ? 'opacity-50 ring-2 ring-sky-400/70 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_18px_38px_-12px_rgba(15,23,42,0.28)]'
                              : '',
                            'transition-[opacity,background-color,border-color,box-shadow] duration-150',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold tracking-tight text-slate-900 truncate">
                              {c.name}
                              {c.honorific}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500 truncate inline-flex items-center gap-1.5 tabular-nums">
                              <span className="inline-flex items-center gap-0.5">
                                <span className="msym msym-sm" style={{ fontSize: 12 }}>
                                  person
                                </span>
                                {c.staffName}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center gap-0.5">
                                <span className="msym msym-sm" style={{ fontSize: 12 }}>
                                  schedule
                                </span>
                                {relativeTime(c.id)}
                              </span>
                            </div>
                          </div>
                          <span
                            aria-hidden="true"
                            className="relative shrink-0 w-7 h-7 rounded-md grid place-items-center text-slate-300 group-hover:text-sky-600 group-hover:bg-sky-50 transition-colors duration-150"
                          >
                            <span className="msym msym-sm" style={{ fontSize: 16 }}>
                              arrow_outward
                            </span>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute right-0 -top-1 -translate-y-full whitespace-nowrap px-2 py-1 rounded-md bg-slate-900 text-white text-[10.5px] font-semibold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-[0_2px_4px_rgba(15,23,42,0.1),0_8px_18px_-6px_rgba(15,23,42,0.3)] z-10 inline-flex items-center gap-1"
                            >
                              <span className="msym msym-sm" style={{ fontSize: 12 }}>
                                chat
                              </span>
                              チャット画面を開く
                              <span
                                aria-hidden="true"
                                className="absolute right-3 top-full w-0 h-0"
                                style={{
                                  borderLeft: '4px solid transparent',
                                  borderRight: '4px solid transparent',
                                  borderTop: '4px solid rgb(15, 23, 42)',
                                }}
                              />
                            </span>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

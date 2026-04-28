'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Conversation } from '@/lib/types';
import { toLiquidConversation, type LiquidConversation } from '@/lib/liquid-shape';
import { useAllDrafts } from '@/lib/use-draft-message';

type InboxTab = 'inbox' | 'draft';

const TABS: { id: InboxTab; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'draft', label: 'Draft' },
];

interface Props {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function LiquidConversationList({
  conversations,
  selectedId,
  onSelect,
}: Props) {
  const [tab, setTab] = useState<InboxTab>('inbox');
  const draftByConv = useAllDrafts();

  // Tick `now` once a minute so relative timestamps stay live. The initial
  // value comes from useState's lazy init (client-only) — which is fine
  // because this component lives below 'use client' boundary anyway.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const liquidList = useMemo<LiquidConversation[]>(
    () => conversations.map((c) => toLiquidConversation(c)),
    [conversations],
  );

  // Override lastMessageAt with `now`-relative format so timestamps stay live.
  const liquidWithLiveTime = useMemo(
    () =>
      conversations.map((c, i) => {
        const liq = liquidList[i];
        return { ...liq, lastMessageAt: relativeTime(c.lastMessageTime, now) };
      }),
    [conversations, liquidList, now],
  );

  const counts = useMemo(() => {
    const inbox = liquidWithLiveTime.length;
    const draft = liquidWithLiveTime.filter(
      (c) => (draftByConv[c.id] ?? '').trim().length > 0,
    ).length;
    return { inbox, draft };
  }, [liquidWithLiveTime, draftByConv]);

  const filtered = useMemo(() => {
    if (tab === 'draft') {
      return liquidWithLiveTime.filter(
        (c) => (draftByConv[c.id] ?? '').trim().length > 0,
      );
    }
    return liquidWithLiveTime;
  }, [liquidWithLiveTime, tab, draftByConv]);

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="h-14 flex items-end border-b border-slate-900/[0.06]">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const hasDot = t.id === 'draft' && counts.draft > 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'relative flex-1 py-2.5 text-[12.5px] font-semibold tracking-tight transition-colors duration-[180ms] -mb-px flex items-center justify-center gap-1.5',
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
            >
              {t.label}
              {hasDot ? (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.18)]" />
              ) : null}
              {isActive ? (
                <span className="absolute left-4 right-4 -bottom-px h-[2px] bg-sky-500 rounded-full" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-[12px] text-slate-500 text-center py-10">
            <span className="msym msym-lg block mb-2 text-slate-400">
              {tab === 'draft' ? 'auto_awesome' : 'inbox'}
            </span>
            {tab === 'draft' ? '下書きはありません' : '会話がありません'}
          </div>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((c) => {
              const selected = c.id === selectedId;
              const draft = draftByConv[c.id] ?? '';
              const isDraftTab = tab === 'draft';
              const hasDraftIndicator =
                !isDraftTab && (draftByConv[c.id] ?? '').trim().length > 0;
              const hasUnread =
                !isDraftTab && c.unreadCount > 0 && !hasDraftIndicator;

              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={[
                      'relative w-full text-left flex items-center gap-2.5 px-3 py-2.5 transition-colors duration-150 border-l-2',
                      selected
                        ? 'bg-sky-50 border-l-sky-500'
                        : 'border-l-transparent hover:bg-slate-50',
                    ].join(' ')}
                    style={{ minHeight: 44 }}
                  >
                    <span className="w-3.5 shrink-0 flex items-center justify-center">
                      {hasUnread ? (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.18)]"
                          aria-label="未読あり"
                          title="未読"
                        />
                      ) : null}
                      {hasDraftIndicator ? (
                        <span
                          className="msym msym-sm text-amber-600"
                          style={{ fontSize: 12 }}
                          aria-label="下書きあり"
                          title="下書きあり"
                        >
                          edit
                        </span>
                      ) : null}
                    </span>

                    <span
                      className={[
                        'text-[12.5px] tracking-tight truncate shrink-0 max-w-[7em]',
                        hasUnread || selected
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-700',
                      ].join(' ')}
                    >
                      {c.customer.name}
                      {c.customer.honorific}
                    </span>

                    <span
                      className={[
                        'text-[11.5px] truncate flex-1 min-w-0',
                        isDraftTab
                          ? 'text-slate-500 italic'
                          : hasUnread
                            ? 'text-slate-700'
                            : 'text-slate-500',
                      ].join(' ')}
                    >
                      {isDraftTab ? draft : c.lastMessagePreview}
                    </span>

                    <span
                      className={[
                        'text-[10.5px] tabular-nums shrink-0',
                        hasUnread ? 'text-sky-600 font-semibold' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {c.lastMessageAt}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

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
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

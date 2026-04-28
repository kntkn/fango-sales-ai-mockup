'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { SalesAgent, ViewingSlot } from '@/lib/types';

// Day boundary as a useSyncExternalStore feed. The snapshot value must be a
// stable reference (same primitive on repeated calls) — otherwise React
// treats the store as constantly changing and warns about an infinite loop.
// We cache the last-observed midnight and only refresh it from within
// `subscribe`'s ticker.
function computeDayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
let cachedDayMs = 0;
function subscribeDay(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  cachedDayMs = computeDayStart();
  onChange();
  const id = window.setInterval(() => {
    const next = computeDayStart();
    if (next !== cachedDayMs) {
      cachedDayMs = next;
      onChange();
    }
  }, 60 * 60 * 1000);
  return () => window.clearInterval(id);
}
function getDayClient(): number {
  return cachedDayMs;
}
function getDayServer(): number {
  return 0;
}
function useToday(): Date | null {
  const ms = useSyncExternalStore(subscribeDay, getDayClient, getDayServer);
  return ms === 0 ? null : new Date(ms);
}

interface Props {
  agents: SalesAgent[];
  viewingSlots: ViewingSlot[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9..18
const HOUR_HEIGHT = 60; // px per hour
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ---------------------------------------------------------------------------
// Today Timeline Section
// ---------------------------------------------------------------------------

function TodayTimeline({ agents, slots }: { agents: SalesAgent[]; slots: ViewingSlot[] }) {
  const today = useToday();
  const todayMs = today?.getTime() ?? 0;
  const todaySlots = useMemo(
    () => (todayMs ? slots.filter((s) => isSameDay(s.startTime, new Date(todayMs))) : []),
    [slots, todayMs],
  );

  const todaySummary = useMemo(() => {
    const confirmed = todaySlots.filter((s) => s.status === 'confirmed').length;
    const pending = todaySlots.filter((s) => s.status === 'pending').length;
    return { total: todaySlots.length, confirmed, pending };
  }, [todaySlots]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-text-primary">本日のスケジュール</div>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <span>{todaySummary.total}件</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-accent" /> 確定 {todaySummary.confirmed}</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-score-mid" /> 調整中 {todaySummary.pending}</span>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto bg-white">
        <div className="min-w-[500px]">
        {/* Agent header row */}
        <div className="flex border-b-2 border-black bg-[#f2f2f2]">
          <div className="w-[56px] shrink-0" />
          {agents.map((agent) => (
            <div key={agent.id} className="flex-1 text-center py-2 text-xs font-bold text-text-primary border-l border-border">
              {agent.name}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          {/* Time labels */}
          <div className="w-[56px] shrink-0 relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-right pr-2 text-xs text-text-tertiary"
                style={{ top: (h - 9) * HOUR_HEIGHT - 7 }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Agent columns */}
          {agents.map((agent) => {
            const agentSlots = todaySlots.filter((s) => s.agentId === agent.id);
            return (
              <div key={agent.id} className="flex-1 relative border-l border-border">
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border-light"
                    style={{ top: (h - 9) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Slot blocks */}
                {agentSlots.map((s) => {
                  const startH = s.startTime.getHours() + s.startTime.getMinutes() / 60;
                  const endH = s.endTime.getHours() + s.endTime.getMinutes() / 60;
                  const top = (startH - 9) * HOUR_HEIGHT;
                  const height = (endH - startH) * HOUR_HEIGHT;
                  const isConfirmed = s.status === 'confirmed';

                  return (
                    <div
                      key={s.id}
                      // Read-only in the mockup — no open-detail flow is wired
                      // yet, so don't advertise clickability.
                      className={`absolute left-1 right-1 rounded-md px-2 py-1.5 transition-colors ${
                        isConfirmed
                          ? 'bg-accent/10 border border-accent/30'
                          : 'bg-score-mid/10 border border-score-mid/30'
                      }`}
                      style={{ top, height: Math.max(height, 36) }}
                    >
                      <div className="text-xs font-bold text-text-primary truncate">{s.customerName}</div>
                      <div className="text-xs text-text-secondary truncate">{s.area} {s.property}</div>
                      <div className={`text-xs font-bold ${isConfirmed ? 'text-accent' : 'text-score-mid'}`}>
                        {isConfirmed ? '確定' : '調整中'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Two-Week Calendar Section
// ---------------------------------------------------------------------------

function TwoWeekCalendar({ agents, slots }: { agents: SalesAgent[]; slots: ViewingSlot[] }) {
  const today = useToday();
  // Memo on the primitive timestamp so the 14-day array isn't rebuilt on
  // every render (a Date object would always be a new reference).
  const todayMs = today?.getTime() ?? 0;
  const days = useMemo(() => {
    if (!todayMs) return [];
    return Array.from({ length: 14 }, (_, i) => new Date(todayMs + i * 24 * 60 * 60_000));
  }, [todayMs]);

  const getCounts = (agentId: string, day: Date) => {
    const daySlots = slots.filter((s) => s.agentId === agentId && isSameDay(s.startTime, day));
    return {
      confirmed: daySlots.filter((s) => s.status === 'confirmed').length,
      pending: daySlots.filter((s) => s.status === 'pending').length,
    };
  };

  return (
    <div>
      <div className="text-sm font-bold text-text-primary mb-3">2週間カレンダー</div>

      <div className="border border-border rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="bg-[#f2f2f2] border-b-2 border-black">
                <th className="text-left px-3 py-2 text-text-secondary font-bold w-[72px]">担当</th>
                {days.map((d, i) => {
                  const isToday = i === 0;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={i}
                      className={`text-center px-1 py-2 font-bold ${
                        isToday ? 'text-accent bg-accent/5' : isWeekend ? 'text-text-tertiary' : 'text-text-secondary'
                      }`}
                    >
                      <div>{d.getDate()}</div>
                      <div className="text-xs">{DAY_LABELS[d.getDay()]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td className="px-3 py-2.5 text-text-primary font-bold">{agent.name}</td>
                  {days.map((d, i) => {
                    const { confirmed, pending } = getCounts(agent.id, d);
                    const isToday = i === 0;
                    return (
                      <td
                        key={i}
                        className={`text-center py-2.5 transition-colors ${isToday ? 'bg-accent/5' : ''}`}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          {Array.from({ length: confirmed }, (_, j) => (
                            <span key={`c${j}`} className="inline-block w-2 h-2 rounded-full bg-accent" />
                          ))}
                          {Array.from({ length: pending }, (_, j) => (
                            <span key={`p${j}`} className="inline-block w-2 h-2 rounded-full border border-score-mid" />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-accent" /> 確定</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full border border-score-mid" /> 調整中</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewingCalendarView (default export)
// ---------------------------------------------------------------------------

export default function ViewingCalendarView({ agents, viewingSlots }: Props) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-3 md:px-6 py-3 md:py-4 flex flex-col gap-6">
        <TodayTimeline agents={agents} slots={viewingSlots} />
        <TwoWeekCalendar agents={agents} slots={viewingSlots} />
      </div>
    </div>
  );
}

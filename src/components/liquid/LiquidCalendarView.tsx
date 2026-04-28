'use client';

/**
 * LiquidCalendarView — verbatim port of 3002 `CalendarView`
 * (`code/sales-ai-liquid/src/components/views/CalendarView.tsx`).
 *
 * Differences from 3002:
 *   - events come from real mockup `viewingSlots: ViewingSlot[]` (not the
 *     hard-coded CAL_EVENTS demo array). Conversion is local.
 *   - "today" is the actual `new Date()`, not the static CAL_TODAY anchor.
 *   - render range covers any month with at least one event, plus the current
 *     month and ±2 surrounding months for scrollable context.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ViewingSlot } from '@/lib/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const EVENT_TONE = '#60a5fa';

const JP_HOLIDAYS_2026: Record<string, string> = {
  '2-11': '建国記念の日',
  '2-23': '天皇誕生日',
  '3-20': '春分の日',
  '4-29': '昭和の日',
  '5-3': '憲法記念日',
  '5-4': 'みどりの日',
  '5-5': 'こどもの日',
  '5-6': '振替休日',
  '7-20': '海の日',
};

function isHoliday(month: number, day: number): string | null {
  return JP_HOLIDAYS_2026[`${month}-${day}`] ?? null;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

interface CalendarEvent {
  year: number;
  month: number;
  day: number;
  startHour: number;
  startMin: number;
  durationMin: number;
  title: string;
  customer: string;
  staff: string;
  tone: string;
}

function sameDate(a: CalendarDate | null, b: CalendarDate): boolean {
  return !!a && a.year === b.year && a.month === b.month && a.day === b.day;
}

function todayDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function slotToEvent(s: ViewingSlot): CalendarEvent {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  return {
    year: start.getFullYear(),
    month: start.getMonth() + 1,
    day: start.getDate(),
    startHour: start.getHours(),
    startMin: start.getMinutes(),
    durationMin: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
    title: `${s.area} ${s.property}`,
    customer: s.customerName,
    staff: s.agentName,
    tone: EVENT_TONE,
  };
}

interface Props {
  viewingSlots: ViewingSlot[];
}

export default function LiquidCalendarView({ viewingSlots }: Props) {
  const TODAY = useMemo(() => todayDate(), []);
  const [selectedDate, setSelectedDate] = useState<CalendarDate | null>(TODAY);
  const scrollRef = useRef<HTMLDivElement>(null);

  const events = useMemo(() => viewingSlots.map(slotToEvent), [viewingSlots]);

  // Render range: 2 months before today's month, + 5 months after, plus any
  // months that hold events outside that window.
  const monthsToRender = useMemo(() => {
    const set = new Set<string>();
    const push = (year: number, month: number) => set.add(`${year}-${month}`);
    for (let i = -2; i <= 5; i++) {
      const d = new Date(TODAY.year, TODAY.month - 1 + i, 1);
      push(d.getFullYear(), d.getMonth() + 1);
    }
    for (const e of events) push(e.year, e.month);
    return [...set]
      .map((k) => {
        const [y, m] = k.split('-').map(Number);
        return { year: y, month: m };
      })
      .sort((a, b) => (a.year - b.year) * 100 + (a.month - b.month));
  }, [events, TODAY]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-month="${TODAY.year}-${TODAY.month}"]`,
    );
    if (el instanceof HTMLElement) {
      scrollRef.current.scrollTop = el.offsetTop - 48;
    }
  }, [TODAY]);

  const goToToday = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-month="${TODAY.year}-${TODAY.month}"]`,
    );
    if (el instanceof HTMLElement) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 48, behavior: 'smooth' });
    }
    setSelectedDate(TODAY);
  };

  return (
    <section className="relative flex flex-col h-full min-h-0">
      <button
        type="button"
        onClick={goToToday}
        className="absolute top-3 right-4 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white/90 backdrop-blur-md border border-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_22px_-10px_rgba(15,23,42,0.18)] transition-colors"
        aria-label="今日へ移動"
        title="今日へ移動"
      >
        <span className="msym msym-sm" style={{ fontSize: 13 }}>
          today
        </span>
        Today
      </button>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-5 pb-10">
          {monthsToRender.map((m) => (
            <MonthBlock
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              today={TODAY}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MonthBlock({
  year,
  month,
  today,
  events,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  today: CalendarDate;
  events: CalendarEvent[];
  selectedDate: CalendarDate | null;
  onSelectDate: (d: CalendarDate) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const cells: ({ day: number; events: CalendarEvent[] } | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push({
        day: dayNum,
        events: events.filter(
          (e) => e.year === year && e.month === month && e.day === dayNum,
        ),
      });
    }
  }

  const isCurrentMonth = year === today.year && month === today.month;

  return (
    <div data-month={`${year}-${month}`} className="max-w-[1100px] mx-auto pt-6">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[18px] font-bold text-slate-900 tracking-tight">
          {MONTH_NAMES[month - 1]}
        </span>
        <span className="text-[12px] text-slate-400 tabular-nums">{year}</span>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200/50 rounded-lg overflow-hidden border border-slate-200/60">
        {cells.map((c, i) => {
          const weekday = i % 7;
          const inFirstWeek = i < 7;
          const weekdayLabel = inFirstWeek ? (
            <div
              className={[
                'text-[9.5px] font-semibold tracking-[0.08em] uppercase leading-none text-center',
                weekday === 0
                  ? 'text-red-500'
                  : weekday === 6
                    ? 'text-sky-600'
                    : 'text-slate-400',
              ].join(' ')}
            >
              {WEEKDAYS[weekday]}
            </div>
          ) : null;

          if (!c) {
            return (
              <div
                key={`e-${i}`}
                className="min-h-[112px] bg-white/60 p-2 flex flex-col"
              >
                {weekdayLabel}
              </div>
            );
          }
          const date: CalendarDate = { year, month, day: c.day };
          const isToday = isCurrentMonth && c.day === today.day;
          const isSelected = sameDate(selectedDate, date);
          const holidayName = isHoliday(month, c.day);
          const isHolidayDay = holidayName !== null;

          return (
            <button
              type="button"
              key={c.day}
              onClick={() => onSelectDate(date)}
              title={holidayName ?? undefined}
              className={[
                'relative min-h-[112px] p-2 text-left flex flex-col transition-colors duration-[180ms]',
                isSelected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50',
              ].join(' ')}
            >
              <div className="flex flex-col items-center gap-1 mb-1 shrink-0">
                {weekdayLabel}
                <span
                  className={[
                    'text-[12px] font-semibold tabular-nums inline-flex items-center justify-center leading-none',
                    isToday
                      ? 'text-white bg-sky-500 w-[22px] h-[22px] rounded-full'
                      : isHolidayDay || weekday === 0
                        ? 'text-red-500'
                        : weekday === 6
                          ? 'text-sky-600'
                          : 'text-slate-700',
                  ].join(' ')}
                >
                  {c.day}
                </span>
              </div>

              {c.events.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {c.events.slice(0, 3).map((e, idx) => (
                    <div
                      key={idx}
                      className="text-[10.5px] truncate px-1.5 py-0.5 rounded"
                      style={{
                        color: '#0f172a',
                        background: `${e.tone}1f`,
                        borderLeft: `2px solid ${e.tone}`,
                      }}
                      title={`${String(e.startHour).padStart(2, '0')}:${String(e.startMin).padStart(2, '0')} ${e.staff} ${e.title}`}
                    >
                      <span className="text-slate-500 tabular-nums mr-1">
                        {String(e.startHour).padStart(2, '0')}:
                        {String(e.startMin).padStart(2, '0')}
                      </span>
                      <span className="font-semibold text-slate-700 mr-1">
                        {e.staff}
                      </span>
                      {e.title}
                    </div>
                  ))}
                  {c.events.length > 3 ? (
                    <div className="text-[10px] text-slate-500 px-1.5">
                      +{c.events.length - 3} more
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isSelected ? (
                <span
                  className="absolute inset-0 rounded-none pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 0 0 2px rgba(14, 165, 233, 0.55)',
                  }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import type { ViewMode } from '@/lib/types';

/**
 * LiquidModeRail — verbatim port of 3002 ModeRail
 * (`code/sales-ai-liquid/src/components/layout/ModeRail.tsx`).
 *
 * 5 modes (chat / ad / kanban / calendar / staff) with the exact same icons
 * and the `mode-tab` class chain that lets the active tab's glass surface
 * extend seamlessly into the main content area.
 */

const RAIL_MODES: { id: ViewMode; icon: string; label: string }[] = [
  { id: 'chat', icon: 'chat_bubble', label: '会話' },
  { id: 'ad', icon: 'campaign', label: '広告' },
  { id: 'kanban', icon: 'people', label: '顧客' },
  { id: 'calendar', icon: 'calendar_month', label: '内見' },
  { id: 'staff', icon: 'badge', label: '担当者' },
];

interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}

export default function LiquidModeRail({ mode, onChange }: Props) {
  return (
    <aside className="hidden lg:flex flex-col py-3 gap-0.5 items-stretch">
      {RAIL_MODES.map((m) => {
        const isActive = m.id === mode;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            data-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            aria-label={m.label}
            title={m.label}
            className="mode-tab"
          >
            <span
              className={`msym ${isActive ? 'msym-filled' : ''}`}
              style={{ fontSize: 22 }}
            >
              {m.icon}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

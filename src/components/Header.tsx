'use client';

import type { ViewMode } from '@/lib/types';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const TABS: { key: ViewMode; label: string }[] = [
  { key: 'chat', label: 'チャット' },
  { key: 'crm', label: '顧客リスト' },
  { key: 'calendar', label: '内見カレンダー' },
  { key: 'inquiries', label: '反響リスト' },
];

export default function Header({ viewMode, onViewModeChange }: Props) {
  return (
    <header className="h-12 bg-white border-b border-border flex items-center px-4 gap-4 shrink-0">
      <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide">
        FANGO
      </span>

      <nav className="flex rounded-lg border border-border overflow-hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onViewModeChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === tab.key
                ? 'bg-primary text-white'
                : 'bg-transparent text-text-secondary hover:bg-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

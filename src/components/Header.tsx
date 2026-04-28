'use client';

import type { ViewMode } from '@/lib/types';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const TABS: { key: ViewMode; label: string; mobile: boolean }[] = [
  { key: 'chat', label: 'チャット', mobile: true },
  { key: 'crm', label: '顧客リスト', mobile: false },
  { key: 'inquiries', label: '反響リスト', mobile: false },
  { key: 'agents', label: '担当者リスト', mobile: false },
];

export default function Header({ viewMode, onViewModeChange }: Props) {
  return (
    <header className="h-12 glass-panel-soft border-b border-border-light flex items-center px-3 md:px-4 gap-2 md:gap-4 shrink-0 relative z-10">
      <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide shrink-0">
        FANGO
      </span>

      <nav aria-label="ビュー切替" className="flex rounded-lg border border-border overflow-x-auto min-w-0">
        {TABS.map((tab) => {
          const active = viewMode === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onViewModeChange(tab.key)}
              aria-current={active ? 'page' : undefined}
              className={`${tab.mobile ? 'flex' : 'hidden md:flex'} items-center px-2.5 md:px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap ${
                active
                  ? 'bg-primary text-white'
                  : 'bg-transparent text-text-secondary hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

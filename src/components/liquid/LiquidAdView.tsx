'use client';

/**
 * LiquidAdView — verbatim port of 3002 AdView
 * (`code/sales-ai-liquid/src/components/views/AdView.tsx`).
 *
 * Mockup has no live ad data source yet, so demo cards are seeded statically
 * (visual parity with 3002). Drag-stage moves are local state only and reset
 * on reload — same semantics as 3002.
 */

import { useMemo, useState } from 'react';

type AdStage = '掲載待ち' | '掲載保留' | '掲載指示' | '掲載中' | '取下済';

const STAGES: { id: AdStage; accent: string }[] = [
  { id: '掲載待ち', accent: '#0a84ff' },
  { id: '掲載保留', accent: '#38bdf8' },
  { id: '掲載指示', accent: '#6366f1' },
  { id: '掲載中', accent: '#10b981' },
  { id: '取下済', accent: '#94a3b8' },
];

const STAGE_ACCENT: Record<AdStage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.accent]),
) as Record<AdStage, string>;

interface AdCard {
  id: string;
  title: string;
  stage: AdStage;
  updatedAt: string;
  needsCheck: boolean;
}

const SEED: AdCard[] = [
  { id: 'a1', title: '清澄白河ガーデンレジデンス 102号室', stage: '掲載中', updatedAt: '今日 09:32', needsCheck: false },
  { id: 'a2', title: 'フォレシア深川 301号室', stage: '掲載中', updatedAt: '今日 11:08', needsCheck: false },
  { id: 'a3', title: '三軒茶屋ヤナカ 5F', stage: '掲載指示', updatedAt: '今日 14:22', needsCheck: false },
  { id: 'a4', title: '目黒L 8階', stage: '掲載指示', updatedAt: '昨日 16:45', needsCheck: false },
  { id: 'a5', title: '下北沢サニーコート 2F', stage: '掲載保留', updatedAt: '昨日 10:11', needsCheck: false },
  { id: 'a6', title: '杉並区ハイツ松涛 7階', stage: '掲載待ち', updatedAt: '今日 12:50', needsCheck: true },
  { id: 'a7', title: '世田谷ヴィラ南台 305', stage: '掲載待ち', updatedAt: '昨日 18:30', needsCheck: false },
  { id: 'a8', title: '杉並区コーポ井の頭 401', stage: '掲載待ち', updatedAt: '4/24', needsCheck: true },
  { id: 'a9', title: '中野区プラザ中央', stage: '取下済', updatedAt: '4/22', needsCheck: false },
];

interface Props {
  selectedAdId: string | null;
  onSelectAd: (id: string | null) => void;
}

export default function LiquidAdView({ selectedAdId, onSelectAd }: Props) {
  const [cards, setCards] = useState<AdCard[]>(() => SEED);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<AdStage | null>(null);

  const grouped = useMemo(() => {
    const map: Record<AdStage, AdCard[]> = {
      掲載待ち: [],
      掲載保留: [],
      掲載指示: [],
      掲載中: [],
      取下済: [],
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

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: AdStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (hoverStage !== stage) setHoverStage(stage);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>, stage: AdStage) {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    if (hoverStage === stage) setHoverStage(null);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, stage: AdStage) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (!id) return;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    setDraggingId(null);
    setHoverStage(null);
  }

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
                className="w-[260px] flex flex-col min-h-0 shrink-0"
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
                      const isSelected = selectedAdId === c.id;
                      return (
                        <div
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectAd(c.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelectAd(c.id);
                            }
                          }}
                          title="クリックで詳細を表示 / ドラッグでステージ変更"
                          style={{
                            borderLeftColor: STAGE_ACCENT[c.stage],
                            borderLeftWidth: 2,
                          }}
                          className={[
                            'group relative rounded-md border bg-white pl-3 pr-2.5 py-2 flex flex-col gap-0.5 text-left',
                            'cursor-grab active:cursor-grabbing select-none',
                            isSelected
                              ? 'border-sky-400 bg-sky-50/50'
                              : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300',
                            isDragging
                              ? 'opacity-50 ring-2 ring-sky-400/70 shadow-[0_2px_4px_rgba(15,23,42,0.08),0_18px_38px_-12px_rgba(15,23,42,0.28)]'
                              : '',
                            'transition-[opacity,background-color,border-color,box-shadow] duration-150',
                          ].join(' ')}
                        >
                          {c.needsCheck ? (
                            <span
                              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.18)]"
                              title="要確認"
                              aria-label="要確認"
                            />
                          ) : null}
                          <div className="text-[12.5px] font-semibold tracking-tight text-slate-900 leading-snug truncate pr-3.5">
                            {c.title}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate tabular-nums">
                            {c.updatedAt}
                          </div>
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

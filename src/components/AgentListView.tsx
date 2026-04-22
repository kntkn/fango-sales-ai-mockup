'use client';

import { useState, useRef } from 'react';
import type { SalesAgent } from '@/lib/types';

interface Props {
  agents: SalesAgent[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function DragHandleIcon() {
  return (
    <svg className="h-4 w-4 text-text-secondary" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentRow({
  agent,
  index,
  isDefault,
  draggingIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onRename,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  agent: SalesAgent;
  index: number;
  isDefault: boolean;
  draggingIndex: number | null;
  onDragStart: (i: number) => void;
  onDragOver: (i: number, e: React.DragEvent) => void;
  onDrop: (i: number) => void;
  onDragEnd: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agent.name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== agent.name) onRename(trimmed);
    else setDraft(agent.name);
    setEditing(false);
  };

  const beingDragged = draggingIndex === index;

  return (
    <li
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(index, e)}
      onDrop={() => onDrop(index)}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 rounded-lg border bg-bg px-3 py-2.5 transition-colors ${
        beingDragged ? 'opacity-40 border-accent' : 'border-border-light hover:bg-surface'
      }`}
      style={{ cursor: 'grab' }}
    >
      <span className="shrink-0 text-text-tertiary" aria-label="ドラッグして並び替え">
        <DragHandleIcon />
      </span>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-text-secondary">
        {index + 1}
      </span>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(agent.name);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 rounded border border-border bg-bg px-2 py-1 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(agent.name);
            setEditing(true);
          }}
          className="min-w-0 flex-1 text-left text-sm font-bold text-text-primary truncate"
          title="クリックして名前を編集"
        >
          {agent.name}
        </button>
      )}

      {isDefault && (
        <span className="shrink-0 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[11px] font-bold">
          デフォルト
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="h-7 w-7 rounded border border-border-light text-text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
          title="上へ移動"
          aria-label="上へ移動"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="h-7 w-7 rounded border border-border-light text-text-secondary hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
          title="下へ移動"
          aria-label="下へ移動"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="h-7 w-7 rounded border border-border-light text-urgent hover:bg-urgent/5"
          title="削除"
          aria-label="削除"
        >
          <span className="inline-flex items-center justify-center">
            <TrashIcon />
          </span>
        </button>
      </div>
    </li>
  );
}

export default function AgentListView({ agents, onAdd, onRemove, onRename, onReorder }: Props) {
  const [newName, setNewName] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const overIndexRef = useRef<number | null>(null);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName('');
  };

  const handleDragStart = (i: number) => {
    setDraggingIndex(i);
  };

  const handleDragOver = (i: number, e: React.DragEvent) => {
    e.preventDefault();
    overIndexRef.current = i;
  };

  const handleDrop = (i: number) => {
    if (draggingIndex === null) return;
    if (draggingIndex !== i) onReorder(draggingIndex, i);
    setDraggingIndex(null);
    overIndexRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    overIndexRef.current = null;
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-6">
        <header className="mb-4">
          <h1 className="text-lg font-bold text-text-primary">担当者リスト</h1>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            一番上の担当者が、新規顧客の<strong>デフォルト担当者</strong>として自動設定されます。
            ドラッグ&amp;ドロップ（または矢印ボタン）で並び替えできます。
          </p>
        </header>

        {/* Add agent */}
        <section className="mb-4 rounded-lg border border-border-light bg-bg p-3">
          <label className="mb-2 block text-xs font-bold text-text-secondary">担当者を追加</label>
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="担当者名を入力"
              className="min-w-0 flex-1 rounded border border-border bg-bg px-2.5 py-1.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + 追加
            </button>
          </div>
        </section>

        {/* Agent list */}
        <section>
          {agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border-light bg-bg px-4 py-8 text-center text-xs text-text-tertiary">
              担当者が登録されていません。上のフォームから追加してください。
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {agents.map((agent, i) => (
                <AgentRow
                  key={agent.id}
                  agent={agent}
                  index={i}
                  isDefault={i === 0}
                  draggingIndex={draggingIndex}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  onRemove={() => onRemove(agent.id)}
                  onRename={(name) => onRename(agent.id, name)}
                  onMoveUp={() => onReorder(i, i - 1)}
                  onMoveDown={() => onReorder(i, i + 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < agents.length - 1}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

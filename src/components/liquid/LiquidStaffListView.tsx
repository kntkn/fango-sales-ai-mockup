'use client';

/**
 * LiquidStaffListView — verbatim port of 3002 StaffListView
 * (`code/sales-ai-liquid/src/components/views/StaffListView.tsx`).
 *
 * Wired to mockup `salesAgents` (just id + name) — company/role/lastActive
 * are placeholders since the mockup data model doesn't carry them yet.
 */

import { useState } from 'react';
import type { SalesAgent } from '@/lib/types';

type Company = 'RECIKA' | 'ファンテイズ';

interface StaffRowVM {
  id: string;
  name: string;
  company: Company;
  role: string;
  assignedCount: number;
  lastActive: string;
  currentActivity: string;
}

interface Props {
  agents: SalesAgent[];
  conversationsAssignedTo: (agentId: string) => number;
  selectedStaffId: string | null;
  onSelectStaff: (id: string) => void;
  onAddStaff?: (input: {
    name: string;
    company: Company;
    role: string;
    currentActivity: string;
  }) => void;
}

export default function LiquidStaffListView({
  agents,
  conversationsAssignedTo,
  selectedStaffId,
  onSelectStaff,
  onAddStaff,
}: Props) {
  const [showAdd, setShowAdd] = useState(false);

  const rows: StaffRowVM[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    company: 'RECIKA',
    role: '—',
    assignedCount: conversationsAssignedTo(a.id),
    lastActive: '—',
    currentActivity: '—',
  }));

  return (
    <section className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-auto px-5 py-5">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-end mb-2">
            {onAddStaff ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                <span className="msym msym-sm" style={{ fontSize: 15 }}>
                  add
                </span>
                新規担当者を追加
              </button>
            ) : null}
          </div>

          <div className="rounded-sm border border-slate-300 bg-white overflow-hidden">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="text-left font-semibold tracking-tight px-3 py-2 border-b border-slate-300 w-[160px]">
                    担当者
                  </th>
                  <th className="text-left font-semibold tracking-tight px-3 py-2 border-b border-slate-300 w-[110px]">
                    会社
                  </th>
                  <th className="text-left font-semibold tracking-tight px-3 py-2 border-b border-slate-300">
                    役割
                  </th>
                  <th className="text-right font-semibold tracking-tight px-3 py-2 border-b border-slate-300 w-[80px]">
                    担当数
                  </th>
                  <th className="text-left font-semibold tracking-tight px-3 py-2 border-b border-slate-300 w-[100px]">
                    最終
                  </th>
                  <th className="text-left font-semibold tracking-tight px-3 py-2 border-b border-slate-300">
                    状況
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <StaffRow
                    key={r.id}
                    row={r}
                    selected={r.id === selectedStaffId}
                    onClick={() => onSelectStaff(r.id)}
                    isLast={idx === rows.length - 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAdd && onAddStaff ? (
        <AddStaffModal
          onClose={() => setShowAdd(false)}
          onSubmit={(input) => {
            onAddStaff(input);
            setShowAdd(false);
          }}
        />
      ) : null}
    </section>
  );
}

function StaffRow({
  row,
  selected,
  onClick,
  isLast,
}: {
  row: StaffRowVM;
  selected: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  const cellBorder = isLast ? '' : 'border-b border-slate-200';
  return (
    <tr
      onClick={onClick}
      className={[
        'cursor-pointer transition-colors duration-150',
        selected ? 'bg-sky-50/80' : 'hover:bg-slate-50',
      ].join(' ')}
    >
      <td className={`px-3 py-2.5 ${cellBorder}`}>
        <div className="font-semibold text-slate-900 truncate">{row.name}</div>
      </td>
      <td className={`px-3 py-2.5 text-slate-600 ${cellBorder}`}>{row.company}</td>
      <td className={`px-3 py-2.5 text-slate-700 ${cellBorder}`}>
        <span className="truncate block">{row.role}</span>
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums text-slate-700 ${cellBorder}`}>
        {row.assignedCount}
      </td>
      <td className={`px-3 py-2.5 text-slate-500 ${cellBorder}`}>{row.lastActive}</td>
      <td className={`px-3 py-2.5 text-slate-700 ${cellBorder}`}>
        <span className="truncate block">{row.currentActivity}</span>
      </td>
    </tr>
  );
}

function AddStaffModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    company: Company;
    role: string;
    currentActivity: string;
  }) => void;
}) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState<Company>('RECIKA');
  const [role, setRole] = useState('');
  const [currentActivity, setCurrentActivity] = useState('');

  const canSave = name.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 backdrop-blur-sm animate-[fadein_180ms_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[420px] max-w-[90vw] rounded-md border border-slate-300 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.06),0_24px_56px_-12px_rgba(15,23,42,0.28)] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-[13.5px] font-semibold text-slate-900 tracking-tight">
            新規担当者を追加
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="w-7 h-7 rounded-sm grid place-items-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <span className="msym msym-sm" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2.5">
          <Field label="氏名">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 田中 太郎"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
            />
          </Field>
          <Field label="会社">
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value as Company)}
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
            >
              <option value="RECIKA">RECIKA</option>
              <option value="ファンテイズ">ファンテイズ</option>
            </select>
          </Field>
          <Field label="役割">
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="例: 不動産実務 / 物件提案 / AI実装"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
            />
          </Field>
          <Field label="現在の状況 (任意)">
            <input
              value={currentActivity}
              onChange={(e) => setCurrentActivity(e.target.value)}
              placeholder="例: 佐藤様の提案準備中"
              className="w-full text-[12.5px] px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
            />
          </Field>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-1.5 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-sm border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              canSave &&
              onSubmit({
                name,
                company,
                role: role || '—',
                currentActivity,
              })
            }
            className="text-[12px] font-semibold px-2.5 py-1.5 rounded-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:hover:bg-slate-900"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

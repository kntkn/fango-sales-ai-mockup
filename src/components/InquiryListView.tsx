'use client';

import { useMemo } from 'react';
import type { Inquiry } from '@/lib/types';

interface Props {
  inquiries: Inquiry[];
  onOpenChat: (customerName: string) => void;
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function InquiryListView({ inquiries, onOpenChat }: Props) {
  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inquiries.filter((inq) => inq.timestamp >= today).length;
  }, [inquiries]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary bar */}
      <div className="shrink-0 px-3 md:px-6 py-3 md:py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-secondary">
            本日の反響 <span className="font-bold text-text-primary text-lg">{todayCount}</span>件
          </span>
          <span className="text-sm text-text-secondary">
            合計 <span className="font-bold text-text-primary text-lg">{inquiries.length}</span>件
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
        <div className="bg-white border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-[#f2f2f2] border-b-2 border-black">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[180px]">氏名</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[160px]">電話番号</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[180px]">反響日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-surface transition-colors">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenChat(inq.customerName)}
                      className="text-sm font-bold text-text-primary hover:text-accent transition-colors"
                    >
                      {inq.customerName}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary break-all">
                      {inq.email || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary tabular-nums">
                      {inq.phone || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-text-secondary tabular-nums whitespace-nowrap">
                      {formatDateTime(inq.timestamp)}
                    </span>
                  </td>
                </tr>
              ))}
              {inquiries.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-text-tertiary">
                    反響データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

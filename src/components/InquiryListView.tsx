'use client';

import { useMemo } from 'react';
import type { Inquiry } from '@/lib/types';

interface Props {
  inquiries: Inquiry[];
  onOpenChat: (customerName: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

const SOURCE_STYLE: Record<string, string> = {
  SUUMO: 'bg-[#e25100]/10 text-[#e25100]',
  "HOME'S": 'bg-[#264af4]/10 text-[#264af4]',
  'at home': 'bg-accent/10 text-accent',
};

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
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
        <div className="bg-white border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-[#f2f2f2] border-b-2 border-black">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[72px]">時刻</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[120px]">顧客</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary">メッセージ</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[160px]">物件</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[80px]">流入元</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-text-secondary w-[120px]">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {inquiries.map((inq) => {
                const sourceStyle = SOURCE_STYLE[inq.source] ?? 'bg-border-light text-text-tertiary';

                return (
                  <tr key={inq.id} className="hover:bg-surface transition-colors">
                    {/* Time */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary font-bold tabular-nums">
                        {formatTime(inq.timestamp)}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold text-text-primary">{inq.customerName}</span>
                    </td>

                    {/* Message */}
                    <td className="px-4 py-3">
                      {inq.message ? (
                        <div className="flex items-start gap-1.5">
                          <span className="shrink-0 text-xs">💬</span>
                          <span className="text-xs text-text-primary bg-[#fef9c3] rounded px-1.5 py-0.5 leading-relaxed">
                            {inq.message}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-text-tertiary italic">(メッセージなし)</span>
                      )}
                    </td>

                    {/* Property */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">{inq.property}</span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${sourceStyle}`}>
                        {inq.source}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      {inq.hasLine ? (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                          onClick={() => onOpenChat(inq.customerName)}
                        >
                          チャットを開く
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border border-border text-text-secondary hover:bg-surface transition-colors"
                          onClick={() => console.log('LINE誘導:', inq.customerName)}
                        >
                          LINE誘導
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * LiquidChatLayout — verbatim port of 3002 ChatLayout
 * (`code/sales-ai-liquid/src/components/layout/ChatLayout.tsx`).
 *
 *   [Inbox 260 | LineChatPanel flex]
 *
 * Grid (not flex), overflow-hidden (not overflow-y-auto), so child sections
 * with `flex-1 min-h-0 overflow-y-auto` get a properly bounded scroll viewport
 * — that's what makes the tab bar always visible and the composer full-width.
 */

import type { ReactNode } from 'react';

interface Props {
  inbox: ReactNode;
  chat: ReactNode;
  /** Mobile-only sub-nav: 'inbox' or 'chat'. */
  mobileTab: 'inbox' | 'chat';
}

export default function LiquidChatLayout({ inbox, chat, mobileTab }: Props) {
  return (
    <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div
        className={[
          'min-h-0 flex-col overflow-hidden lg:border-r lg:border-slate-900/[0.06]',
          mobileTab === 'inbox' ? 'flex' : 'hidden',
          'lg:flex',
        ].join(' ')}
      >
        {inbox}
      </div>
      <div
        className={[
          'min-h-0 flex-col overflow-hidden',
          mobileTab === 'chat' ? 'flex' : 'hidden',
          'lg:flex',
        ].join(' ')}
      >
        {chat}
      </div>
    </div>
  );
}

'use client';

import { Drawer } from 'vaul';
import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export default function MobileContextSheet({ open, onOpenChange, children }: Props) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40 md:hidden" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-surface-elevated rounded-t-2xl border-t border-border-light shadow-2xl md:hidden"
          style={{ height: '92dvh' }}
        >
          <Drawer.Title className="sr-only">顧客・物件情報</Drawer.Title>
          <Drawer.Description className="sr-only">
            顧客プロファイルおよび物件提案の詳細
          </Drawer.Description>
          <div
            className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-border"
            aria-hidden
          />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

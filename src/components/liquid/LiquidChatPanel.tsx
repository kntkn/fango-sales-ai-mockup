'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, Message, SalesAgent } from '@/lib/types';
import {
  toLiquidConversation,
  toLiquidMessages,
  toLiquidStaffList,
  toMockupStage,
  type LiquidConversation,
  type LiquidFunnelStage,
  type LiquidLineMessage,
} from '@/lib/liquid-shape';
import { GlassPanel } from './glass/GlassPanel';
import { GlassCapsule } from './glass/GlassCapsule';
import { LiquidLineHeaderMenu } from './LiquidLineHeaderMenu';
import { useCallMemo } from '@/lib/use-call-memo';
import { setConversationStage } from '@/lib/use-conversation-stage';

export interface LiquidChatPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSend?: (
    text: string,
    reply?: { quoteToken?: string; quotedMessageId: string },
  ) => Promise<void> | void;
  onSendImages?: (
    images: Array<{ original: Blob; preview: Blob; fileName: string }>,
  ) => Promise<void> | void;
  sendError?: string | null;
  lineDisplayName?: string;
  lineAliasName?: string;
  onRename?: (aliasName: string | null) => Promise<void> | void;
  assignedAgentId?: string | null;
  agents?: SalesAgent[];
  onAssignAgent?: (agentId: string | null) => void;
  onShowContext?: (tab?: 'property' | 'customer') => void;
  onBack?: () => void;
}

type DraftStatus = 'empty' | 'user';

export default function LiquidChatPanel(props: LiquidChatPanelProps) {
  const {
    conversation,
    messages,
    onSend,
    sendError,
    lineDisplayName,
    lineAliasName,
    onRename,
    assignedAgentId,
    agents,
    onAssignAgent,
    onShowContext,
    onBack,
  } = props;

  const liquidConv = useMemo<LiquidConversation>(
    () => toLiquidConversation(conversation, { lineDisplayName, lineAliasName }),
    [conversation, lineDisplayName, lineAliasName],
  );
  const liquidMsgs = useMemo<LiquidLineMessage[]>(
    () => toLiquidMessages(messages, conversation.id),
    [messages, conversation.id],
  );
  const liquidStaff = useMemo(
    () => toLiquidStaffList(agents ?? []),
    [agents],
  );

  // Local draft state — independent of useDraftMessage for now (Phase 1 keeps
  // the classic per-conv draft persistence inside ChatThread; liquid path runs
  // its own ephemeral composer).
  const [draft, setDraft] = useState('');
  const draftStatus: DraftStatus = draft.trim().length > 0 ? 'user' : 'empty';

  const callMemo = useCallMemo(conversation.id);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  };
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  // Auto-scroll to latest on message arrival.
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liquidMsgs.length]);

  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !onSend || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft('');
    } catch (err) {
      console.error('liquid send failed', err);
    } finally {
      setSending(false);
    }
  };

  const handleChangeStage = (s: LiquidFunnelStage) => {
    const next = toMockupStage(s, conversation.stage);
    setConversationStage(conversation.id, next);
  };

  const handleChangeStaff = (id: string) => {
    onAssignAgent?.(id || null);
  };

  const handleEditCustomer = (patch: {
    name?: string;
    honorific?: string;
    source?: LiquidConversation['source'];
    tags?: string[];
  }) => {
    if (!onRename) return;
    const fullName = `${(patch.name ?? liquidConv.customer.name).trim()}${patch.honorific ?? liquidConv.customer.honorific}`;
    void onRename(fullName || null);
  };

  const handleAddPhoneMemo = (content: string) => {
    const stamp = new Date().toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    const next = callMemo.memo
      ? `${callMemo.memo}\n\n[${stamp}]\n${content}`
      : `[${stamp}]\n${content}`;
    callMemo.setMemo(next);
    callMemo.save();
  };

  return (
    <section className="relative flex flex-col h-full min-h-0">
      <LiquidTopBar
          conversation={liquidConv}
          onBack={onBack}
          onShowContext={onShowContext}
          staffList={liquidStaff}
          currentStaffId={assignedAgentId ?? null}
          onChangeStage={handleChangeStage}
          onChangeStaff={handleChangeStaff}
          onEditCustomer={handleEditCustomer}
          onAddPhoneMemo={handleAddPhoneMemo}
          onAction={showToast}
        />

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-2.5">
            {liquidMsgs.map((m) => (
              <LiquidBubble key={m.id} message={m} />
            ))}
            <div ref={endRef} />
          </div>
        </div>

        {sendError ? (
          <div className="mx-4 mb-2 rounded-md border border-red-300/60 bg-red-50/80 px-3 py-1.5 text-[11.5px] text-red-700">
            {sendError}
          </div>
        ) : null}

        <LiquidComposer
          draft={draft}
          draftStatus={draftStatus}
          disabled={!onSend}
          sending={sending}
          onDraftChange={setDraft}
          onDraftSend={handleSend}
        />

      {toast ? (
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
          <div className="px-3.5 py-2 rounded-full bg-slate-900/90 text-white text-[12px] font-semibold backdrop-blur-md shadow-[0_2px_4px_rgba(15,23,42,0.1),0_18px_42px_-12px_rgba(15,23,42,0.4)] inline-flex items-center gap-1.5 animate-[fadein_180ms_ease-out]">
            <span className="msym msym-sm text-emerald-300" style={{ fontSize: 15 }}>
              check_circle
            </span>
            {toast}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LiquidTopBar({
  conversation,
  onBack,
  onShowContext,
  staffList,
  currentStaffId,
  onChangeStage,
  onChangeStaff,
  onEditCustomer,
  onAddPhoneMemo,
  onAction,
}: {
  conversation: LiquidConversation;
  onBack?: () => void;
  onShowContext?: (tab?: 'property' | 'customer') => void;
  staffList: ReturnType<typeof toLiquidStaffList>;
  currentStaffId: string | null;
  onChangeStage: (s: LiquidFunnelStage) => void;
  onChangeStaff: (id: string) => void;
  onEditCustomer: (patch: {
    name?: string;
    honorific?: string;
    source?: LiquidConversation['source'];
    tags?: string[];
  }) => void;
  onAddPhoneMemo: (content: string) => void;
  onAction: (label: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="px-5 h-14 flex items-center gap-3 border-b border-slate-900/[0.06] shrink-0">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="戻る"
          className="md:hidden w-9 h-9 grid place-items-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors shrink-0"
        >
          <span className="msym" style={{ fontSize: 18 }}>
            arrow_back
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onShowContext?.('customer')}
        disabled={!onShowContext}
        className="w-9 h-9 rounded-full grid place-items-center text-[13px] font-semibold text-white shrink-0 disabled:cursor-default"
        style={{
          background: `linear-gradient(135deg, ${conversation.customer.avatarTone} 0%, #94a3b8 100%)`,
        }}
        aria-label="顧客情報"
      >
        {conversation.customer.initial}
      </button>

      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-slate-900 flex items-center gap-2">
          {conversation.customer.name}
          {conversation.customer.honorific}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {onShowContext ? (
          <GlassCapsule
            icon="apartment"
            label="物件"
            size="sm"
            onClick={() => onShowContext('property')}
          />
        ) : null}
        <div className="relative">
          <GlassCapsule
            icon="more_vert"
            size="sm"
            aria-label="more"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          />
          {menuOpen ? (
            <LiquidLineHeaderMenu
              conversation={conversation}
              staffList={staffList}
              currentStaffId={currentStaffId}
              onChangeStage={onChangeStage}
              onChangeStaff={onChangeStaff}
              onEditCustomer={onEditCustomer}
              onAddPhoneMemo={onAddPhoneMemo}
              onAction={onAction}
              onClose={() => setMenuOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LiquidBubble({ message }: { message: LiquidLineMessage }) {
  const isCustomer = message.direction === 'customer';
  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col gap-1.5 max-w-[82%] ${isCustomer ? 'items-start' : 'items-end'}`}>
        <div
          className={[
            'px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-[0_1px_1px_rgba(15,23,42,0.04)]',
            isCustomer
              ? 'bg-white text-slate-900 rounded-tl-md'
              : 'text-white rounded-tr-md',
          ].join(' ')}
          style={
            isCustomer
              ? undefined
              : {
                  background:
                    'linear-gradient(135deg, #5aa9ff 0%, #0a84ff 50%, #0064d0 100%)',
                  boxShadow:
                    '0 1px 1px rgba(10,100,208,0.16), 0 6px 14px rgba(10,132,255,0.24)',
                }
          }
        >
          <div className="whitespace-pre-line">{message.text}</div>
          <div
            className={`mt-1 text-[10px] ${isCustomer ? 'text-slate-400' : 'text-white/70'} text-right`}
          >
            {message.at}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiquidComposer({
  draft,
  draftStatus,
  disabled,
  sending,
  onDraftChange,
  onDraftSend,
}: {
  draft: string;
  draftStatus: DraftStatus;
  disabled?: boolean;
  sending?: boolean;
  onDraftChange: (text: string) => void;
  onDraftSend: () => void;
}) {
  const canSend = !disabled && !sending && draft.trim().length > 0;

  return (
    <div className="px-4 pb-3 pt-2">
      <GlassPanel
        variant="clear"
        shape="xl"
        className="px-3 py-2"
        style={
          draftStatus === 'user'
            ? {
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,1), inset 1px 0 0 rgba(255,255,255,0.55), inset -1px 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(10,132,255,0.12), 0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(10,132,255,0.1)',
              }
            : undefined
        }
      >
        <div className="flex items-start gap-2">
          <GlassCapsule icon="image" size="sm" aria-label="attach (準備中)" disabled />
          <GlassCapsule icon="attach_file" size="sm" aria-label="file (準備中)" disabled />
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={disabled ? 'このスレッドは送信できません' : 'メッセージを入力'}
            rows={draft.split('\n').length > 2 ? 4 : 1}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-[13px] text-slate-900 placeholder:text-slate-400 py-1.5 px-2 resize-none leading-relaxed disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (canSend) onDraftSend();
              }
            }}
          />
          <GlassCapsule
            icon={sending ? 'progress_activity' : 'send'}
            label="送信"
            size="sm"
            onClick={canSend ? onDraftSend : undefined}
            disabled={!canSend}
            style={{ opacity: canSend ? 1 : 0.45 }}
          />
        </div>
      </GlassPanel>
    </div>
  );
}

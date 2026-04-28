'use client';

/**
 * LiquidContextPanel — 3002-style 4-tab right panel (概要 / 提案 / メモ / AI).
 *
 * Verbatim trace of `code/sales-ai-liquid/src/components/customer/CustomerPage.tsx`:
 *   - Identity header (avatar + name + honorific + contact glass capsules)
 *   - Tab strip (icon + label + sky-500 underline on active)
 *   - Tab body
 *
 * The existing classic mockup PropertyTab (with its PropertyRecommendation
 * count selector + Bukkaku pipeline + property cards + suggested reactions)
 * is rendered verbatim inside the 提案 tab — count selector untouched, per
 * kento's instruction.
 */

import { useState } from 'react';
import type {
  Conversation,
  CustomerProfile,
  Property,
  PersonalityAnalysis,
  SuggestedReaction,
  RecommendState,
} from '@/lib/types';
import type { BukkakuState } from '@/lib/types-bukkaku';
import type { BukkakuResult } from '@/lib/types-bukkaku';
import { PropertyTab } from '../ContextPanel';
import { toLiquidConversation } from '@/lib/liquid-shape';
import { useCallMemo } from '@/lib/use-call-memo';
import { setConversationStage } from '@/lib/use-conversation-stage';
import { STAGE_CONFIG, type FunnelStage } from '@/lib/types';
import { GlassCapsule } from './glass';

type TabId = 'overview' | 'proposals' | 'memos' | 'ai';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'overview', icon: 'dashboard', label: '概要' },
  { id: 'proposals', icon: 'home_work', label: '提案' },
  { id: 'memos', icon: 'edit_note', label: 'メモ' },
  { id: 'ai', icon: 'auto_awesome', label: 'AI' },
];

interface EditableCustomer {
  id: string;
  email: string;
  phone: string;
}

interface Props {
  conversation: Conversation;
  customerProfile: CustomerProfile;
  properties: Property[];
  personality?: PersonalityAnalysis;
  suggestedReactions?: SuggestedReaction[];
  editableCustomer?: EditableCustomer;
  onSaveContact?: (
    id: string,
    patch: { email?: string; phone?: string },
  ) => Promise<void>;
  recommend?: RecommendState;
  hasMessages?: boolean;
  onSearchRecommend?: (resultCount: number) => void;
  onStartObikae?: (vacancies: BukkakuResult[]) => void;
  initialTab?: 'property' | 'customer';
  bukkakuState?: BukkakuState;
  onBukkakuCancel?: () => void;
  onBukkakuReset?: () => void;
  onClose?: () => void;
}

export default function LiquidContextPanel(props: Props) {
  const { conversation, customerProfile } = props;
  const liquidConv = toLiquidConversation(conversation);
  const initialTab: TabId = props.initialTab === 'customer' ? 'overview' : 'proposals';
  const [tab, setTab] = useState<TabId>(initialTab);

  const phone = props.editableCustomer?.phone;
  const email = props.editableCustomer?.email;

  return (
    <section className="flex flex-col h-full min-h-0 relative">
      {props.onClose ? (
        <button
          type="button"
          onClick={props.onClose}
          aria-label="右パネルを閉じる"
          className="absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-full grid place-items-center text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.05] transition-colors duration-200"
        >
          <span className="msym msym-sm" style={{ fontSize: 18 }}>
            chevron_right
          </span>
        </button>
      ) : null}

      <div className="pt-10 pb-4 px-5 flex flex-col items-center">
        <div
          className="w-[72px] h-[72px] rounded-full grid place-items-center text-[24px] font-semibold text-white shrink-0 shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_28px_rgba(15,23,42,0.12)]"
          style={{
            background: `linear-gradient(135deg, ${liquidConv.customer.avatarTone} 0%, #94a3b8 100%)`,
          }}
        >
          {liquidConv.customer.initial}
        </div>
        <div className="mt-3 text-[17px] font-semibold text-slate-900 tracking-tight">
          {liquidConv.customer.name}
          {liquidConv.customer.honorific}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          {phone ? (
            <GlassCapsule icon="call" size="sm" aria-label="電話" title={`電話: ${phone}`} />
          ) : null}
          {email ? (
            <GlassCapsule icon="mail" size="sm" aria-label="メール" title={email} />
          ) : null}
          <GlassCapsule icon="edit_note" size="sm" aria-label="メモ" title="メモを追加" />
        </div>
      </div>

      <div className="px-3">
        <div className="flex items-center gap-0.5 border-b border-slate-900/[0.06]">
          {TABS.map((t) => {
            const isActive = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'relative flex-1 py-2.5 flex flex-col items-center gap-1 transition-colors duration-200',
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
                ].join(' ')}
              >
                <span
                  className={`msym ${isActive ? 'msym-filled' : ''}`}
                  style={{ fontSize: 18 }}
                >
                  {t.icon}
                </span>
                <span className="text-[10.5px] font-semibold tracking-tight leading-none">
                  {t.label}
                </span>
                {isActive ? (
                  <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-sky-500 rounded-full" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {tab === 'overview' ? (
          <OverviewBody profile={customerProfile} conversationId={conversation.id} />
        ) : tab === 'proposals' ? (
          <PropertyTab
            conversationId={conversation.id}
            properties={props.properties}
            suggestedReactions={props.suggestedReactions}
            recommend={props.recommend}
            hasMessages={props.hasMessages ?? false}
            onSearchRecommend={props.onSearchRecommend}
            onStartObikae={props.onStartObikae}
            bukkakuState={props.bukkakuState}
            onBukkakuCancel={props.onBukkakuCancel}
            onBukkakuReset={props.onBukkakuReset}
          />
        ) : tab === 'memos' ? (
          <MemosBody profile={customerProfile} conversationId={conversation.id} />
        ) : (
          <AiBody />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview tab body
// ---------------------------------------------------------------------------

function OverviewBody({
  profile,
  conversationId,
}: {
  profile: CustomerProfile;
  conversationId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="基本情報">
        <DetailLine label="初回接触" value={profile.firstContact} />
        <DetailLine label="流入元" value={profile.source} />
        <DetailLine label="反響物件" value={profile.sourceProperty} />
        <div className="flex items-baseline justify-between py-1">
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500">
            ステージ
          </span>
          <select
            value={profile.stage}
            onChange={(e) =>
              setConversationStage(conversationId, e.target.value as FunnelStage)
            }
            className="text-[12px] bg-sky-50 text-sky-700 rounded-md px-2 py-0.5 font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-sky-200/60 cursor-pointer"
          >
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {profile.requirements.filter((r) => r.captured).length > 0 ? (
        <Card title="把握済の希望条件">
          <ul className="flex flex-col gap-1.5">
            {profile.requirements
              .filter((r) => r.captured)
              .map((r) => (
                <li
                  key={r.label}
                  className="flex items-start gap-2 text-[12.5px] text-slate-700"
                >
                  <span className="msym msym-sm text-emerald-500 mt-0.5" style={{ fontSize: 15 }}>
                    check_circle
                  </span>
                  <span>
                    <span className="font-semibold text-slate-900">{r.label}</span>
                    {r.value ? <span className="text-slate-500">: {r.value}</span> : null}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memos tab body
// ---------------------------------------------------------------------------

function MemosBody({
  profile,
  conversationId,
}: {
  profile: CustomerProfile;
  conversationId: string;
}) {
  const { memo, savedAt } = useCallMemo(conversationId);
  const hasMemo = memo.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card title="電話メモ">
        {hasMemo ? (
          <>
            <pre className="text-[12.5px] text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
              {memo}
            </pre>
            {savedAt ? (
              <div className="mt-2 text-[10.5px] text-slate-500">
                最終保存:{' '}
                {new Date(savedAt).toLocaleString('ja-JP', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-[12px] text-slate-500">
            まだメモがありません。チャット画面の「︙ → 電話メモを追加」から記録できます。
          </div>
        )}
      </Card>

      {profile.behaviorLog.length > 0 ? (
        <Card title="行動履歴">
          <ol className="relative pl-4 flex flex-col gap-2.5">
            <span className="absolute left-[5px] top-1 bottom-1 w-px bg-slate-200" />
            {[...profile.behaviorLog].reverse().map((entry, i) => (
              <li
                key={`${entry.date}::${entry.action}::${i}`}
                className="relative flex flex-col"
              >
                <span className="absolute -left-4 top-[5px] w-[10px] h-[10px] rounded-full border-2 border-slate-300 bg-white" />
                <span className="text-[10.5px] text-slate-500">{entry.date}</span>
                <span className="text-[12.5px] text-slate-800">{entry.action}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI tab body — placeholder for now
// ---------------------------------------------------------------------------

function AiBody() {
  return (
    <Card title="AI アシスタント">
      <div className="text-[12.5px] text-slate-600 leading-relaxed">
        この顧客のコンテキストを踏まえた AI チャットは Phase 2 で実装予定です。
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/70 border border-slate-900/[0.06] backdrop-blur-md px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.06)]">
      <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-slate-500 mb-2">
        {title}
      </div>
      {children}
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-[12.5px]">
      <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-slate-500">
        {label}
      </span>
      <span className="text-slate-800 truncate ml-3 max-w-[60%]">{value}</span>
    </div>
  );
}

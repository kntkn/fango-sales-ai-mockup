'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  LiquidConversation,
  LiquidFunnelStage,
  LiquidStaff,
} from '@/lib/liquid-shape';

type View = 'main' | 'stage' | 'staff' | 'edit' | 'memo';

const FUNNEL_STAGES: LiquidFunnelStage[] = [
  '反響/初回',
  '提案',
  '内見',
  '申込',
  '成約',
];

interface Props {
  conversation: LiquidConversation;
  staffList: LiquidStaff[];
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
  onClose: () => void;
  onAction: (label: string) => void;
}

export function LiquidLineHeaderMenu({
  conversation,
  staffList,
  currentStaffId,
  onChangeStage,
  onChangeStaff,
  onEditCustomer,
  onAddPhoneMemo,
  onClose,
  onAction,
}: Props) {
  const [view, setView] = useState<View>('main');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!(e.target instanceof Node)) return;
      if (!ref.current.contains(e.target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute top-full right-0 mt-1.5 w-[280px] z-40 rounded-2xl bg-white/92 backdrop-blur-xl border border-slate-900/[0.06] shadow-[0_2px_4px_rgba(15,23,42,0.06),0_24px_56px_-12px_rgba(15,23,42,0.28)] overflow-hidden animate-[fadein_180ms_ease-out]"
      style={{ animationFillMode: 'both' }}
    >
      {view === 'main' ? (
        <MainView
          onPickStage={() => setView('stage')}
          onPickStaff={() => setView('staff')}
          onPickEdit={() => setView('edit')}
          onPickMemo={() => setView('memo')}
        />
      ) : view === 'stage' ? (
        <StageView
          current={conversation.funnelStage}
          onPick={(s) => {
            onChangeStage(s);
            onAction(`ステージを「${s}」に変更しました`);
            onClose();
          }}
          onBack={() => setView('main')}
        />
      ) : view === 'staff' ? (
        <StaffView
          staffList={staffList}
          currentStaffId={currentStaffId}
          onPick={(id) => {
            const s = staffList.find((x) => x.id === id);
            onChangeStaff(id);
            onAction(`担当を「${s?.name ?? '—'}」に変更しました`);
            onClose();
          }}
          onBack={() => setView('main')}
        />
      ) : view === 'edit' ? (
        <EditView
          conversation={conversation}
          onSubmit={(patch) => {
            onEditCustomer(patch);
            onAction('顧客情報を更新しました');
            onClose();
          }}
          onBack={() => setView('main')}
        />
      ) : (
        <MemoView
          onSubmit={(content) => {
            onAddPhoneMemo(content);
            onAction('電話メモを追加しました');
            onClose();
          }}
          onBack={() => setView('main')}
        />
      )}
    </div>
  );
}

function MainView({
  onPickStage,
  onPickStaff,
  onPickEdit,
  onPickMemo,
}: {
  onPickStage: () => void;
  onPickStaff: () => void;
  onPickEdit: () => void;
  onPickMemo: () => void;
}) {
  return (
    <div className="py-1.5">
      <MenuRow icon="trending_up" label="ステージ変更" hasSub onClick={onPickStage} />
      <MenuRow icon="badge" label="担当変更" hasSub onClick={onPickStaff} />
      <MenuRow icon="edit" label="顧客情報を編集" hasSub onClick={onPickEdit} />
      <MenuRow icon="phone_in_talk" label="電話メモを追加" hasSub onClick={onPickMemo} />
    </div>
  );
}

function StageView({
  current,
  onPick,
  onBack,
}: {
  current: LiquidFunnelStage;
  onPick: (s: LiquidFunnelStage) => void;
  onBack: () => void;
}) {
  return (
    <div className="py-1.5">
      <SubHeader label="ステージ変更" onBack={onBack} />
      {FUNNEL_STAGES.map((s) => {
        const isCurrent = s === current;
        return (
          <button
            key={s}
            type="button"
            role="menuitemradio"
            aria-checked={isCurrent}
            onClick={() => onPick(s)}
            className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-[12.5px] hover:bg-slate-900/[0.04] transition-colors"
          >
            <span
              className={[
                'w-1.5 h-1.5 rounded-full shrink-0',
                isCurrent ? 'bg-sky-500' : 'bg-slate-300',
              ].join(' ')}
            />
            <span className={isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-700'}>
              {s}
            </span>
            {isCurrent ? (
              <span className="ml-auto msym msym-sm text-sky-500" style={{ fontSize: 16 }}>
                check
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function StaffView({
  staffList,
  currentStaffId,
  onPick,
  onBack,
}: {
  staffList: LiquidStaff[];
  currentStaffId: string | null;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="py-1.5">
      <SubHeader label="担当変更" onBack={onBack} />
      <div className="max-h-[280px] overflow-y-auto">
        {staffList.map((s) => {
          const isCurrent = s.id === currentStaffId;
          return (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={isCurrent}
              onClick={() => onPick(s.id)}
              className="w-full px-3 py-2 flex items-center gap-2.5 text-left hover:bg-slate-900/[0.04] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-semibold text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${s.avatarTone} 0%, #94a3b8 100%)`,
                }}
              >
                {s.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    'text-[12.5px] truncate',
                    isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-700',
                  ].join(' ')}
                >
                  {s.name}
                </div>
                {(s.company || s.role) && (
                  <div className="text-[10.5px] text-slate-500 truncate">
                    {[s.company, s.role].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {isCurrent ? (
                <span className="msym msym-sm text-sky-500 shrink-0" style={{ fontSize: 16 }}>
                  check
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EditView({
  conversation,
  onSubmit,
  onBack,
}: {
  conversation: LiquidConversation;
  onSubmit: (patch: {
    name?: string;
    honorific?: string;
    source?: LiquidConversation['source'];
    tags?: string[];
  }) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(conversation.customer.name);
  const [honorific, setHonorific] = useState(conversation.customer.honorific);
  const [source, setSource] = useState<LiquidConversation['source']>(conversation.source);
  const [tagsText, setTagsText] = useState(conversation.tags.join(', '));

  return (
    <div className="py-1.5">
      <SubHeader label="顧客情報を編集" onBack={onBack} />
      <div className="px-3 py-2 flex flex-col gap-2">
        <Field label="氏名">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-[12.5px] px-2 py-1.5 rounded-md bg-white border border-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
          />
        </Field>
        <Field label="敬称">
          <select
            value={honorific}
            onChange={(e) => setHonorific(e.target.value)}
            className="w-full text-[12.5px] px-2 py-1.5 rounded-md bg-white border border-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
          >
            <option value="様">様</option>
            <option value="さん">さん</option>
            <option value="">(なし)</option>
          </select>
        </Field>
        <Field label="反響元">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as LiquidConversation['source'])}
            className="w-full text-[12.5px] px-2 py-1.5 rounded-md bg-white border border-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
          >
            <option value="suumo">SUUMO</option>
            <option value="jds">JDS</option>
            <option value="referral">紹介</option>
          </select>
        </Field>
        <Field label="タグ (カンマ区切り)">
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="1LDK, 清澄白河, 〜16万"
            className="w-full text-[12.5px] px-2 py-1.5 rounded-md bg-white border border-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors"
          />
        </Field>
        <div className="flex justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() =>
              onSubmit({
                name: name.trim() || conversation.customer.name,
                honorific,
                source,
                tags: tagsText
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function MemoView({
  onSubmit,
  onBack,
}: {
  onSubmit: (content: string) => void;
  onBack: () => void;
}) {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    taRef.current?.focus();
  }, []);
  const canSave = text.trim().length > 0;

  return (
    <div className="py-1.5">
      <SubHeader label="電話メモを追加" onBack={onBack} />
      <div className="px-3 py-2 flex flex-col gap-2">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="顧客との通話内容、ヒアリング結果、希望条件など"
          className="w-full text-[12.5px] px-2.5 py-2 rounded-md bg-white border border-slate-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/60 transition-colors resize-none leading-relaxed"
        />
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onBack}
            className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => canSave && onSubmit(text)}
            disabled={!canSave}
            className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white transition-colors disabled:opacity-40 disabled:hover:bg-sky-500"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon,
  label,
  hasSub,
  onClick,
}: {
  icon: string;
  label: string;
  hasSub?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full px-3 py-2 flex items-center gap-2.5 text-left text-[12.5px] text-slate-800 hover:bg-slate-900/[0.04] transition-colors"
    >
      <span className="msym msym-sm text-slate-500" style={{ fontSize: 17 }}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hasSub ? (
        <span className="msym msym-sm text-slate-400" style={{ fontSize: 16 }}>
          chevron_right
        </span>
      ) : null}
    </button>
  );
}

function SubHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="px-2 pt-1 pb-1.5 flex items-center gap-1 border-b border-slate-900/[0.05]">
      <button
        type="button"
        onClick={onBack}
        aria-label="戻る"
        className="w-7 h-7 rounded-md grid place-items-center text-slate-500 hover:text-slate-900 hover:bg-slate-900/[0.04] transition-colors"
      >
        <span className="msym msym-sm" style={{ fontSize: 17 }}>
          chevron_left
        </span>
      </button>
      <span className="text-[12px] font-semibold text-slate-800">{label}</span>
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

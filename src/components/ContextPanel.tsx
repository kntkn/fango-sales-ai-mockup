'use client';

import { useState, useEffect } from 'react';
import type {
  Conversation,
  CustomerProfile,
  Property,
  PersonalityAnalysis,
  SuggestedReaction,
  ScoreTier,
  RecommendState,
} from '@/lib/types';
import { STAGE_CONFIG } from '@/lib/types';
import { useBukkaku } from '@/lib/use-bukkaku';
import { useCallMemo } from '@/lib/use-call-memo';
import BukkakuPipeline from './BukkakuPipeline';

type Tab = 'customer' | 'property';

interface EditableCustomer {
  id: string;
  email: string;
  phone: string;
}

interface ContextPanelProps {
  conversation: Conversation;
  customerProfile: CustomerProfile;
  properties: Property[];
  personality?: PersonalityAnalysis;
  suggestedReactions?: SuggestedReaction[];
  onClose?: () => void;
  editableCustomer?: EditableCustomer;
  onSaveContact?: (id: string, patch: { email?: string; phone?: string }) => Promise<void>;
  recommend?: RecommendState;
  hasMessages?: boolean;
  onSearchRecommend?: () => void;
  /**
   * Called when the user clicks 「空室を帯替え」 in the bukkaku result card.
   * The parent is expected to open the obikae overlay.
   */
  onStartObikae?: (vacancies: import('@/lib/types-bukkaku').BukkakuResult[]) => void;
}

// ---------------------------------------------------------------------------
// Stars
// ---------------------------------------------------------------------------

function Stars({ count }: { count: number }) {
  return (
    <span className="text-xs tracking-tight">
      {Array.from({ length: 5 }, (_, i) => (i < count ? '★' : '☆')).join('')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail Row
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-text-secondary text-xs shrink-0">{label}</span>
      <span className="text-text-primary text-xs text-right">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Personality Section
// ---------------------------------------------------------------------------

const SENSITIVITY_STYLE: Record<string, string> = {
  high: 'bg-urgent/10 text-urgent',
  mid: 'bg-score-mid/10 text-score-mid',
  low: 'bg-border-light text-text-tertiary',
};

function PersonalitySection({ personality }: { personality: PersonalityAnalysis }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
        <span>🧠</span>
        <span>パーソナリティ</span>
      </div>

      {/* Compact card */}
      <div className="bg-ai-surface rounded-lg p-2.5 space-y-2">
        {/* Type badge */}
        <div className="text-xs font-bold text-text-primary">{personality.estimatedType}</div>

        {/* Sensitivities as inline chips */}
        <div className="flex flex-wrap gap-1">
          {personality.sensitivities.map((s) => (
            <span
              key={s.label}
              className={`text-xs px-1.5 py-px rounded-full font-bold ${SENSITIVITY_STYLE[s.level]}`}
            >
              {s.label}
            </span>
          ))}
        </div>

        {/* Key-value grid */}
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          <span className="text-text-tertiary">対応</span>
          <span className="text-text-primary">{personality.communicationStyle.split('。')[0]}</span>
          <span className="text-text-tertiary">リズム</span>
          <span className="text-text-primary">{personality.lifeRhythm.description.split('。')[0]}</span>
          <span className="text-text-tertiary">判断</span>
          <span className="text-text-primary">{personality.decisionPattern.split('。')[0]}</span>
        </div>

        {/* Timing recommendation */}
        <div className="text-xs text-accent font-bold">{personality.lifeRhythm.recommendation}</div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Customer Tab
// ---------------------------------------------------------------------------

function ContactEditor({
  customer,
  onSave,
}: {
  customer: EditableCustomer;
  onSave: (id: string, patch: { email?: string; phone?: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(customer.email);
  const [phone, setPhone] = useState(customer.phone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setEmail(customer.email);
      setPhone(customer.phone);
    }
  }, [customer.id, customer.email, customer.phone, editing]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(customer.id, { email, phone });
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEmail(customer.email);
    setPhone(customer.phone);
    setEditing(false);
    setError(null);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span>✉️</span>
          <span>連絡先 (Notion同期)</span>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-accent hover:text-accent-light transition-colors"
          >
            編集
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 bg-ai-surface rounded-lg p-2.5">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-border rounded px-2 py-1 text-xs text-text-primary bg-white outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-text-secondary">電話番号</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border border-border rounded px-2 py-1 text-xs text-text-primary bg-white outline-none focus:ring-1 focus:ring-accent"
            />
          </label>
          {error && <p className="text-xs text-urgent">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-accent text-white text-xs font-bold rounded px-3 py-1.5 hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中…' : 'Notionに保存'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-xs">
          <DetailRow label="Email" value={customer.email || '-'} />
          <DetailRow label="電話番号" value={customer.phone || '-'} />
        </div>
      )}
    </section>
  );
}

function CallMemoSection({ conversationId }: { conversationId: string }) {
  const { memo, savedAt } = useCallMemo(conversationId);
  const hasMemo = memo.trim().length > 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span>📞</span>
          <span>電話メモ</span>
        </div>
        {savedAt && (
          <span className="text-[10px] text-text-tertiary">
            {new Date(savedAt).toLocaleString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
      {hasMemo ? (
        <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed bg-ai-surface rounded-lg p-2.5">
          {memo}
        </p>
      ) : (
        <p className="text-xs text-text-tertiary italic bg-surface rounded-lg p-2.5">
          まだメモがありません。チャット画面の 📞 から入力できます。
        </p>
      )}
    </section>
  );
}

function CustomerTab({
  conversationId,
  profile,
  personality,
  editableCustomer,
  onSaveContact,
}: {
  conversationId: string;
  profile: CustomerProfile;
  personality?: PersonalityAnalysis;
  editableCustomer?: EditableCustomer;
  onSaveContact?: (id: string, patch: { email?: string; phone?: string }) => Promise<void>;
}) {
  const stageCfg = STAGE_CONFIG[profile.stage];
  const initial = profile.name.charAt(0);
  const capturedReqs = profile.requirements.filter((r) => r.captured);
  const uncapturedReqs = profile.requirements.filter((r) => !r.captured);

  return (
    <div className="flex flex-col gap-5">
      {/* Profile header */}
      <section className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-lg font-bold shrink-0">
          {initial}
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary leading-tight">{profile.name}</p>
          <p className="text-xs text-text-tertiary">{profile.lineId}</p>
        </div>
      </section>

      {/* Profile details */}
      <section className="flex flex-col gap-2 text-sm">
        <DetailRow label="初回接触" value={profile.firstContact} />
        <DetailRow
          label="流入元"
          value={
            <span className="inline-block text-xs bg-surface rounded px-1.5 py-0.5 font-bold text-text-primary">
              {profile.source}
            </span>
          }
        />
        <DetailRow label="反響物件" value={profile.sourceProperty} />
        <DetailRow
          label="ステージ"
          value={
            <span className="inline-block text-xs bg-accent/10 text-accent rounded px-1.5 py-0.5 font-bold">
              {stageCfg.label}
            </span>
          }
        />
      </section>

      {/* Contact editor (Notion sync) */}
      {editableCustomer && onSaveContact && (
        <ContactEditor customer={editableCustomer} onSave={onSaveContact} />
      )}

      {/* Call memo (read-only mirror of the phone popover in ChatThread) */}
      <CallMemoSection conversationId={conversationId} />

      {/* Personality analysis */}
      {personality && <PersonalitySection personality={personality} />}

      {/* Requirements checklist */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <span>🎯</span>
          <span>希望条件</span>
        </div>
        <ul className="flex flex-col gap-1">
          {capturedReqs.map((req) => (
            <li key={req.label} className="flex items-start gap-2 text-sm">
              <span className="text-score-high shrink-0">✅</span>
              <span>
                <span className="font-bold">{req.label}</span>
                <span className="text-text-secondary">: {req.value}</span>
              </span>
            </li>
          ))}
          {uncapturedReqs.map((req) => (
            <li key={req.label} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="shrink-0">☐</span>
              <span>{req.label}</span>
              <span className="text-xs text-text-tertiary ml-auto">未確認</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Behavior timeline */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <span>📊</span>
          <span>行動履歴</span>
        </div>
        <div className="relative pl-4">
          <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
          <ul className="flex flex-col gap-2">
            {[...profile.behaviorLog].reverse().map((entry, i) => (
              <li key={i} className="relative flex flex-col">
                <div className="absolute -left-4 top-[5px] w-[10px] h-[10px] rounded-full border-2 border-border bg-white" />
                <span className="text-xs text-text-tertiary">{entry.date}</span>
                <span className="text-xs text-text-primary">{entry.action}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Property Tab
// ---------------------------------------------------------------------------

function PropertyCard({ property }: { property: Property }) {
  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex gap-3">
        <div className="w-[60px] h-[60px] rounded-lg bg-surface flex items-center justify-center text-2xl shrink-0">🏠</div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-bold text-text-primary truncate">{property.name}</p>
          <p className="text-xs text-text-secondary">{property.type} / {property.rent} / 徒歩{property.walkMinutes}分</p>
          <p className="text-xs text-text-secondary">{property.station}駅</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-text-secondary">マッチ:</span>
            <Stars count={property.matchScore} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button type="button" className="text-xs text-accent hover:text-accent-light transition-colors">メッセージに挿入</button>
        <span className="text-border">|</span>
        <button type="button" className="text-xs text-accent hover:text-accent-light transition-colors" onClick={() => console.log('Bukaku:', property.name)}>物確する</button>
      </div>
    </div>
  );
}

function PropertyRecommendation({
  conversationId,
  recommend,
  hasMessages,
  onSearch,
  onStartObikae,
}: {
  conversationId: string;
  recommend?: RecommendState;
  hasMessages: boolean;
  onSearch?: () => void;
  onStartObikae?: (vacancies: import('@/lib/types-bukkaku').BukkakuResult[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bukkaku = useBukkaku();
  const { memo } = useCallMemo(conversationId);
  const hasMemo = memo.trim().length > 0;
  const status = recommend?.status ?? 'idle';

  const toggleSelect = (reinsId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reinsId)) next.delete(reinsId);
      else next.add(reinsId);
      return next;
    });
  };

  const toggleAll = (targets: { reinsId: string }[]) => {
    setSelectedIds((prev) => {
      const allSelected = targets.every((r) => prev.has(r.reinsId));
      const next = new Set(prev);
      if (allSelected) {
        for (const r of targets) next.delete(r.reinsId);
      } else {
        for (const r of targets) next.add(r.reinsId);
      }
      return next;
    });
  };

  if (status === 'idle' || !recommend) {
    return (
      <section className="bg-ai-surface border border-ai-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5 text-sm font-bold text-text-primary">
          <span>💡</span>
          <span>物件提案 (AI)</span>
        </div>
        <p className="text-xs text-text-secondary mb-2.5">
          電話メモとチャットログを解析して、条件にマッチする物件を Fango Recommend から検索します。
        </p>
        <button
          type="button"
          onClick={onSearch}
          disabled={(!hasMessages && !hasMemo) || !onSearch}
          className="w-full bg-accent hover:bg-accent-hover text-white font-bold text-sm rounded-lg py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          🔍 物件提案を生成
        </button>
        <p className="text-xs text-text-tertiary text-center mt-1.5">
          {hasMemo ? '📞 電話メモを含めて検索' : '電話メモなし（📞 から追加できます）'}
          {!hasMessages && !hasMemo && ' / チャットメッセージなし'}
        </p>
      </section>
    );
  }

  if (status === 'searching') {
    return (
      <section className="bg-ai-surface border border-ai-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <span>💡</span>
          <span>物件提案 (AI)</span>
        </div>
        <div className="flex flex-col items-center py-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-primary mt-2">物件を検索中…</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            会話内容からマッチする物件を探しています
          </p>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="bg-ai-surface border border-ai-border rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <span>💡</span>
          <span>物件提案 (AI)</span>
        </div>
        <p className="text-xs text-urgent mb-2">{recommend.error || 'エラーが発生しました'}</p>
        <button
          type="button"
          onClick={onSearch}
          className="w-full bg-white border border-border text-text-secondary hover:bg-surface font-bold text-xs rounded-lg py-1.5 transition-colors"
        >
          ↻ 再検索
        </button>
      </section>
    );
  }

  const results = recommend.results;
  const displayResults = showAll ? results : results.slice(0, 10);
  const allDisplayedSelected =
    displayResults.length > 0 && displayResults.every((r) => selectedIds.has(r.reinsId));

  return (
    <section className="bg-ai-surface border border-ai-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <span>💡</span>
          <span>物件提案 (AI)</span>
        </div>
        <span className="text-xs text-accent font-bold">{results.length}件</span>
      </div>

      {/* 物確に回すボタン (選択物件があるとき & idle 状態のとき) */}
      {selectedIds.size > 0 && bukkaku.state.status === 'idle' && (
        <button
          type="button"
          onClick={() => bukkaku.start(Array.from(selectedIds))}
          className="mb-2 w-full bg-score-mid hover:brightness-95 text-white font-bold text-sm rounded-lg py-2 transition-all"
        >
          🏢 物確に回す ({selectedIds.size}件)
        </button>
      )}

      {/* 物確パイプライン (走行中 or 結果表示) */}
      {bukkaku.state.status !== 'idle' && (
        <BukkakuPipeline
          state={bukkaku.state}
          onCancel={bukkaku.cancel}
          onReset={bukkaku.reset}
          onStartObikae={onStartObikae}
        />
      )}

      {/* 全選択トグル */}
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleAll(displayResults)}
          className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          {allDisplayedSelected ? '選択解除' : '全選択'}
        </button>
        {selectedIds.size > 0 && (
          <span className="text-xs text-score-mid font-bold">
            {selectedIds.size}件選択中
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {displayResults.map((r, i) => {
          const primary = [
            r.address,
            r.floorPlan,
            r.rent ? `${r.rent}万` : null,
          ]
            .filter(Boolean)
            .join(' / ');
          const secondary = [
            r.walkMinutes ? `徒歩${r.walkMinutes}分` : null,
            r.areaSqm ? `${r.areaSqm}㎡` : null,
            r.builtYear ? `築${r.builtYear}年` : null,
            r.propertyType,
          ]
            .filter(Boolean)
            .join(' / ');
          const checked = selectedIds.has(r.reinsId);
          return (
            <label
              key={r.reinsId}
              className={`flex items-start gap-2 rounded-md px-2 py-1.5 border cursor-pointer transition-colors ${
                checked
                  ? 'bg-score-mid/10 border-score-mid/40'
                  : 'bg-white border-ai-border/50 hover:bg-ai-surface'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSelect(r.reinsId)}
                className="mt-1 shrink-0 accent-score-mid"
              />
              <span className="flex w-5 h-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary truncate">
                  {primary || r.reinsId}
                </p>
                {secondary && (
                  <p className="text-xs text-text-secondary truncate">{secondary}</p>
                )}
                <p className="text-xs text-text-tertiary">
                  REINS: {r.reinsId} / スコア: {r.predictedViews.toFixed(1)}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {results.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full text-xs text-accent hover:underline"
        >
          {showAll ? '上位10件のみ表示' : `残り${results.length - 10}件を表示`}
        </button>
      )}

      <button
        type="button"
        onClick={onSearch}
        className="mt-2 w-full bg-white border border-border text-text-secondary hover:bg-surface font-bold text-xs rounded-lg py-1.5 transition-colors"
      >
        ↻ 会話を更新して再検索
      </button>
    </section>
  );
}

function PropertyTab({
  conversationId,
  properties,
  sourceProperty,
  suggestedReactions,
  recommend,
  hasMessages,
  onSearchRecommend,
  onStartObikae,
}: {
  conversationId: string;
  properties: Property[];
  sourceProperty: string;
  suggestedReactions?: SuggestedReaction[];
  recommend?: RecommendState;
  hasMessages: boolean;
  onSearchRecommend?: () => void;
  onStartObikae?: (vacancies: import('@/lib/types-bukkaku').BukkakuResult[]) => void;
}) {
  const candidateProperties = properties.filter((p) => !p.suggested);
  const suggestedProperties = properties.filter((p) => p.suggested);

  return (
    <div className="flex flex-col gap-5">
      {/* AI Property Recommendation (chat log → Fango Recommend) */}
      <PropertyRecommendation
        conversationId={conversationId}
        recommend={recommend}
        hasMessages={hasMessages}
        onSearch={onSearchRecommend}
        onStartObikae={onStartObikae}
      />

      {/* Bukaku button (standalone) — appears only after AI recommendations complete */}
      {recommend?.status === 'complete' && (
        <div className="bg-surface rounded-lg p-3 border border-border">
          <BukakuButton />
        </div>
      )}

      {/* Candidate property cards */}
      <section>
        <div className="flex items-center gap-2 mb-3 text-sm font-bold text-text-primary">
          <span>🏠</span>
          <span>提案候補物件</span>
        </div>
        <div className="flex flex-col gap-3">
          {(candidateProperties.length > 0 ? candidateProperties : properties).map((prop) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      </section>

      {/* Past suggestions */}
      <section>
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <span>📌</span>
          <span>過去提案済み物件</span>
        </div>
        <ul className="flex flex-col gap-1">
          {suggestedProperties.length > 0 ? (
            suggestedProperties.map((p) => (
              <li key={p.id} className="text-xs text-text-secondary">・{p.name}</li>
            ))
          ) : (
            <li className="text-xs text-text-secondary">・{sourceProperty}（反響元）</li>
          )}
        </ul>
      </section>

      {/* Suggested reactions */}
      {suggestedReactions && suggestedReactions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
            <span>📊</span>
            <span>提案への反応</span>
          </div>
          <div className="flex flex-col gap-1">
            {suggestedReactions.map((r) => {
              const reactionText =
                r.reaction === 'interested' ? '興味あり' :
                r.reaction === 'rejected' ? '見送り' : '検討中';
              const reactionColor =
                r.reaction === 'interested' ? 'text-accent' :
                r.reaction === 'rejected' ? 'text-urgent' : 'text-text-tertiary';
              return (
                <div key={r.propertyName} className="flex items-center justify-between text-xs py-1.5 border-b border-border-light last:border-0">
                  <div className="flex flex-col">
                    <span className="text-text-primary font-bold">{r.propertyName}</span>
                    {r.comment && <span className="text-text-tertiary text-xs">{r.comment}</span>}
                  </div>
                  <span className={`font-bold ${reactionColor}`}>{reactionText}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function BukakuButton() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="w-full bg-white border border-accent text-accent hover:bg-ai-surface font-bold text-sm rounded-lg py-2 transition-colors"
        onClick={() => setShowForm(!showForm)}
      >
        空室確認(物確)
      </button>
      {showForm && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            placeholder="物件名 or URL を入力"
            className="flex-1 min-w-0 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:ring-1 focus:ring-accent bg-white"
          />
          <button
            type="button"
            className="shrink-0 bg-accent text-white text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-accent-hover transition-colors"
            onClick={() => console.log('Bukaku check started')}
          >
            確認
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContextPanel (default export)
// ---------------------------------------------------------------------------

export default function ContextPanel({
  conversation,
  customerProfile,
  properties,
  personality,
  suggestedReactions,
  onClose,
  editableCustomer,
  onSaveContact,
  recommend,
  hasMessages = false,
  onSearchRecommend,
  onStartObikae,
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('property');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'property', label: '物件' },
    { key: 'customer', label: '顧客' },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {/* Close button (mobile + tablet) */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="xl:hidden w-10 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface transition-colors shrink-0 border-r border-border"
            aria-label="閉じる"
          >
            ✕
          </button>
        )}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-sm text-center transition-colors ${
              activeTab === tab.key
                ? 'font-bold text-text-primary border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'customer' && (
          <div key="customer" className="tab-fade-enter">
            <CustomerTab
              conversationId={conversation.id}
              profile={customerProfile}
              personality={personality}
              editableCustomer={editableCustomer}
              onSaveContact={onSaveContact}
            />
          </div>
        )}
        {activeTab === 'property' && (
          <div key="property" className="tab-fade-enter">
            <PropertyTab
              conversationId={conversation.id}
              properties={properties}
              sourceProperty={customerProfile.sourceProperty}
              suggestedReactions={suggestedReactions}
              recommend={recommend}
              hasMessages={hasMessages}
              onSearchRecommend={onSearchRecommend}
              onStartObikae={onStartObikae}
            />
          </div>
        )}
      </div>
    </div>
  );
}

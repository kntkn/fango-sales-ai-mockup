'use client';

import { useState } from 'react';
import type {
  Conversation,
  CustomerProfile,
  Property,
  PersonalityAnalysis,
  SuggestedReaction,
  ScoreTier,
} from '@/lib/types';
import { SCORE_CONFIG, STAGE_CONFIG } from '@/lib/types';

type Tab = 'customer' | 'property';

interface ContextPanelProps {
  conversation: Conversation;
  customerProfile: CustomerProfile;
  properties: Property[];
  personality?: PersonalityAnalysis;
  suggestedReactions?: SuggestedReaction[];
  onClose?: () => void;
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

function CustomerTab({
  profile,
  personality,
}: {
  profile: CustomerProfile;
  personality?: PersonalityAnalysis;
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

function PropertyTab({
  properties,
  sourceProperty,
  suggestedReactions,
}: {
  properties: Property[];
  sourceProperty: string;
  suggestedReactions?: SuggestedReaction[];
}) {
  const candidateProperties = properties.filter((p) => !p.suggested);
  const suggestedProperties = properties.filter((p) => p.suggested);

  return (
    <div className="flex flex-col gap-5">
      {/* Bukaku button (standalone) */}
      <div className="bg-surface rounded-lg p-3 border border-border">
        <BukakuButton />
      </div>

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
}: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('customer');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'customer', label: '顧客' },
    { key: 'property', label: '物件' },
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
            <CustomerTab profile={customerProfile} personality={personality} />
          </div>
        )}
        {activeTab === 'property' && (
          <div key="property" className="tab-fade-enter">
            <PropertyTab
              properties={properties}
              sourceProperty={customerProfile.sourceProperty}
              suggestedReactions={suggestedReactions}
            />
          </div>
        )}
      </div>
    </div>
  );
}

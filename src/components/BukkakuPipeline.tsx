"use client";

import type {
  BukkakuState,
  BukkakuProperty,
  BukkakuResult,
} from "@/lib/types-bukkaku";

export default function BukkakuPipeline({
  state,
  onCancel,
  onReset,
  onStartObikae,
}: {
  state: BukkakuState;
  onCancel: () => void;
  onReset: () => void;
  /** Triggered when user clicks "空室のみ帯替え" in the complete state. */
  onStartObikae?: (vacancies: BukkakuResult[]) => void;
}) {
  const { status, progress } = state;

  if (status === "connecting") {
    return (
      <PipelineCard>
        <div className="flex flex-col items-center py-3">
          <div className="w-6 h-6 border-2 border-score-mid border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-xs text-text-secondary">物確サーバーに接続中…</p>
        </div>
      </PipelineCard>
    );
  }

  if (status === "reins_fetching") {
    const { current, total } = progress.reins;
    const pct = total > 0 ? (current / total) * 100 : 0;
    const failedCount = progress.failedReinsIds.length;

    return (
      <PipelineCard>
        <PipelineHeader title="REINS取得中" />
        <ProgressBar pct={pct} label={`${current} / ${total}`} />

        {failedCount > 0 && (
          <p className="mt-1 text-xs text-urgent">
            {failedCount}件の取得に失敗
          </p>
        )}

        {progress.properties.length > 0 && (
          <div className="mt-2 max-h-[200px] space-y-1.5 overflow-y-auto">
            {progress.properties.map((p) => (
              <PropertyCard key={p.reins_id} property={p} />
            ))}
          </div>
        )}

        <CancelButton onClick={onCancel} />
      </PipelineCard>
    );
  }

  if (status === "bukaku_running") {
    const { completed, total, found, remainingSeconds } = progress.bukaku;
    const pct = total > 0 ? (completed / total) * 100 : 0;

    return (
      <PipelineCard>
        <PipelineHeader title="物確検索中" />
        <ProgressBar pct={pct} label={`${completed} / ${total}`} />

        <div className="mt-1 flex items-center justify-between text-xs text-text-tertiary">
          <span>
            空室発見: <span className="font-bold text-accent">{found}</span>
          </span>
          {remainingSeconds > 0 && <span>残り約{remainingSeconds}秒</span>}
        </div>

        {progress.results.length > 0 && (
          <div className="mt-2 max-h-[250px] space-y-1.5 overflow-y-auto">
            {progress.results.map((r, i) => (
              <ResultCard key={i} result={r} />
            ))}
          </div>
        )}

        <CancelButton onClick={onCancel} />
      </PipelineCard>
    );
  }

  if (status === "complete") {
    const total = progress.results.length;
    const vacancyResults = progress.results.filter((r) => r.found);
    const found = progress.bukaku.found || vacancyResults.length;

    return (
      <PipelineCard>
        <PipelineHeader title="物確結果" />

        <div className="mb-2 flex items-center gap-1.5 text-xs">
          <span className="text-accent">✅</span>
          <span className="text-text-secondary">
            {total}件中{" "}
            <span className="font-bold text-accent">{found}件</span>{" "}
            空室あり
          </span>
        </div>

        <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
          {progress.results.map((r, i) => (
            <ResultCard key={i} result={r} />
          ))}
        </div>

        {onStartObikae && vacancyResults.length > 0 && (
          <button
            type="button"
            onClick={() => onStartObikae(vacancyResults)}
            className="mt-2 w-full rounded-md bg-accent py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
          >
            🎨 空室 {vacancyResults.length} 件を帯替えして提案リンクを作る
          </button>
        )}

        <ResetButton onClick={onReset} />
      </PipelineCard>
    );
  }

  if (status === "error") {
    return (
      <PipelineCard>
        <PipelineHeader title="物確エラー" />
        <p className="mb-2 text-xs text-urgent">
          {progress.error || "エラーが発生しました"}
        </p>

        {progress.results.length > 0 && (
          <div className="mb-2 max-h-[200px] space-y-1.5 overflow-y-auto">
            {progress.results.map((r, i) => (
              <ResultCard key={i} result={r} />
            ))}
          </div>
        )}

        <ResetButton onClick={onReset} />
      </PipelineCard>
    );
  }

  if (status === "cancelled") {
    return (
      <PipelineCard>
        <PipelineHeader title="物確" />
        <p className="mb-2 text-xs text-text-secondary">キャンセルしました</p>
        <ResetButton onClick={onReset} />
      </PipelineCard>
    );
  }

  return null;
}

function PipelineCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-score-mid/40 bg-white p-3">
      {children}
    </div>
  );
}

function PipelineHeader({ title }: { title: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-text-primary">
      <span>🏢</span>
      <span>{title}</span>
    </div>
  );
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-tertiary">{label}</span>
        <span className="text-xs text-text-tertiary">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border-light">
        <div
          className="h-1.5 rounded-full bg-score-mid transition-all duration-300"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: BukkakuProperty }) {
  return (
    <div className="rounded-md bg-surface px-2.5 py-2">
      <p className="text-xs font-bold text-text-primary">
        {property.property_name} {property.room_number}
      </p>
      <p className="mt-0.5 text-xs text-text-tertiary truncate">
        📍 {property.address}
      </p>
      {property.management_company && (
        <p className="mt-0.5 text-xs text-text-tertiary">
          管理: {property.management_company}
        </p>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: BukkakuResult }) {
  const name = result.property?.property_name || result.property?.reins_id || "不明";
  const room = result.property?.room_number || "";

  if (result.found) {
    return (
      <div className="rounded-md border border-accent/30 bg-ai-surface px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-accent">✅</span>
          <p className="text-xs font-bold text-text-primary">
            {name} {room}
          </p>
        </div>
        {result.platformId && (
          <p className="mt-0.5 ml-5 text-xs text-accent font-bold">
            空室発見: {result.platformId}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-surface px-2.5 py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-text-tertiary">✕</span>
        <p className="text-xs text-text-secondary">
          {name} {room}
        </p>
      </div>
      <p className="mt-0.5 ml-5 text-xs text-text-tertiary">空室情報なし</p>
    </div>
  );
}

function CancelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-md bg-surface py-1.5 text-xs text-text-secondary transition-colors hover:bg-border-light"
    >
      ⏹ キャンセル
    </button>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 w-full rounded-md bg-surface py-1.5 text-xs text-text-secondary transition-colors hover:bg-border-light"
    >
      ↻ リセット
    </button>
  );
}

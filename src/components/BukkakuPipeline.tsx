"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  BukkakuState,
  BukkakuProperty,
  BukkakuResult,
  BukkakuMatch,
} from "@/lib/types-bukkaku";
import {
  ApartmentIcon,
  LocationIcon,
  DescriptionIcon,
  CheckCircleIcon,
  BlockIcon,
  CloseIcon,
} from "./Icons";

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
  const [maisokuOpen, setMaisokuOpen] = useState<{
    reinsId: string;
    title: string;
    anchor: { top: number; right: number; width: number; height: number };
  } | null>(null);
  const openMaisoku = (
    reinsId: string,
    title: string,
    anchor: { top: number; right: number; width: number; height: number },
  ) => setMaisokuOpen({ reinsId, title, anchor });
  const closeMaisoku = () => setMaisokuOpen(null);

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
        <PipelineHeader title="物確&AD検索中" />
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
              <ResultCardCompact
                key={r.property?.reins_id ?? `r-${i}`}
                result={r}
              />
            ))}
          </div>
        )}

        <CancelButton onClick={onCancel} />
      </PipelineCard>
    );
  }

  if (status === "complete") {
    const all = progress.results;
    const withAd = all.filter((r) => r.found && resultHasAd(r));
    const foundNoAd = all.filter((r) => r.found && !resultHasAd(r));
    const manual = all.filter((r) => !r.found);

    return (
      <PipelineCard>
        <PipelineHeader title="物確&AD検索 結果" />

        <div className="mb-2 text-xs text-text-secondary">
          計 {all.length} 件 —{" "}
          <span className="text-accent font-bold">空室&AD {withAd.length}</span>
          {foundNoAd.length > 0 && (
            <> / 空室あり(ADなし) {foundNoAd.length}</>
          )}
          {manual.length > 0 && (
            <>
              {" / "}
              <span className="text-urgent font-bold">
                要手動確認 {manual.length}
              </span>
            </>
          )}
        </div>

        {withAd.length > 0 && (
          <ResultGroup
            tone="ok"
            title="空室&ADあり"
            count={withAd.length}
            results={withAd}
            onOpenMaisoku={openMaisoku}
          />
        )}

        {foundNoAd.length > 0 && (
          <ResultGroup
            tone="neutral"
            title="○ 空室あり (ADなし)"
            count={foundNoAd.length}
            results={foundNoAd}
            onOpenMaisoku={openMaisoku}
          />
        )}

        {manual.length > 0 && (
          <ResultGroup
            tone="warn"
            title="⚠️ 要手動確認"
            count={manual.length}
            results={manual}
            subtitle="自動検索でヒットしませんでした。管理会社に電話で確認してください。"
            onOpenMaisoku={openMaisoku}
          />
        )}

        {onStartObikae && withAd.length > 0 && (
          <button
            type="button"
            onClick={() => onStartObikae(withAd)}
            className="mt-3 w-full rounded-md bg-accent py-2 text-xs font-bold text-white transition-colors hover:bg-accent-hover"
          >
            空室&ADあり {withAd.length} 件を帯替えして提案リンクを作る
          </button>
        )}

        <ResetButton onClick={onReset} />

        {maisokuOpen && (
          <MaisokuPopover
            reinsId={maisokuOpen.reinsId}
            title={maisokuOpen.title}
            anchor={maisokuOpen.anchor}
            onClose={closeMaisoku}
          />
        )}
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
              <ResultCardCompact key={i} result={r} />
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
      <ApartmentIcon className="h-3.5 w-3.5" />
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
      <p className="mt-0.5 inline-flex items-center gap-1 max-w-full text-xs text-text-tertiary">
        <LocationIcon className="h-3 w-3 shrink-0" />
        <span className="truncate">{property.address}</span>
      </p>
      {property.management_company && (
        <p className="mt-0.5 text-xs text-text-tertiary">
          管理: {property.management_company}
        </p>
      )}
    </div>
  );
}

type MaisokuAnchor = {
  top: number;
  right: number;
  width: number;
  height: number;
};
type OpenMaisoku = (
  reinsId: string,
  title: string,
  anchor: MaisokuAnchor,
) => void;

function ResultGroup({
  tone,
  title,
  count,
  results,
  subtitle,
  onOpenMaisoku,
}: {
  tone: "ok" | "neutral" | "warn";
  title: string;
  count: number;
  results: BukkakuResult[];
  subtitle?: string;
  onOpenMaisoku: OpenMaisoku;
}) {
  const badgeCls =
    tone === "ok"
      ? "text-accent"
      : tone === "warn"
        ? "text-urgent"
        : "text-text-secondary";

  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-xs font-bold ${badgeCls}`}>{title}</span>
        <span className={`text-xs font-bold ${badgeCls}`}>{count}件</span>
      </div>
      {subtitle && (
        <p className="mb-1 text-xs text-text-tertiary">{subtitle}</p>
      )}
      <div className="space-y-1.5">
        {results.map((r, i) => (
          <ResultCardDetailed
            key={`${r.property?.reins_id}-${i}`}
            result={r}
            tone={tone}
            onOpenMaisoku={onOpenMaisoku}
          />
        ))}
      </div>
    </div>
  );
}

function ResultCardCompact({ result }: { result: BukkakuResult }) {
  const name = result.property?.property_name || result.property?.reins_id || "不明";
  const room = result.property?.room_number || "";

  if (result.found) {
    return (
      <div className="rounded-md border border-accent/30 bg-ai-surface px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <CheckCircleIcon className="h-3.5 w-3.5 text-accent shrink-0" />
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
        <BlockIcon className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
        <p className="text-xs text-text-secondary">
          {name} {room}
        </p>
      </div>
      <p className="mt-0.5 ml-5 text-xs text-text-tertiary">
        {result.needs_manual_check ? "要手動確認" : "空室情報なし"}
      </p>
    </div>
  );
}

function ResultCardDetailed({
  result,
  tone,
  onOpenMaisoku,
}: {
  result: BukkakuResult;
  tone: "ok" | "neutral" | "warn";
  onOpenMaisoku: OpenMaisoku;
}) {
  const p = result.property;
  const name = p?.property_name || p?.reins_id || "不明";
  const room = p?.room_number || "";
  const ad = bestAd(result);
  const reinsId = p?.reins_id ?? null;

  const cardCls =
    tone === "ok"
      ? "border-accent/30 bg-ai-surface"
      : tone === "warn"
        ? "border-urgent/30 bg-urgent/5"
        : "border-border bg-white";

  return (
    <div className={`rounded-md border px-2.5 py-2 ${cardCls}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-primary truncate">
            {name} {room}
          </p>
          {p?.address && (
            <p className="mt-0.5 inline-flex items-center gap-1 max-w-full text-xs text-text-tertiary">
              <LocationIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.address}</span>
            </p>
          )}
        </div>
        {ad && (
          <span className="shrink-0 rounded-sm bg-accent/15 px-1.5 py-0.5 text-xs font-bold text-accent">
            AD {ad}
          </span>
        )}
      </div>

      {tone === "warn" && (
        <ManualCheckDetails property={p} />
      )}

      {tone !== "warn" && result.platformId && (
        <p className="mt-1 text-xs text-accent">
          ヒット: {result.platformId}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2">
        {reinsId && (
          <button
            type="button"
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onOpenMaisoku(reinsId, `${name}${room ? ` ${room}` : ""}`, {
                top: rect.top,
                right: rect.right,
                width: rect.width,
                height: rect.height,
              });
            }}
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-white px-2 py-0.5 text-xs text-text-primary hover:bg-surface transition-colors"
          >
            <DescriptionIcon className="h-3.5 w-3.5" />
            図面確認
          </button>
        )}
        {reinsId && (
          <span className="text-xs text-text-tertiary">
            REINS: {reinsId}
          </span>
        )}
      </div>
    </div>
  );
}

function MaisokuPopover({
  reinsId,
  title,
  anchor,
  onClose,
}: {
  reinsId: string;
  title: string;
  anchor: MaisokuAnchor;
  onClose: () => void;
}) {
  // "Speech bubble" popover: originates from the 図面確認 button (top-right
  // corner of popover = button's top-right), grows leftward over the middle
  // chat panel. Click outside / close button / Escape to close.
  const [entered, setEntered] = useState(false);
  // Component only mounts after a click, so `window` is always defined.
  const [viewport, setViewport] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    const raf = requestAnimationFrame(() => setEntered(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [onClose]);

  const pdfSrc = `/api/maisoku/${reinsId}`;

  const MARGIN = 12;
  const PREF_W = 720;
  const PREF_H = 620;
  const GAP = 6;

  // Right-align with the button's right edge, but clamp so we stay on-screen.
  const rightFromViewportRight = Math.max(
    MARGIN,
    viewport.w - anchor.right,
  );
  const MIN_H = 240;
  const rawTop = Math.min(
    anchor.top + anchor.height + GAP,
    viewport.h - MIN_H - MARGIN,
  );
  // Clamp top so there's always at least MIN_H of usable height below it.
  const top = Math.max(MARGIN, rawTop);
  const width = Math.max(320, Math.min(PREF_W, viewport.w - rightFromViewportRight - MARGIN));
  const height = Math.max(MIN_H, Math.min(PREF_H, viewport.h - top - MARGIN));

  // Tail / speech-bubble notch horizontally positioned over the clicked button.
  const tailRight = Math.max(8, anchor.width / 2 - 6);

  const node = (
    <>
      {/* Invisible click-catcher. Sits ABOVE the rest of the app so any outside
          click closes the popover. Transparent so chat/context stay visible. */}
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-transparent cursor-default"
      />

      <div
        role="dialog"
        aria-label={`マイソク ${title}`}
        style={{
          top,
          right: rightFromViewportRight,
          width,
          height,
          transformOrigin: "top right",
        }}
        className={`fixed z-[9999] flex flex-col bg-white rounded-xl shadow-2xl border border-border overflow-hidden
                    transition-[transform,opacity] duration-200 ease-out will-change-transform
                    ${entered ? "scale-100 opacity-100" : "scale-[0.08] opacity-0"}`}
      >
        {/* Speech-bubble tail pointing up at the 図面確認 button. */}
        <span
          aria-hidden
          style={{ right: tailRight }}
          className="absolute -top-[7px] w-3 h-3 bg-white border-l border-t border-border rotate-45"
        />

        <div className="relative flex items-center justify-between gap-2 border-b border-border px-3 py-2 bg-white">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text-primary truncate">{title}</p>
            <p className="text-xs text-text-tertiary">REINS: {reinsId}</p>
          </div>
          <a
            href={pdfSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-sm border border-border bg-white px-2 py-1 text-xs text-text-primary hover:bg-surface transition-colors"
            title="別タブで開く"
          >
            ↗
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-sm bg-surface p-1.5 text-text-primary hover:bg-border-light transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 bg-surface min-h-0">
          <iframe
            src={pdfSrc}
            title={`マイソク ${title}`}
            // No sandbox: Chrome's built-in PDF viewer relies on `eval` which
            // any sandbox CSP blocks (even with allow-scripts). HTML leakage
            // is already prevented by the %PDF magic-byte check in the route.
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </>
  );

  // Render into document.body so the popover escapes any ancestor with
  // `transform` / `filter` / `overflow: hidden`, which otherwise trap
  // `position: fixed` into a parent stacking context.
  return createPortal(node, document.body);
}

function ManualCheckDetails({ property }: { property: BukkakuProperty | undefined }) {
  if (!property) return null;
  const rows: Array<[string, string]> = [];
  if (property.management_company) rows.push(["管理会社", property.management_company]);
  if (property.management_phone) rows.push(["電話", property.management_phone]);
  if (property.rent) rows.push(["賃料", property.rent]);
  if (property.room_number) rows.push(["部屋番号", property.room_number]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-1.5 rounded-sm bg-white/60 border border-urgent/20 px-2 py-1.5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-text-tertiary">{k}</dt>
            <dd className="text-text-primary font-mono break-all">
              {k === "電話" ? (
                <a
                  href={`tel:${v.replace(/[^\d+]/g, "")}`}
                  className="underline decoration-dotted hover:text-accent"
                >
                  {v}
                </a>
              ) : (
                v
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Returns the best AD string across all hits/results, or null. */
function bestAd(result: BukkakuResult): string | null {
  const matches = collectMatches(result);
  let best: { pct: number; label: string } | null = null;
  for (const m of matches) {
    const label = m.ad_percent || m.ad_info || null;
    if (!label) continue;
    const pct = parseAdPercent(m.ad_percent ?? m.ad_info);
    if (pct <= 0) continue;
    if (!best || pct > best.pct) best = { pct, label };
  }
  return best?.label ?? null;
}

function resultHasAd(result: BukkakuResult): boolean {
  const matches = collectMatches(result);
  for (const m of matches) {
    if (m.has_ad === true) return true;
    if (parseAdPercent(m.ad_percent ?? m.ad_info) > 0) return true;
  }
  return false;
}

function collectMatches(result: BukkakuResult): BukkakuMatch[] {
  const out: BukkakuMatch[] = [];
  if (Array.isArray(result.results)) out.push(...result.results);
  if (Array.isArray(result.hits)) {
    for (const h of result.hits) {
      if (Array.isArray(h.results)) out.push(...h.results);
    }
  }
  return out;
}

function parseAdPercent(raw: string | undefined | null): number {
  if (!raw) return 0;
  const s = String(raw).trim();
  // "200%" / "100%" / "0%"
  const pctMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*[%％]/);
  if (pctMatch) return parseFloat(pctMatch[1]);
  // "2ヶ月" / "1ヶ月" → * 100
  const monthMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*ヶ?月/);
  if (monthMatch) return parseFloat(monthMatch[1]) * 100;
  // "AD150" (goweb style)
  const adMatch = s.match(/AD\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (adMatch) return parseFloat(adMatch[1]);
  return 0;
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

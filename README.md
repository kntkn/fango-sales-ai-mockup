# FANGO Sales AI Mockup

FANGO 営業 AI プロジェクト（FNG26）の**営業アシスト UI 本体**。SUUMO → JDS 反響サイト → LINE 誘導後の営業プロセスを AI でアシストする（完全自動チャットボットではなく、営業担当者へのリアルタイムアシスト）。

## スコープ

### In Scope (Phase 1)
- LINE OA 上の営業チャットへの AI アシスト UI
- 内見確度スコア（高/中/低）/ トーク提案 / 顧客プロファイル要約
- 5 分 SLA タイマー + エスカレーション
- Bukkaku（物確自動化）/ Obikae（帯替え）ツールのランチャー

### Out of Scope (Phase 1)
- 完全自動チャットボット応答

### ビジネスモデル
成約課金（pay-per-deal）

## UI/UX 決定事項

- Asymmetric three-column layout（会話リスト 260px / チャット flex / コンテキスト 340px）
- AI 提案: Progressive Disclosure 3 層（indicator → preview → full）
- 4 AI modes: Pounce / Suggest / Expand / Tune（ファネルステージ連動）
- 内見確度スコア: 3 段階カテゴリ（高/中/低、% 表示しない）
- 5 分 SLA タイマー + 視覚エスカレーション

詳細は `design-spec.md` および `current-design-audit.md` 参照。

## Stack

- Next.js 16 / React 19 / Tailwind CSS 4
- パッケージマネージャ: **bun**
- LINE Messaging API / LIFF
- Notion (`@notionhq/client` v5、`data_source_id` 使用)
- Fango Recommend API（物件提案）

## セットアップ

```bash
bun install
cp .env.example .env.local  # .env.example が無い場合は以下を参考に .env.local 作成
bun dev
```

### 必要な環境変数（`.env.local`）

```
# Notion
NOTION_TOKEN=
NOTION_CUSTOMER_DB_ID=
NOTION_CUSTOMER_DS_ID=

# LINE Messaging API
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# Fango Recommend API
FANGO_RECOMMEND_URL=
FANGO_RECOMMEND_USER=
FANGO_RECOMMEND_PASS=

# External tools (cloudflared tunnels)
NEXT_PUBLIC_BUKKAKU_WS_URL=
NEXT_PUBLIC_OBIKAE_BASE_URL=
```

## ディレクトリ

```
src/
├── app/
│   ├── page.tsx                     # メインビュー（会話リスト + チャット + コンテキスト）
│   ├── layout.tsx / globals.css
│   └── api/
│       ├── customers/               # 顧客 CRUD
│       ├── line/                    # webhook / messages / conversations / customers
│       └── recommend/               # Fango Recommend プロキシ（search / status）
├── components/
│   ├── ConversationList.tsx         # 会話リスト（左カラム）
│   ├── ChatThread.tsx               # チャット（中央カラム）
│   ├── ContextPanel.tsx             # AI 提案・スコア・プロファイル（右カラム）
│   ├── CrmView.tsx / AgentListView.tsx / InquiryListView.tsx
│   ├── BukkakuPipeline.tsx          # 物確パイプライン
│   └── ObikaeLauncher.tsx           # 帯替えツールランチャー
└── lib/
    ├── notion.ts / notion-map.ts / notion-chatlog.ts
    ├── line-client.ts / line-store.ts
    ├── fango-recommend.ts
    ├── agent-store.ts / obikae-launch.ts
    ├── use-bukkaku.ts / use-call-memo.ts
    └── mock-data.ts / types.ts / types-bukkaku.ts
```

## 関連リポジトリ

- [`fango-line-tracker`](https://github.com/kntkn/fango-line-tracker) — LINE Webhook + Notion chatlog tracker（反響顧客のLINE誘導・初期トラッキング担当。責務分離のため独立運用）

## レビュアー向けメモ

- 設計意思決定ログ: `design-spec.md`, `current-design-audit.md`, `design-system-research.md`, `research_ui_approaches.md`
- UI スクリーンショット: `../../mockup-screenshot.png`, `call-memo-right-panel.png`
- 全体プロジェクトドキュメント（社内のみ）: `FNG26_営業AI/.claude/CLAUDE.md`

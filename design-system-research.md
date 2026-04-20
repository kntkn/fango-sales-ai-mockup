# デジタル庁デザインシステム 完全仕様書

> **Source**: https://design.digital.go.jp/ (v2.11.0)
> **Researched**: 2026-04-01
> **GitHub**: https://github.com/digital-go-jp/tailwind-theme-plugin
> **Figma**: https://www.figma.com/community/file/1377880368787735577
> **Storybook (HTML)**: https://design.digital.go.jp/dads/html/
> **Storybook (React)**: https://design.digital.go.jp/dads/react/

---

## 目次

1. [設計哲学・原則](#1-設計哲学原則)
2. [カラーシステム](#2-カラーシステム)
3. [タイポグラフィ](#3-タイポグラフィ)
4. [スペーシング](#4-スペーシング)
5. [レイアウト・グリッド](#5-レイアウトグリッド)
6. [角の形状（Border Radius）](#6-角の形状border-radius)
7. [エレベーション（シャドウ）](#7-エレベーションシャドウ)
8. [アクセシビリティ](#8-アクセシビリティ)
9. [アイコン](#9-アイコン)
10. [コンポーネント詳細](#10-コンポーネント詳細)
11. [リンクテキスト](#11-リンクテキスト)
12. [技術スタック・実装](#12-技術スタック実装)
13. [非推奨コンポーネント](#13-非推奨コンポーネント)

---

## 1. 設計哲学・原則

### コアミッション
**"誰一人取り残されない、人に優しいデジタル化を。"**
（Ensuring no one is left behind through people-centered digital transformation）

### 設計原則
- **インクルーシブデザイン**: 全てのユーザーがサービスを利用できること
- **アクセシビリティ最優先**: アクセシビリティ要件はすべての設計判断において最優先事項
- **人間中心設計**: ユーザー中心のデジタル化の実現
- **一貫性**: 個々のサービスごとのスタイリングに一貫性をもたらす
- **補助的機能としての設計**: デザインシステムは基盤として機能し、カスタム作業の代替にはならない

### 役割別利用方針
| 役割 | 利用方法 |
|------|---------|
| デザイナー | ガイドラインを習得しFigmaアセットを活用。サービス固有スタイルガイドを作成 |
| フロントエンドエンジニア | 標準化済みコンポーネントを活用。GitHub/Storybookを参照 |
| 企画・情報設計者 | サイトマップ段階からユーザビリティテストを実施 |
| 組織責任者 | アクセシビリティ基盤として認識・投資 |

---

## 2. カラーシステム

### 主要カラーファミリー（7系統）

各カラーは50〜1200の13段階スケールを持つ（primary, secondary, tertiary, background variants）。

#### Blue（青）— デフォルトブランドカラー
| Token | Hex | 用途 |
|-------|-----|------|
| blue-50 | `#e8f1fe` | 背景・ライト |
| blue-100 | `#d9e6ff` | |
| blue-200 | `#c5d7fb` | |
| blue-300 | `#9db7f9` | |
| blue-400 | `#7096f8` | |
| blue-500 | `#4979f5` | |
| blue-600 | `#3460fb` | |
| blue-700 | `#264af4` | インタラクション |
| blue-800 | `#0031d8` | |
| blue-900 | `#0017c1` | |
| blue-1000 | `#00118f` | |
| blue-1100 | `#000071` | |
| blue-1200 | `#000060` | 最暗 |

#### Light Blue（ライトブルー）
| Token | Hex |
|-------|-----|
| light-blue-50 | `#f0f9ff` |
| light-blue-100 | `#dcf0ff` |
| light-blue-200 | `#c0e4ff` |
| light-blue-300 | `#97d3ff` |
| light-blue-400 | `#57b8ff` |
| light-blue-500 | `#39abff` |
| light-blue-600 | `#008bf2` |
| light-blue-700 | `#0877d7` |
| light-blue-800 | `#0066be` |
| light-blue-900 | `#0055ad` |
| light-blue-1000 | `#00428c` |
| light-blue-1100 | `#00316a` |
| light-blue-1200 | `#00234b` |

#### Cyan（シアン）
| Token | Hex |
|-------|-----|
| cyan-50 | `#e9f7f9` |
| cyan-100 | `#c8f8ff` |
| cyan-200 | `#99f2ff` |
| cyan-300 | `#79e2f2` |
| cyan-400 | `#2bc8e4` |
| cyan-500 | `#01b7d6` |
| cyan-600 | `#00a3bf` |
| cyan-700 | `#008da6` |
| cyan-800 | `#008299` |
| cyan-900 | `#006f83` |
| cyan-1000 | `#006173` |
| cyan-1100 | `#004c59` |
| cyan-1200 | `#003741` |

#### Green（緑）— サクセス/ポジティブ
| Token | Hex |
|-------|-----|
| green-50 | `#e6f5ec` |
| green-100 | `#c2e5d1` |
| green-200 | `#9bd4b5` |
| green-300 | `#71c598` |
| green-400 | `#51b883` |
| green-500 | `#2cac6e` |
| green-600 | `#259d63` |
| green-700 | `#1d8b56` |
| green-800 | `#197a4b` |
| green-900 | `#115a36` |
| green-1000 | `#0c472a` |
| green-1100 | `#08351f` |
| green-1200 | `#032213` |

#### Lime（ライム）
| Token | Hex |
|-------|-----|
| lime-50 | `#ebfad9` |
| lime-100 | `#d0f5a2` |
| lime-200 | `#c0f354` |
| lime-300 | `#ade830` |
| lime-400 | `#9ddd15` |
| lime-500 | `#8cc80c` |
| lime-600 | `#7eb40d` |
| lime-700 | `#6fa104` |
| lime-800 | `#618e00` |
| lime-900 | `#507500` |
| lime-1000 | `#3e5a00` |
| lime-1100 | `#2c4100` |
| lime-1200 | `#1e2d00` |

#### Yellow（黄）
| Token | Hex |
|-------|-----|
| yellow-50 | `#fbf5e0` |
| yellow-100 | `#fff0b3` |
| yellow-200 | `#ffe380` |
| yellow-300 | `#ffd43d` |
| yellow-400 | `#ffc700` |
| yellow-500 | `#ebb700` |
| yellow-600 | `#d2a400` |
| yellow-700 | `#b78f00` |
| yellow-800 | `#a58000` |
| yellow-900 | `#927200` |
| yellow-1000 | `#806300` |
| yellow-1100 | `#6e5600` |
| yellow-1200 | `#604b00` |

#### Orange（オレンジ）
| Token | Hex |
|-------|-----|
| orange-50 | `#ffeee2` |
| orange-100 | `#ffdfca` |
| orange-200 | `#ffc199` |
| orange-300 | `#ffa66d` |
| orange-400 | `#ff8d44` |
| orange-500 | `#ff7628` |
| orange-600 | `#fb5b01` |
| orange-700 | `#e25100` |
| orange-800 | `#c74700` |
| orange-900 | `#ac3e00` |
| orange-1000 | `#8b3200` |
| orange-1100 | `#6d2700` |
| orange-1200 | `#541e00` |

#### Red（赤）— エラー
| Token | Hex |
|-------|-----|
| red-50 | `#fdeeee` |
| red-100 | `#ffdada` |
| red-200 | `#ffbbbb` |
| red-300 | `#ff9696` |
| red-400 | `#ff7171` |
| red-500 | `#ff5454` |
| red-600 | `#fe3939` |
| red-700 | `#fa0000` |
| red-800 | `#ec0000` |
| red-900 | `#ce0000` |
| red-1000 | `#a90000` |
| red-1100 | `#850000` |
| red-1200 | `#620000` |

#### Magenta（マゼンタ）
| Token | Hex |
|-------|-----|
| magenta-50 | `#f3e5f4` |
| magenta-100 | `#ffd0ff` |
| magenta-200 | `#ffaeff` |
| magenta-300 | `#ff8eff` |
| magenta-400 | `#f661f6` |
| magenta-500 | `#f137f1` |
| magenta-600 | `#db00db` |
| magenta-700 | `#c000c0` |
| magenta-800 | `#aa00aa` |
| magenta-900 | `#8b008b` |
| magenta-1000 | `#6c006c` |
| magenta-1100 | `#500050` |
| magenta-1200 | `#3b003b` |

#### Purple（紫）
| Token | Hex |
|-------|-----|
| purple-50 | `#f1eafa` |
| purple-100 | `#ecddff` |
| purple-200 | `#ddc2ff` |
| purple-300 | `#cda6ff` |
| purple-400 | `#bb87ff` |
| purple-500 | `#a565f8` |
| purple-600 | `#8843e1` |
| purple-700 | `#6f23d0` |
| purple-800 | `#5c10be` |
| purple-900 | `#5109ad` |
| purple-1000 | `#41048e` |
| purple-1100 | `#30016c` |
| purple-1200 | `#21004b` |

### グレースケール

#### Solid Gray（ソリッドグレー）
| Token | Hex |
|-------|-----|
| solid-gray-50 | `#f2f2f2` |
| solid-gray-100 | `#e6e6e6` |
| solid-gray-200 | `#cccccc` |
| solid-gray-300 | `#b3b3b3` |
| solid-gray-400 | `#999999` |
| solid-gray-420 | `#949494` |（カード枠線等に使用）|
| solid-gray-500 | `#7f7f7f` |
| solid-gray-536 | `#767676` |（最小コントラスト境界）|
| solid-gray-600 | `#666666` |
| solid-gray-700 | `#4d4d4d` |
| solid-gray-800 | `#333333` |
| solid-gray-900 | `#1a1a1a` |

#### Opacity Gray（透過グレー）
| Token | Value |
|-------|-------|
| opacity-gray-50 | `rgba(0,0,0,0.05)` |
| opacity-gray-100 | `rgba(0,0,0,0.1)` |
| opacity-gray-200 | `rgba(0,0,0,0.2)` |
| opacity-gray-300 | `rgba(0,0,0,0.3)` |
| opacity-gray-400 | `rgba(0,0,0,0.4)` |
| opacity-gray-420 | `rgba(0,0,0,0.42)` |
| opacity-gray-500 | `rgba(0,0,0,0.5)` |
| opacity-gray-536 | `rgba(0,0,0,0.54)` |
| opacity-gray-600 | `rgba(0,0,0,0.6)` |
| opacity-gray-700 | `rgba(0,0,0,0.7)` |
| opacity-gray-800 | `rgba(0,0,0,0.8)` |
| opacity-gray-900 | `rgba(0,0,0,0.9)` |

### セマンティックカラー

| Token | Hex | 用途 |
|-------|-----|------|
| `white` | `#ffffff` | 背景 |
| `black` | `#000000` | テキスト主体 |
| `success-1` | `#259d63` | 成功・完了（明） |
| `success-2` | `#197a4b` | 成功・完了（暗） |
| `error-1` | `#ec0000` | エラー（明） |
| `error-2` | `#ce0000` | エラー（暗） |
| `warning-yellow-1` | `#b78f00` | 警告・黄系（明） |
| `warning-yellow-2` | `#927200` | 警告・黄系（暗） |
| `warning-orange-1` | `#fb5b01` | 警告・橙系（明） |
| `warning-orange-2` | `#c74700` | 警告・橙系（暗） |
| `focus-yellow` | `#b78f00` | フォーカスリング（黄） |
| `focus-blue` | `#0877d7` | フォーカスリング（青） |

### コントラスト要件

| 対象 | 最小コントラスト比 |
|------|-----------------|
| テキスト（本文） | 4.5:1 以上 |
| プライマリカラー（白背景） | 4.5:1 以上 |
| セカンダリ/テーシャリ（隣接要素） | 3:1 以上 |
| 非テキスト要素（アイコン・ボーダー） | 3:1 以上 |
| フォーカスインジケーター | 十分なコントラスト確保必須 |

### カラー使用ルール
- 各カラーファミリーは**7つのキーカラースキーム**（青/緑/ニュートラル/ライトブルー/シアン/オレンジ/紫）を提供
- 色のみで情報を伝えてはならない（色盲・色弱ユーザー対応）
- カラーユニバーサルデザイン推奨パレットを参考に選定
- 同系色でも**色相を保ちつつ明度・彩度を調整**することでバリアントを作成
- 未訪問リンク: 青系、訪問済みリンク: 紫/マゼンタ系（区別のため赤み入り）

---

## 3. タイポグラフィ

### フォントファミリー

```css
font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
font-family: 'Noto Sans Mono', monospace;  /* コード・技術コンテンツ */
```

- **主体フォント**: Noto Sans JP（SIL Open Font License 1.1）— 可読性・視認性の高いサンセリフ
- **等幅フォント**: Noto Sans Mono

### フォントウェイト

| Token | Value |
|-------|-------|
| `font-weight-400` | 400（Normal） |
| `font-weight-700` | 700（Bold） |

### ラインハイト（行間）

| Token | Value | 用途 |
|-------|-------|------|
| `leading-100` | 1.0 | UIコンポーネント・単行テキスト |
| `leading-120` | 1.2 | データ密度の高い管理画面 |
| `leading-130` | 1.3 | 情報優先レイアウト |
| `leading-140` | 1.4 | 大きな見出し |
| `leading-150` | 1.5 | 標準的なウェブ本文（最小推奨） |
| `leading-160` | 1.6 | 一般的な記事テキスト |
| `leading-170` | 1.7 | 認知負荷軽減レイアウト |
| `leading-175` | 1.75 | 認知負荷軽減（最大） |

> **注意**: CSSにはパーセントではなく**数値**で実装すること（`line-height: 1.7` など）

### テキストスタイル完全一覧

テキストスタイルの命名規則: `[カテゴリ]-[サイズpx][ウェイト]-[行間%]`

#### Display（Dsp）— 特大見出し・ビジュアルインパクト

| Tailwind Class | Font Size | Weight | Line Height | Letter Spacing |
|---------------|-----------|--------|-------------|----------------|
| `text-dsp-64B-140` | 4rem (64px) | 700 | 1.4 | 0 |
| `text-dsp-57B-140` | 3.5625rem (57px) | 700 | 1.4 | 0 |
| `text-dsp-48B-140` | 3rem (48px) | 700 | 1.4 | 0 |
| `text-dsp-64N-140` | 4rem (64px) | 400 | 1.4 | 0 |
| `text-dsp-57N-140` | 3.5625rem (57px) | 400 | 1.4 | 0 |
| `text-dsp-48N-140` | 3rem (48px) | 400 | 1.4 | 0 |

#### Standard（Std）— 見出し・本文

| Tailwind Class | Font Size | Weight | Line Height | Letter Spacing |
|---------------|-----------|--------|-------------|----------------|
| `text-std-45B-140` | 2.8125rem (45px) | 700 | 1.4 | 0 |
| `text-std-36B-140` | 2.25rem (36px) | 700 | 1.4 | 0.01em |
| `text-std-32B-150` | 2rem (32px) | 700 | 1.5 | 0.01em |
| `text-std-28B-150` | 1.75rem (28px) | 700 | 1.5 | 0.01em |
| `text-std-26B-150` | 1.625rem (26px) | 700 | 1.5 | 0.02em |
| `text-std-24B-150` | 1.5rem (24px) | 700 | 1.5 | 0.02em |
| `text-std-22B-150` | 1.375rem (22px) | 700 | 1.5 | 0.02em |
| `text-std-20B-160` | 1.25rem (20px) | 700 | 1.6 | 0.02em |
| `text-std-20B-150` | 1.25rem (20px) | 700 | 1.5 | 0.02em |
| `text-std-18B-160` | 1.125rem (18px) | 700 | 1.6 | 0.02em |
| `text-std-17B-170` | 1.0625rem (17px) | 700 | 1.7 | 0.02em |
| `text-std-16B-170` | 1rem (16px) | 700 | 1.7 | 0.02em |
| `text-std-16B-175` | 1rem (16px) | 700 | 1.75 | 0.02em |
| `text-std-45N-140` | 2.8125rem (45px) | 400 | 1.4 | 0 |
| `text-std-36N-140` | 2.25rem (36px) | 400 | 1.4 | 0.01em |
| `text-std-32N-150` | 2rem (32px) | 400 | 1.5 | 0.01em |
| `text-std-28N-150` | 1.75rem (28px) | 400 | 1.5 | 0.01em |
| `text-std-26N-150` | 1.625rem (26px) | 400 | 1.5 | 0.02em |
| `text-std-24N-150` | 1.5rem (24px) | 400 | 1.5 | 0.02em |
| `text-std-22N-150` | 1.375rem (22px) | 400 | 1.5 | 0.02em |
| `text-std-20N-150` | 1.25rem (20px) | 400 | 1.5 | 0.02em |
| `text-std-18N-160` | 1.125rem (18px) | 400 | 1.6 | 0.02em |
| `text-std-17N-170` | 1.0625rem (17px) | 400 | 1.7 | 0.02em |
| `text-std-16N-170` | 1rem (16px) | 400 | 1.7 | 0.02em |
| `text-std-16N-175` | 1rem (16px) | 400 | 1.75 | 0.02em |

#### Dense（Dns）— 密度の高いUI・管理画面

| Tailwind Class | Font Size | Weight | Line Height |
|---------------|-----------|--------|-------------|
| `text-dns-17B-130` | 1.0625rem (17px) | 700 | 1.3 |
| `text-dns-17B-120` | 1.0625rem (17px) | 700 | 1.2 |
| `text-dns-16B-130` | 1rem (16px) | 700 | 1.3 |
| `text-dns-16B-120` | 1rem (16px) | 700 | 1.2 |
| `text-dns-14B-130` | 0.875rem (14px) | 700 | 1.3 |
| `text-dns-14B-120` | 0.875rem (14px) | 700 | 1.2 |
| `text-dns-17N-130` | 1.0625rem (17px) | 400 | 1.3 |
| `text-dns-17N-120` | 1.0625rem (17px) | 400 | 1.2 |
| `text-dns-16N-130` | 1rem (16px) | 400 | 1.3 |
| `text-dns-16N-120` | 1rem (16px) | 400 | 1.2 |
| `text-dns-14N-130` | 0.875rem (14px) | 400 | 1.3 |
| `text-dns-14N-120` | 0.875rem (14px) | 400 | 1.2 |

#### Oneline（Oln）— ラベル・ボタン・単行UI

| Tailwind Class | Font Size | Weight | Line Height | Letter Spacing |
|---------------|-----------|--------|-------------|----------------|
| `text-oln-17B-100` | 1.0625rem (17px) | 700 | 1.0 | 0.02em |
| `text-oln-16B-100` | 1rem (16px) | 700 | 1.0 | 0.02em |
| `text-oln-14B-100` | 0.875rem (14px) | 700 | 1.0 | 0.02em |
| `text-oln-17N-100` | 1.0625rem (17px) | 400 | 1.0 | 0.02em |
| `text-oln-16N-100` | 1rem (16px) | 400 | 1.0 | 0.02em |
| `text-oln-14N-100` | 0.875rem (14px) | 400 | 1.0 | 0.02em |

#### Mono（等幅）— コード・技術情報

| Tailwind Class | Font Size | Weight | Line Height |
|---------------|-----------|--------|-------------|
| `text-mono-17B-150` | 1.0625rem (17px) | 700 | 1.5 |
| `text-mono-16B-150` | 1rem (16px) | 700 | 1.5 |
| `text-mono-14B-150` | 0.875rem (14px) | 700 | 1.5 |
| `text-mono-17N-150` | 1.0625rem (17px) | 400 | 1.5 |
| `text-mono-16N-150` | 1rem (16px) | 400 | 1.5 |
| `text-mono-14N-150` | 0.875rem (14px) | 400 | 1.5 |

### 最小フォントサイズ
- **14px（0.875rem）が絶対最小**。UIの制約のある場所でのみ使用
- 本文の最小推奨: 16px

### テキスト装飾
4つのラインスタイル対応: `underline` / `overline` / `line-through` / `none`
リンクのアンダーラインはHTMLデフォルトのセマンティックな意味を持つ

---

## 4. スペーシング

### ベースユニット
**8 CSS px** をベースとしたモジュラースケール

### スペーシングスケール（確認済み値）
| Value | px | 用途例 |
|-------|-----|-------|
| 8px | 8px | ベースユニット、リスト内ディバイダーマージン最小 |
| 16px | 16px | セクション内ディバイダーマージン最小 |
| 24px | 24px | 3倍ユニット |
| 64px | 64px | 8倍ユニット |

### スペーシング原則
- **コンテンツ階層を反映**: 大きいスペース = 重要度高い、小さいスペース = 関連性高い
- **3〜5段階を推奨**: スタイルガイドで維持するスペーシング値は3〜5種類
- **ガター最小値**: カラム間スペースは本文文字サイズの2倍以上確保
- スペーシングはコンポーネント内部または定義済みテンプレートに埋め込む
- 縦方向のmarginは隣接するブロックレベル要素間でcollapse（注意）

---

## 5. レイアウト・グリッド

### ブレイクポイント

| Token | Value | 説明 |
|-------|-------|------|
| `desktop` | `48em` (768px) | デスクトップ開始 |
| `desktop-admin` | `62em` (992px) | 管理画面向けデスクトップ |

- **モバイル/タブレット**: 768px未満
- **デスクトップ**: 768px以上

### グリッドシステム

#### 基本レイアウト
| タイプ | 説明 |
|--------|------|
| 1カラム | 単一幅コンテンツ（サイドマージンあり） |
| 12カラム | 主要フレームワーク（12等分 + ガター） |
| 12カラム + 左メニュー | 左サイドバー + コンテンツエリア12カラム |

#### グリッドコンポーネント
- **マージン**: カラム全体とページの余白（狭いページでは調整）
- **カラム幅**: 本文文字サイズの整数倍をベース
- **ガター**: カラム間スペース = 本文文字サイズの2倍以上

#### レイアウトパターン
| パターン | カラム比率 |
|---------|-----------|
| 2カラム | 9+3, 3+9, 8+4, 4+8, 6+6 |
| 3カラム | 3+6+3, 4+4+4 |
| 4カラム | 3+3+3+3 |
| オフセット | 中央寄せ（記事スタイル） |

### アスペクト比

| Token | Value |
|-------|-------|
| `1/1` | 1 / 1 |
| `3/2` | 3 / 2 |
| `16/9` | 16 / 9 |

---

## 6. 角の形状（Border Radius）

| Token | Value | 用途 |
|-------|-------|------|
| `radius-4` | 0.25rem (4px) | フォーカスリング・小要素 |
| `radius-6` | 0.375rem (6px) | |
| `radius-8` | 0.5rem (8px) | 標準コンポーネント |
| `radius-12` | 0.75rem (12px) | カード等の中サイズ |
| `radius-16` | 1rem (16px) | |
| `radius-24` | 1.5rem (24px) | 大きなカード・モーダル |
| `radius-32` | 2rem (32px) | |
| `radius-full` | 624.9375rem | 完全な円・ピル形状 |

---

## 7. エレベーション（シャドウ）

8段階の進行的シャドウ。Shadow 1が最弱、Shadow 8が最強。

| Token | CSS Value |
|-------|-----------|
| `shadow-1` | `0 2px 8px 1px rgba(0,0,0,0.1), 0 1px 5px 0 rgba(0,0,0,0.3)` |
| `shadow-2` | `0 2px 12px 2px rgba(0,0,0,0.1), 0 1px 6px 0 rgba(0,0,0,0.3)` |
| `shadow-3` | `0 4px 16px 3px rgba(0,0,0,0.1), 0 1px 6px 0 rgba(0,0,0,0.3)` |
| `shadow-4` | `0 6px 20px 4px rgba(0,0,0,0.1), 0 2px 6px 0 rgba(0,0,0,0.3)` |
| `shadow-5` | `0 8px 24px 5px rgba(0,0,0,0.1), 0 2px 10px 0 rgba(0,0,0,0.3)` |
| `shadow-6` | `0 10px 30px 6px rgba(0,0,0,0.1), 0 3px 12px 0 rgba(0,0,0,0.3)` |
| `shadow-7` | `0 12px 36px 7px rgba(0,0,0,0.1), 0 3px 14px 0 rgba(0,0,0,0.3)` |
| `shadow-8` | `0 14px 40px 7px rgba(0,0,0,0.1), 0 3px 16px 0 rgba(0,0,0,0.3)` |

### エレベーション使用ルール

| コンテキスト | 要件 |
|------------|------|
| ベースサーフェス | Level 0（シャドウなし） |
| ボタン/カード | 適切なシャドウレベル |
| ホバー状態 | 休止状態より1レベル以上高く |
| ダイアログ/モーダル | ベースコンテンツより最低2レベル高く |
| Level-1コンポーネントがある場合のダイアログ | Level 3以上 |

> **注意**: ドロップシャドウのみでコントラストを確保することはできない。要素のボーダーと背景色の間に3:1以上のコントラスト比が必要

### オーバーレイシェード
ダイアログやモーダルが表示される際、背景に半透明の黒いシェードを重ね、背景操作を防ぐ。

---

## 8. アクセシビリティ

### 準拠規格
| 規格 | バージョン | ステータス |
|------|----------|-----------|
| WCAG | 2.2（最新参照） | 主要参照 |
| WCAG | 2.1 | 参照 |
| WCAG | 2.0 / JIS X 8341-3:2016 | 互換対応 |
| WCAG | 3.0 | 監視中（Working Draft） |
| WAI-ARIA | 1.2 | 実装参照 |
| WAI-ARIA | 1.3 | 監視中（Working Draft） |

### フォーカスインジケーター
```css
/* フォーカス時スタイル */
focus-visible:rounded-4
focus-visible:bg-yellow-300
focus-visible:outline
focus-visible:outline-4
focus-visible:outline-black
```
- **黄色背景 + 黒アウトライン4px** の組み合わせ
- focus-visible疑似クラスを使用（マウス操作時は非表示）

### タッチターゲットサイズ
- **最小44 × 44 CSS px** — ボタン、リンク等すべてのインタラクティブ要素
- ボタン高が44px未満でも、paddingで44pxのターゲット領域を確保

### コントラスト
| 要素 | 最小比率 |
|------|---------|
| 本文テキスト | 4.5:1 |
| 大きな文字（18px以上または14px以上Bold） | 3:1 |
| 非テキストUI要素 | 3:1 |
| アイコン（スタンドアロン） | 4.5:1 |
| アイコン（ラベル付き） | 3:1（non-text基準） |

### スクリーンリーダー対応
- `sr-only` クラスでスクリーンリーダー専用コンテンツを提供
- 意味論的な見出し階層（h1, h2, h3...）を遵守
- 全画像にalt属性必須
- aria-labelは**ラベル付きアイコンには使わない**（アイコン専用aria-label禁止）
- 外部リンクには「新しいタブを開きます」のaltテキスト付きアイコン

### アイコンのアクセシビリティ
- **ラベル付きアイコン**: 代替テキスト不要。`alt=""` または aria-label省略
- **スタンドアロンアイコン**: ラベルと同等の代替テキスト必須。44×44px最小サイズ
- 装飾的アイコン: 追加マークアップ不要
- 機能的アイコン: 説明テキスト + 十分なターゲットサイズ

### アニメーション
- ユーザーの動作設定（`prefers-reduced-motion`）に対応
- 動きのあるオブジェクトは設定に基づいて制御

---

## 9. アイコン

### アイコン分類（位置による4タイプ）
| タイプ | 配置位置 |
|--------|---------|
| Front Icon | ブロックレベルボックスの先頭 |
| Lead Icon | インライン/テキストシーケンスの先頭 |
| Tail Icon | インライン/テキストシーケンスの末尾 |
| End Icon | ブロックレベルボックスの末尾 |

### 実装
- SVGベース
- `@2x` Retinaバリアント対応
- 色はカラートークンから指定
- カウンターバッジ（①②③④）でポジション視覚的区別可能

### イラスト・アイコン素材（行政手続き向け）
- 手描き風スタイル、大きな曲線で柔らかい印象
- 要素を絞ってシンプルに設計
- **フォーマット**: ZIP（7,018KB）
- **カラープロファイル**: RGB（デジタルディスプレイ向け）
- **ライセンス**: クレジット表記不要で利用可
- **アクセシビリティ**: alt属性必須。画像のみで行政情報を伝えることは不可
- **最新版**: 2023年6月リリース

---

## 10. コンポーネント詳細

### ボタン（Button）

#### バリアント
| バリアント | 外観 | 用途 |
|-----------|------|------|
| Primary（Filled） | 色付き背景 + 白テキスト | メインアクション |
| Secondary（Outline） | 白背景 + 色付きボーダー/テキスト | サブアクション |
| Tertiary（Text） | 透明背景 + 下線付き色テキスト | キャンセル/補助 |

#### サイズ
| Size | Width | Height |
|------|-------|--------|
| Large | 136px（最小） | 56px |
| Medium | 96px（最小） | 48px |
| Small | 80px（最小） | 36px |
| X-Small | 72px（最小） | 28px |

> ラベルの長さに応じて幅は可変（label + padding）

#### 状態（States）
- Default、Hover（暗い色）、Active（さらに暗い）、Focus、Disabled（非推奨—contextual messagingを推奨）

#### レイアウトルール
- **1画面にPrimaryボタンは1つまで**
- Secondaryは最大3つ
- Tertiaryは1つ（キャンセルアクション用）
- デスクトップ: Primary右寄せ、Tertiary左寄せ
- モバイル: 縦積み（セマンティック順序を維持）
- `disabled` 属性はアクセシビリティ上の問題があるため非推奨

---

### カード（Card）

#### 構造
- **メディアセクション**: プレースホルダー画像エリア
- **コンテンツセクション**: ラベル、タイトル、説明文（オプションのアクションアイコン）
- **アクションセクション**: 右揃えのアクションボタン

#### スタイル
- ボーダー: `solid-gray-420`（グレー枠線）
- 背景: 白（コンテンツセグメント）
- セグメント間ボーダーで縦分割

#### 用途
1. メディアとテキストのグルーピング（周囲コンテンツとの区別）
2. 比較可能なアイテムのグリッド/リスト表示（記事、商品、ギャラリー）

---

### テーブル（Table / Data Table）

#### ヘッダー
```
bg-solid-gray-50
border-b border-black
px-4 py-2.5 text-start align-top
```

#### ボディ行
```
border-b border-solid-gray-420
```

#### セルパディング
```
px-4 py-2.5  /* 水平16px, 垂直10px */
```

#### タイポグラフィ
- `text-std-16N-170`（ベースフォントスタイル）

#### 最小幅
- `min-w-96`

#### 2種類
1. **標準テーブル**: データと情報の表示
2. **データテーブル**: 大規模データセットの管理（選択・編集・ソート機能付き）

---

### 通知バナー（Notification Banner）

#### バリアント
| タイプ | カラー | アイコン | 用途 |
|--------|--------|---------|------|
| Success | Green | チェックマーク | 操作完了通知 |
| Error | Red | ×マーク | 操作失敗通知 |
| Warning | Yellow/Orange | !マーク | 注意喚起 |
| Info 1 | Blue | iマーク | 中立的情報 |
| Info 2 | Black | iマーク | 重要アナウンス |

#### デザインスタイル
- Standard: 角丸ボーダーコンテナ
- Color Chip: 左太枠ボーダーアクセント

#### コンポーネント構成
- **必須**: アイコン、タイトル
- **任意**: 閉じるボタン、日付/期間テキスト、説明文、アクションボタン

#### 閉じるボタン
- 永続的な × コントロール
- 閉じた状態を保持し、再表示のリカバリー機能を提供

---

### 緊急バナー（Emergency Banner）

- **カラー**: セマンティックエラーカラー（赤/コーラル）
- **タイトル**: 太字、全角30文字以内、先頭に「【緊急】」プレフィックス
- **説明文**: 全角100文字程度以内（SNS配信を考慮）
- **配置**: ページ最上部（他のすべての通知より上）
- **閉じる**: 不可（ユーザーによる非表示禁止）
- **用途**: 生命・財産に関わる緊急情報のみ（長期使用禁止 = 警告疲れ防止）
- **デザイン原則**: サイトブランドとあえて異なるスタイルにして注目を強制

---

### ヘッダーコンテナ（Header Container）

#### 4つのレスポンシブレイアウト
| レイアウト | 構成 |
|-----------|------|
| Wide（Full） | ロゴ左 + ヘッダーアイテム右端まで + グローバルメニュー下部全幅 |
| Wide（Slim） | ロゴ左 + ヘッダーアイテム右 + グローバルメニュー中間 |
| Medium | ロゴ左 + ヘッダーアイテム中央 + ハンバーガー右 |
| Compact | ロゴ左 + ハンバーガー右（最小構成） |

#### ヘッダーアイテム
ユーティリティリンク、言語セレクタ、検索ボックス（予定）、ログイン/登録ボタン（予定）

---

### 言語セレクタ（Language Selector）

- **ボタンラベル**: 選択言語にかかわらず常に「Language」（英語）
- **ドロップダウン**: 各言語を母国語表記でリスト
- **選択済み状態**: 太字 + チェックマークアイコン
- **配置（Full/Wide）**: ヘッダー上部コーナー（左右）
- **配置（Slim/Mobile）**: ハンバーガーメニュー内リストアイテム

---

### チェックボックス（Checkbox）

- **サイズ**: S / M / L の3段階
- **部品**: チェックボックス + ラベル（右側配置）
- **状態**: Unchecked / Checked
- **用途**: 複数選択のみ。単一選択にはラジオボタン必須
- **ラベル省略**: 1オプションのみかつコンテキストが明確な場合のみ可

---

### アコーディオン（Accordion）

- 複数の類似セクションをたたんでリスト視認性を向上
- **適切な用途**: FAQ、更新履歴、条件付きフォームセクション
- **禁止**: スペース節約のみを目的とした使用、重要コンテンツの非表示
- **必須条件**: 複数セクションが必要（単一セクションのアコーディオン不可）
- 部分的なコンテンツ隠蔽には Disclosure コンポーネントを使用

---

### パンくずナビ（Breadcrumb）

- ヘッダーとページタイトルの間に配置
- コンテンツ幅を超えた場合は改行（デスクトップ・モバイル共通）
- **モバイル横スクロール方式**: 改行なしで横スクロール → ページ下部/フッターエリアにwrapped版も配置

---

### ディバイダー（Divider）

#### バリアント
| タイプ | 説明 |
|--------|------|
| Full-width | コンテンツエリア全幅（セクション区切り） |
| Inset | パディング付き（同セクション内のアイテムグルーピング） |

#### スペーシング
- リスト内: 最低8pxマージン
- セクション間: 最低16pxマージン

---

### ドロワー（Drawer）

- **展開方向**: 上/下/左/右の4方向
- **モーダル必須**: オーバーレイシェードで背後コンテンツをブロック
- **バリアント**: フルスクリーン / 右サイド / 左サイド
- トリガー: ハンバーガーメニューボタン等

---

### ファイルアップロード（File Upload）

| 状態 | 背景色 | ボーダー色 |
|------|--------|---------|
| Normal | gray-50 | gray-536 |
| Drag-over | green-50 | success-1 |

- ドラッグ&ドロップ対応
- 単体・複数ファイル選択対応
- HTML `<input type="file">` ベース
- コンポーネント: ファイル選択ボタン（アウトラインスタイル）+ チェックボックス + ドロップエリア

---

### カルーセル（Carousel）

- **自動再生なし**（ユーザー起動のナビゲーションのみ）
- ステップナビゲーションで現在位置表示（例: 1-4）
- 「すべてのスライド」ボタンを提供
- **注意**: カルーセルはクリック率が低い。重要情報には不向き。代替: カード、リスト、見出し

---

### ユーティリティリンク（Utility Link）

- 標準水平リストより**コンパクト**な表示
- 横一列に4〜5リンク
- **デスクトップ**: ロゴ上部、右寄せ
- **フッター**: 著作権情報上、中央配置
- 典型例: お問い合わせ、FAQ、ヘルプ、プライバシーポリシー、SNSアカウント

---

### フォーム要素（Input Text / Textarea / Select / Date Picker）

#### Input Text
- **構成**: ラベル + 必須/ステータスラベル + サポートテキスト + 入力フィールド
- **必須表示**: 「※必須」
- **編集不可表示**: 「編集不可」
- 1行テキスト入力（名前、電話番号等）

#### Date Picker
- インプットフィールド + カレンダーの複合コンポーネント
- 統合型と分離型の2バリアント（React実装）

#### Checkbox（再掲: S/M/L）
#### Radio Button（チェックボックスと同等パターン、単一選択用）

---

### メニューリスト（Menu List）

- ローカルメニューまたはドロップダウン/メガメニュー内で使用
- **End Icons**: シェブロンでリンクを視覚強調（ただしアコーディオントグルと混在禁止）
- **セクションディバイダー**: コンテンツタイプが大きく異なる場合のみ
- **カテゴリタイトル**: 太字でセクションヘッダーを視覚区別

---

## 11. リンクテキスト

### カラー
- **未訪問**: 青系（ブラウザデフォルト準拠）
- **訪問済み**: マゼンタ/パープル系（青との区別のため赤み入り）
- 色のみで情報を伝えてはならない

### アンダーライン
- 通常テキストとリンクを区別するためのアンダーライン
- 外部リンクアイコンにはアンダーライン不要

### ホバー状態
- リンク色・アンダーライン太さ・背景色の変更
- **禁止**: フォントウェイト・サイズ変更（レイアウトシフト発生のため）

### 外部リンクパターン
```html
<!-- テキスト末尾にアイコン + altテキスト -->
リンクテキスト<img src="external-icon.svg" alt="新しいタブを開きます">

<!-- PDF等のファイルリンク -->
紹介パンフレット（PDF:100KB、内閣府）
```

---

## 12. 技術スタック・実装

### 採用技術
| 技術 | 用途 |
|------|------|
| Next.js (React) | デザインシステムサイト本体 |
| Tailwind CSS | スタイリング |
| `@digital-go-jp/tailwind-theme-plugin` | デザイントークン提供 |
| TypeScript | 実装言語 |
| Vite | ビルドツール |
| Storybook | コンポーネントドキュメント |
| Playwright | E2Eテスト |
| Biome | フォーマッター |
| Markuplint | HTMLバリデーション |

### GitHubリポジトリ
| リポジトリ | URL |
|-----------|-----|
| Tailwind テーマプラグイン | https://github.com/digital-go-jp/tailwind-theme-plugin |
| HTML コンポーネント | https://github.com/digital-go-jp/design-system-example-components-html |
| React コンポーネント | https://github.com/digital-go-jp/design-system-example-components-react |

### Tailwind CSS v4 CSS変数（全トークン）
デザイントークンはCSSカスタムプロパティとして提供:
```css
@theme {
  --color-white: #ffffff;
  --color-black: #000000;
  /* ... 全カラートークン（上記カラーシステム参照） */
  --font-sans: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Noto Sans Mono', monospace;
  --font-weight-400: 400;
  --font-weight-700: 700;
  --leading-100: 1; /* ... */
  --radius-4: 0.25rem; /* ... */
  --shadow-1: 0 2px 8px 1px rgba(0,0,0,0.1), 0 1px 5px 0 rgba(0,0,0,0.3); /* ... */
}
```

### インストール（Tailwind v3）
```bash
npm install @digital-go-jp/tailwind-theme-plugin
```
```js
// tailwind.config.js
const { dadsPlugin } = require('@digital-go-jp/tailwind-theme-plugin');
module.exports = {
  plugins: [dadsPlugin],
};
```

### ブラウザサポート
Chrome、Edge、Safari、Firefox（各最新版）

### Figma
- **Figma Community**: https://www.figma.com/community/file/1377880368787735577
- v2系（最新）とv1系（フェーズアウト中）の2系統
- v1系コンポーネント: Modal Dialog等一部コンポーネントはv1のみ提供

### コンポーネント完全リスト（48コンポーネント）
Accordion, Image Slider, Input Text, Blockquote, Card, List, Carousel, Emergency Banner, Global Menu, Search Box, Scroll Top Button(*), Step Navigation, Description List, Select Box, Tab, Checkbox, Chip Tag, Chip Label, Disclosure, Divider, Table Control, Data Table, Text Area, Drawer, Notification Banner, Breadcrumb, Hamburger Menu Button, Date Picker, File Upload, Progress Indicator, Page Navigation, Header Container, Button, Bottom Navigation(*), Heading, Mega Menu, Menu List, Menu List Box, Modal Dialog, Mobile Menu, Utility Link, Radio Button, Language Selector, Resource List

> （*）= 非推奨

---

## 13. 非推奨コンポーネント

| コンポーネント | 理由 |
|-------------|------|
| Bottom Navigation | アクセシビリティ・ユーザビリティ上の問題 |
| Scroll Top Button | アクセシビリティ・ユーザビリティ上の問題 |

非推奨でも参照用にFigma v1 / React実装を提供中。使用する場合は特定ユーザーへの不利益を考慮したうえで慎重に実装。

---

## 補足：ガイドライン準備中コンポーネント

以下のコンポーネントはFigma/実装コードは提供されているが、テキストガイドラインは未公開（2026-04-01時点）:

- Select Box
- Tab
- Chip Tag
- Chip Label
- Description List
- Resource List
- Blockquote
- Mega Menu
- Modal Dialog（v2版ガイドライン）
- Global Menu
- Search Box
- Step Navigation
- Progress Indicator
- Page Navigation
- Text Area
- Radio Button
- Menu List Box

これらのコンポーネントの仕様はStorybookまたはFigmaファイルを直接参照:
- HTML Storybook: https://design.digital.go.jp/dads/html/
- React Storybook: https://design.digital.go.jp/dads/react/

---

*Generated by researcher agent. Primary source: design.digital.go.jp + GitHub tailwind-theme-plugin (verified token values).*

# EnBloom

**縁が、恋に咲く。**

EnBloom（エンブルーム）は、「縁が花開く」をテーマにしたマッチング Web アプリです。友達の紹介や信頼できるつながりを起点に、恋や縁が自然に花開く、安心感のある出会いの場を目指します。

## 技術スタック予定

- React
- TypeScript
- Vite
- SPA
- Tailwind CSS
- React Router
- Supabase Auth / Database / Storage / Row Level Security
- Vercel
- GitHub 連携

## 開発ステータス

現在は **Phase 1：フロントエンド基盤** です。Vite + React + TypeScript のSPA、Tailwind CSS、React Router、テーマ切り替え、主要画面のプレースホルダー、ダミーデータのプロフィールカードUIを実装しています。

Supabase本接続、Googleログイン本実装、DB接続、メッセージ永続化、いいね・マッチの本実装は次フェーズ以降で行います。

## 使用技術

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- lucide-react
- clsx
- tailwind-merge

## セットアップ手順

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` には次フェーズのSupabase接続用に以下のキーを用意しています。Phase 1では未設定でもアプリは落ちません。

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # TypeScriptチェック + 本番ビルド
npm run lint     # ESLintチェック
npm run preview  # ビルド結果のプレビュー
```

## テーマ切り替えについて

テーマはCSS変数と `data-theme` 属性で管理しています。初期テーマは `EnBloom Natural` です。

現在選択できるテーマは以下の5種類です。

1. EnBloom Natural
2. Sakura Bloom
3. Mint Bloom
4. Lavender Bloom
5. Night Bloom

`/settings` または `/onboarding` でテーマを変更できます。選択したテーマは `localStorage` に保存されます。将来的には Supabase の `user_preferences.theme` のようなカラムへ保存しやすいよう、テーマIDベースの構造にしています。

## 現在の実装範囲

- スマホファーストのSPAレイアウト
- 下部固定ナビゲーション
- トップ / ログイン / オンボーディング / ホーム / 探す / 詳細 / いいね / マッチ / DM / 自分のプロフィール / 設定 / 安全ガイド / 管理画面
- ダミーユーザーによるプロフィールカードUI
- ローカルstateのみのデモメッセージ送信
- Supabase接続用 `.env.example` とプレースホルダー設定

## 開発計画

詳細な開発計画は [`docs/development-plan.md`](docs/development-plan.md) を参照してください。

# EnBloom

**縁が、恋に咲く。**

EnBloom（エンブルーム）は、「縁が花開く」をテーマにしたマッチング Web アプリです。友達の紹介や信頼できるつながりを起点に、恋や縁が自然に花開く、安心感のある出会いの場を目指します。

EnBloomは、招待制・紹介制のマッチング体験に加えて、将来的には紹介者がひらく少人数の「ご縁会」機能も視野に入れています。

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

現在は **Phase 3後半：Supabase Auth / Googleログイン本実装の入口** です。Vite + React + TypeScript のSPA、Tailwind CSS、React Router、テーマ切り替え、localStorageデモ体験に加え、Supabase client、Googleログイン入口、Auth状態管理、`profiles` の作成・取得・更新を実装しています。

いいね、マッチ、DM、ブロック、通報、招待コード本検証、プロフィール画像Storage保存はまだlocalStorage / デモベースです。

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

Supabase Auth / profiles保存を使う場合は、`.env.local` またはVercelのEnvironment Variablesに以下のキーを設定してください。未設定でもアプリは落ちず、localStorageデモモードで動きます。

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

## Supabase Auth / Googleログイン設定

Googleログインを使うには、Supabase Dashboardの **Authentication > Providers** でGoogle Providerを有効化し、Google OAuth client ID / client secretを設定してください。

Supabase側には以下のようなリダイレクトURLを登録します。

```text
http://localhost:5173/auth/callback
https://your-vercel-preview.vercel.app/auth/callback
https://your-production-domain.example/auth/callback
```

Vercelへデプロイする場合は、Vercel側にも `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。

## 現在の実装範囲

- スマホファーストのSPAレイアウト
- 下部固定ナビゲーション
- トップ / ログイン / オンボーディング / ホーム / 探す / 詳細 / いいね / マッチ / DM / 自分のプロフィール / 設定 / 安全ガイド / 管理画面
- ダミーユーザーによるプロフィールカードUI
- ローカルstateのみのデモメッセージ送信
- Supabase client本実装（環境変数未設定時は `null` fallback）
- Supabase Auth状態管理とGoogleログイン入口
- `/auth/callback` のプロフィール有無判定
- `profiles` の作成・取得・更新
- localStorageデモとSupabaseモードの共存

## 開発計画

詳細な開発計画は [`docs/development-plan.md`](docs/development-plan.md) を参照してください。

関連する思想ドキュメント:

- [招待コード思想](docs/invite-code-concept.md)
- [ご縁会 / イベントマッチング構想](docs/event-matching-concept.md)

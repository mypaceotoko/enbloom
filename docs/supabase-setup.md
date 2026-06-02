# Supabaseセットアップ手順（Phase 3前半）

このドキュメントは、EnBloomをlocalStorageデモからSupabase本接続へ移行しやすくするための準備手順です。今回の範囲では、Googleログイン本実装・実DB保存への完全移行・課金・年齢確認/本人確認の本実装は行いません。

## 1. Supabaseプロジェクトを作成する

1. Supabase Dashboardで新しいProjectを作成します。
2. Region、Database password、Project nameを設定します。
3. Project作成完了後、Dashboardを開きます。

## 2. Project URL と anon public key を確認する

1. Dashboardの **Project Settings** を開きます。
2. **API** セクションで次を確認します。
   - Project URL
   - `anon` / `public` key
3. フロントエンドでは `service_role` key を使わないでください。

## 3. `.env.local` に環境変数を入れる

`.env.example` を参考に、ローカル開発用の `.env.local` を作成します。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

未設定の場合も、現在のアプリはlocalStorageデモとして動作し続けます。未設定時は `src/lib/supabase.ts` が `console.warn` を出すだけで、アプリを落としません。

## 4. SQL Editorで初期スキーマを実行する

1. Dashboardの **SQL Editor** を開きます。
2. `supabase/migrations/001_initial_schema.sql` の内容を貼り付けます。
3. 実行して、以下のテーブル・trigger・RLS policyが作成されることを確認します。

主なテーブル:

- `profiles`
- `invite_codes`
- `likes`
- `matches`
- `messages`
- `blocks`
- `reports`
- `profile_photos`
- `user_preferences`
- `introductions`
- `app_settings`

## 5. Authentication設定（今後の予定）

Google Providerは、次フェーズ以降で本実装します。現時点では以下をTODOとして残します。

- Authentication ProvidersでGoogleを有効化する
- Google OAuth client ID / client secretを設定する
- Redirect URLをVercel preview / production URLに合わせる
- 新規Authユーザー作成時に `profiles` を作成するtriggerまたはアプリ側処理を設計する

## 6. Storage設定（今後の予定）

プロフィール画像用bucketは、次フェーズ以降で作成します。

候補:

- Bucket名: `profile-photos`
- Public/Private: 初期はPrivateを推奨
- Storage path例: `{user_id}/{photo_id}.jpg`

Storage RLS / signed URL / 画像削除ポリシーは、本番接続時に別途設計します。

## 7. RLSの注意点

`supabase/migrations/001_initial_schema.sql` では全テーブルのRLSを有効化し、`auth.uid()` と `profiles.role = 'admin'` を基準にした初期ポリシーを定義しています。

注意点:

- `profiles` は本人・公開プロフィール・管理者が閲覧できる初期設計です。
- PostgreSQLのRLSだけでは列単位の公開範囲制御が難しいため、本番前に公開プロフィール用viewまたはRPCで公開カラムを絞ることを検討してください。
- `reports` は通報者本人の作成・閲覧と、管理者の全件閲覧/更新を想定しています。
- `app_settings` は認証済みユーザーが読み取り、管理者のみ作成/更新できる想定です。
- 管理者判定は `public.is_admin()` helper関数に集約しています。

## 8. 本番公開前に必要な確認

マッチングサービスとして本番公開する前に、少なくとも以下を確認してください。

- 年齢確認の要件と実装方針
- 本人確認の要件と実装方針
- 利用規約・プライバシーポリシー・特定商取引法などの法務確認
- 通報/ブロック/モデレーション運用
- 退会・データ削除フロー
- RLS policyの実データ検証
- Storage policyと画像削除フロー
- 管理者権限の付与/剥奪手順

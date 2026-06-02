# Supabaseセットアップ手順（Phase 3後半）

このドキュメントは、EnBloomをlocalStorageデモからSupabase本接続へ段階移行するためのセットアップ手順です。Phase 3後半では、Supabase client、Supabase Auth / Googleログイン、`profiles` の作成・取得・更新入口を追加しました。

> 重要: Supabase環境変数が未設定の場合、アプリは従来通りlocalStorageデモとして動作します。今回も `likes` / `matches` / `messages` / `blocks` / `reports` はまだlocalStorageベースです。

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

## 3. ローカルとVercelに環境変数を設定する

ローカル開発では `.env.local` を作成し、VercelではProject SettingsのEnvironment Variablesへ同じキーを設定します。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

未設定の場合も、アプリはlocalStorageデモとして動作し続けます。未設定時は `src/lib/supabase.ts` が `console.warn` を出すだけで、アプリを落としません。

## 4. SQL Editorで初期スキーマを実行する

1. Dashboardの **SQL Editor** を開きます。
2. `supabase/migrations/001_initial_schema.sql` のSQL全文をコピーして貼り付けます。SQL Editorにはファイルパスではなく、ファイルの中身そのものを貼ってください。
3. 実行して、以下のテーブル・trigger・RLS policyが作成されることを確認します。

SQL実行時の注意:

- 途中でエラーになった場合は、修正版の `supabase/migrations/001_initial_schema.sql` からSQL全文を貼り直し、全文を再実行してください。
- migrationは、テーブル作成後に `public.is_admin()` などのhelper関数とRLS policyを作る順番にしています。これにより、helper関数やpolicyが参照するテーブルが未作成の状態で評価されることを避けます。

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

## 5. Google Providerを有効化する

Phase 3後半から `/login` のGoogleログインボタンは、Supabase環境変数が設定されている場合に `supabase.auth.signInWithOAuth({ provider: 'google' })` を呼びます。

Supabase Dashboardで以下を設定してください。

1. **Authentication > Providers** を開きます。
2. **Google** を有効化します。
3. Google Cloud側で作成した OAuth client ID / client secret を設定します。
4. Supabase側のRedirect URL / Site URLをアプリURLに合わせます。

登録するリダイレクトURL例:

```text
http://localhost:5173/auth/callback
https://your-vercel-preview.vercel.app/auth/callback
https://your-production-domain.example/auth/callback
```

アプリ側は現在のoriginを使って `window.location.origin + "/auth/callback"` へ戻します。Vercel Previewを使う場合は、Preview URLもSupabaseの許可URLに追加してください。

## 6. 現在のSupabase接続範囲

Supabase環境変数が設定され、Googleログイン済みの場合のみ、以下がSupabaseに接続されます。

- Supabaseセッション取得・監視
- Googleログイン開始
- ログアウト
- `profiles` の作成・取得・更新
- オンボーディング完了状態の `profiles.onboarding_completed` 保存
- `/my-profile` のプロフィール更新

移行期間中のUI安定のため、プロフィールはSupabase保存後もlocalStorageの `currentUser` に反映します。

## 7. まだlocalStorageのままの機能

今回のPhase 3後半では以下をSupabaseへ移行していません。

- `likes`
- `matches`
- `messages`
- `blocks`
- `reports`
- `invite_codes` の本検証
- `profile_photos` のStorage保存
- 年齢確認 / 本人確認 / 課金 / 管理画面の本格DB連携

## 8. Storage設定（今後の予定）

プロフィール画像用bucketは、次フェーズ以降で作成します。

候補:

- Bucket名: `profile-photos`
- Public/Private: 初期はPrivateを推奨
- Storage path例: `{user_id}/{photo_id}.jpg`

Storage RLS / signed URL / 画像削除ポリシーは、本番接続時に別途設計します。

## 9. RLSの注意点

`supabase/migrations/001_initial_schema.sql` では全テーブルのRLSを有効化し、`auth.uid()` と `profiles.role = 'admin'` を基準にした初期ポリシーを定義しています。

注意点:

- `profiles` は本人・公開プロフィール・管理者が閲覧できる初期設計です。
- PostgreSQLのRLSだけでは列単位の公開範囲制御が難しいため、本番前に公開プロフィール用viewまたはRPCで公開カラムを絞ることを検討してください。
- `reports` は通報者本人の作成・閲覧と、管理者の全件閲覧/更新を想定しています。
- `app_settings` は認証済みユーザーが読み取り、管理者のみ作成/更新できる想定です。
- 管理者判定は `public.is_admin()` helper関数に集約しています。

## 10. 本番公開前に必要な確認

マッチングサービスとして本番公開する前に、少なくとも以下を確認してください。

- 年齢確認の要件と実装方針
- 本人確認の要件と実装方針
- 利用規約・プライバシーポリシー・特定商取引法などの法務確認
- 通報/ブロック/モデレーション運用
- 退会・データ削除フロー
- RLS policyの実データ検証
- Storage policyと画像削除フロー
- 管理者権限の付与/剥奪手順

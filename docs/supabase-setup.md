# Supabaseセットアップ手順（Phase 3後半）

このドキュメントは、ConnectBloomをlocalStorageデモからSupabase本接続へ段階移行するためのセットアップ手順です。Phase 3後半では、Supabase client、Supabase Auth / Googleログイン、`profiles` の作成・取得・更新入口を追加しました。

> 重要: Supabase環境変数が未設定の場合、アプリは従来通りlocalStorageデモとして動作します。今回も `likes` / `matches` / `messages` / `blocks` / `reports` はまだlocalStorageベースです。

## 1. Supabaseプロジェクトを作成する

1. Supabase Dashboardで新しいProjectを作成します。
2. Region、Database password、Project nameを設定します。
3. Project作成完了後、Dashboardを開きます。

## 2. Project URL と公開API keyを確認する

1. Dashboardの **Project Settings** を開きます。
2. **API** セクションで次を確認します。
   - Project URL（`https://your-project.supabase.co` 形式のproject base URL）
   - API Keys の **Publishable key / default**（旧表示では `anon` / `public` key）
3. フロントエンドでは `secret` key / `service_role` key を使わないでください。

`VITE_SUPABASE_URL` には、Data API URLではなくproject base URLだけを入れます。`https://your-project.supabase.co/rest/v1` のように `/rest/v1` が付いた値をコピーした場合は、必ず `/rest/v1` を削除してください。

## 3. ローカルとVercelに環境変数を設定する

ローカル開発では `.env.local` を作成し、VercelではProject SettingsのEnvironment Variablesへ同じキーを設定します。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-default-key
```

未設定の場合も、アプリはlocalStorageデモとして動作し続けます。未設定時は `src/lib/supabase.ts` が `console.warn` を出すだけで、アプリを落としません。

Vercelで本番確認する場合の注意:

- `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` は Vercel の **Production** 環境に設定してください。Previewだけに設定してもProductionには反映されません。
- Vercelの環境変数を追加・変更した後は、必ずProductionを **Redeploy** してください。既存のビルド成果物には新しい環境変数が入りません。
- `VITE_SUPABASE_URL` は `https://your-project.supabase.co` のproject base URLにしてください。Data API URLの `https://your-project.supabase.co/rest/v1` や末尾スラッシュ付きURLを設定している場合は、`/rest/v1` と余計なスラッシュを削除してください。
- `VITE_SUPABASE_ANON_KEY` には、Supabaseの新UIでは **Publishable key / default** を設定してください。Legacy `anon` keyを使う場合も、フロントエンド用の公開キーだけを使います。
- Googleログイン時にSupabase側で `No API key found in request` / `No apikey request header or url param was found` が出る場合は、`VITE_SUPABASE_URL` に `/rest/v1` が混ざっていないか、`VITE_SUPABASE_ANON_KEY` に先頭末尾の引用符や改行が混ざっていないか、Productionビルドへ環境変数が反映されているかを確認してください。
- `secret` key / `service_role` key は管理者権限を持つため、フロントエンドやVercelの公開クライアント用環境変数には絶対に入れないでください。

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

紹介制コネクトSNSとして本番公開する前に、少なくとも以下を確認してください。

- 年齢確認の要件と実装方針
- 本人確認の要件と実装方針
- 利用規約・プライバシーポリシー・特定商取引法などの法務確認
- 通報/ブロック/モデレーション運用
- 退会・データ削除フロー
- RLS policyの実データ検証
- Storage policyと画像削除フロー
- 管理者権限の付与/剥奪手順

## 11. Profile photos Storage bucket（プロフィール画像）

プロフィール画像アップロード機能では、Supabase Storage bucket と `profile_photos` テーブルを利用します。

### 推奨bucket

- Bucket名: `profile-photos`
- Public/Private: 初期実装は **Public bucket** 前提
- 画像上限: 5MB
- 許可MIME type: `image/jpeg`, `image/png`, `image/webp`
- アプリ内アップロードobject名: `{user_id}/main-{timestamp}.jpg|png|webp`
- public URL上の見え方: `/storage/v1/object/public/profile-photos/{user_id}/main-{timestamp}.jpg`

### SQL / migration

`supabase/migrations/011_profile_photos_storage.sql` を実行すると、以下を設定します。

1. `profile-photos` bucket を作成または更新
2. `profile_photos.updated_at` を追加
3. `profile_photos` の更新日時triggerを追加
4. 認証済みユーザーが公開プロフィールのprimary画像情報をselectできるRLSを再定義
5. Storage objectsについて、認証済みユーザーが閲覧でき、本人フォルダ配下だけupload/update/deleteできるpolicyを追加

`supabase/migrations/012_profile_photos_flow.sql` は、Storage upload後のDB保存に必要な `profile_photos` テーブルが存在しない環境でも復旧できるように、以下を冪等に保証します。

1. `public.profile_photos` テーブルを作成（存在する場合は維持）
2. 実装で利用するカラムを保証: `id`, `user_id`, `storage_path`, `position`, `is_primary`, `created_at`, `updated_at`
3. `user_id` は `public.profiles(id)` を参照し、プロフィール削除時に画像メタデータも削除
4. 1ユーザー1primary画像のunique indexと、`user_id, position` の並び順indexを作成
5. RLSを有効化し、認証済みユーザーは `profile_photos` をselect可能
6. 認証済みユーザーは自分の `profile_photos` のinsert/update/deleteが可能（adminはupdate/delete可能）

> 注意: 現在のアプリ実装では、表示順カラム名は `display_order` ではなく既存schemaに合わせて `position` を使います。Public bucketのURLは `storage_path` から取得できるため、`public_url` はDBへ保存せず、保存直後に個別取得してUIへ反映します。`profiles` テーブルにも `avatar_url` / `photo_url` / `profile_photo_url` カラムは存在しないため、プロフィール本体への画像URL更新は行いません。

### Dashboardで手動作成する場合

SQLでbucket作成が利用できない環境では、Supabase Dashboardで以下を設定してください。

1. **Storage** を開く
2. **New bucket** を選択
3. Bucket name に `profile-photos` を入力
4. **Public bucket** をON
5. File size limit を `5 MB` に設定
6. Allowed MIME types に `image/jpeg`, `image/png`, `image/webp` を設定
7. SQL Editorで `supabase/migrations/011_profile_photos_storage.sql` と `supabase/migrations/012_profile_photos_flow.sql` の該当部分を実行

### Private bucketに切り替える場合のメモ

将来的にPrivate bucketへ切り替える場合は、`src/lib/profilePhotoApi.ts` の public URL 生成を signed URL 生成に差し替えてください。signed URL全文はconsoleへ出力せず、期限を短くし、プロフィール一覧では `getPrimaryProfilePhotos(userIds)` のようなまとめ取得でURL生成回数を抑える方針です。

### localStorageデモとの共存

Supabase未接続・未ログイン時は画像アップロードを実行せず、`/my-profile` に「Supabase接続時に利用できます」と表示します。既存のlocalStorageデモプロフィール編集・イニシャル表示は維持します。

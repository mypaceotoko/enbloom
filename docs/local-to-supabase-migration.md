# localStorageからSupabaseへの移行計画

ConnectBloomは、localStorageのデモ体験を壊さず、機能単位でSupabaseへ段階移行します。Phase 3後半では、Supabase Auth / Googleログイン入口と `profiles` 接続を追加しました。

## 現在のlocalStorage管理項目と対応先

| localStorage項目 | 内容 | Supabase対応先 | Phase 3後半の状態 |
| --- | --- | --- | --- |
| `currentUser` | 現在のデモユーザー | `auth.users` + `profiles` | Supabaseログイン時は `profiles` と併用 |
| `onboardingCompleted` | オンボーディング完了状態 | `profiles.onboarding_completed` | Supabaseログイン時はDB保存 |
| `likedUserIds` | 自分が送った話してみたい | `likes.from_user_id` / `likes.to_user_id` | まだlocalStorage |
| `receivedLikeUserIds` | 受け取った話してみたい | `likes` | まだlocalStorage |
| `matchedUserIds` | 成立済みコネクト | `matches` | まだlocalStorage |
| `messagesByMatchId` | コネクトごとの会話 | `messages` | まだlocalStorage |
| `blockedUserIds` | ブロックしたユーザー | `blocks` | まだlocalStorage |
| `reportedUserIds` | 通報したユーザー | `reports` | まだlocalStorage |
| `themePreference` | テーマ設定 | `user_preferences.theme` | まだlocalStorage |

## 現在のモード判定

- `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` の両方がある場合: Supabaseモード
- どちらかが未設定の場合: localStorageデモモード

Supabaseモードでも未ログイン状態では、既存のデモ導線を維持します。ログイン後の `profiles` 保存・取得・更新はSupabaseを使い、表示安定のためlocalStorageにも反映します。

## 推奨移行順序

### 1. Authを導入する（完了）

- `@supabase/supabase-js` を導入します。
- Supabase clientを環境変数が揃った場合だけ生成します。
- `AuthProvider` で `getSession()` と `onAuthStateChange()` を管理します。
- Google Providerを有効化し、`/auth/callback` をRedirect URLに登録します。

### 2. profilesを接続する（Phase 3後半で入口実装）

- オンボーディング保存先を `profiles` に切り替えます。
- `/my-profile` から `profiles` を取得・更新します。
- `ensureProfileForUser()` により、Googleログイン直後にプロフィール未作成なら最小レコードを作成します。

### 3. user_preferencesを接続する

- `themePreference` を `user_preferences.theme` に移します。
- Supabase未設定時はlocalStorage fallbackを維持します。

### 4. likes / matches / messagesを接続する

- 話してみたい送信を `likes` に保存します。
- 相互話してみたい判定後に `matches` を作成します。
- 会話を `messages` に保存します。
- 既存のコネクト演出と会話デモUIは保ちます。

### 5. blocks / reports / adminを接続する

- ブロックを `blocks` に保存します。
- 通報を `reports` に保存します。
- 管理画面は `reports` と `profiles.role` を基準に段階的に実装します。

## 実装方針

- Supabase未設定時はlocalStorageデモを継続します。
- Supabase接続済みでも、機能単位で段階的に切り替えます。
- データアクセスは `src/lib/profileApi.ts` のようなhelper層へ寄せます。
- RLS検証が完了するまで、本番データ投入は避けます。

## 既知のTODO

- 公開プロフィール用viewまたはRPCで公開カラムを制限する
- `profiles` 自動作成をDB triggerに寄せるか、アプリ側 `ensureProfileForUser()` 継続にするか決める
- Google Provider設定とredirect URLを環境別に整理する
- likes / matches / messages / blocks / reportsをSupabaseへ移行する
- Storage bucketと画像RLSを設計する
- 年齢確認/本人確認/法務確認を本番前に完了する

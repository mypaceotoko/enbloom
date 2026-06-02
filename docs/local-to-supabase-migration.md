# localStorageからSupabaseへの移行計画

EnBloom Phase 2前半では、localStorageで仮のアプリ体験を維持しています。Phase 3以降では、この体験を壊さず、段階的にSupabaseへ置き換えます。

## 現在のlocalStorage管理項目と対応先

| localStorage項目 | 内容 | Supabase対応先 |
| --- | --- | --- |
| `currentUser` | 現在のデモユーザー | `auth.users` + `profiles` |
| `onboardingCompleted` | オンボーディング完了状態 | `profiles.onboarding_completed` |
| `likedUserIds` | 自分が送ったいいね | `likes.from_user_id` / `likes.to_user_id` |
| `receivedLikeUserIds` | 受け取ったいいね | `likes` |
| `matchedUserIds` | 成立済みマッチ | `matches` |
| `messagesByMatchId` | マッチごとのDM | `messages` |
| `blockedUserIds` | ブロックしたユーザー | `blocks` |
| `reportedUserIds` | 通報したユーザー | `reports` |
| `themePreference` | テーマ設定 | `user_preferences.theme` |

## 推奨移行順序

### 1. Authを導入する

- Supabase Authを導入します。
- まずはメールリンクまたは開発用ログインで検証し、Google Providerは後続で本実装します。
- Authユーザー作成時に `profiles` を作成する流れを決めます。

### 2. profilesを接続する

- オンボーディング保存先を `profiles` に切り替えます。
- `currentUser` のデモ型と `profiles` のカラム対応を整理します。
- UIは既存トーンを維持し、保存先だけ段階的に差し替えます。

### 3. user_preferencesを接続する

- `themePreference` を `user_preferences.theme` に移します。
- Supabase未設定時はlocalStorage fallbackを維持します。

### 4. likes / matches / messagesを接続する

- いいね送信を `likes` に保存します。
- 相互いいね判定後に `matches` を作成します。
- DMを `messages` に保存します。
- 既存のマッチ演出とDMデモUIは保ちます。

### 5. blocks / reports / adminを接続する

- ブロックを `blocks` に保存します。
- 通報を `reports` に保存します。
- 管理画面は `reports` と `profiles.role` を基準に段階的に実装します。

## 実装方針

- Supabase未設定時はlocalStorageデモを継続します。
- Supabase接続済みでも、機能単位で段階的に切り替えます。
- データアクセスは直接コンポーネントに書かず、将来的にrepository/service層へ寄せます。
- RLS検証が完了するまで、本番データ投入は避けます。

## 既知のTODO

- 公開プロフィール用viewまたはRPCで公開カラムを制限する
- Authユーザー作成時の `profiles` 自動作成方法を決める
- Google Provider設定とredirect URLを環境別に整理する
- Storage bucketと画像RLSを設計する
- 年齢確認/本人確認/法務確認を本番前に完了する

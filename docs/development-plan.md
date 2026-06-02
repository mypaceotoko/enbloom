# EnBloom 開発計画

## 1. リポジトリ現状

このリポジトリは、現時点ではほぼ初期状態です。

- 現在存在する実体ファイルは `.gitkeep` のみです。
- React / Vite / TypeScript / Tailwind CSS に関する設定ファイルやソースコードはまだありません。
- Supabase に関するクライアント設定、DB マイグレーション、Storage 設定、RLS ポリシー定義もまだありません。
- 既存実装への影響を気にせず、新規開発として安全に開始できます。

## 2. アプリ概要

| 項目 | 内容 |
| --- | --- |
| アプリ名 | EnBloom |
| 読み方 | エンブルーム |
| 意味 | 縁が花開く |
| キャッチコピー | 縁が、恋に咲く。 |

### コンセプト

EnBloom は、友達の紹介や信頼できるつながりから、恋や縁が花開くマッチング Web アプリです。

一般的な大量スワイプ型のマッチングアプリではなく、紹介・信頼・出会いの温度感・今日のご縁を重視した、安心感のある出会いの場を目指します。

## 3. 推奨技術構成

### 初期構成で採用予定の技術

- React
- TypeScript
- Vite
- SPA
- Tailwind CSS
- React Router
- Supabase Auth
- Supabase Database
- Supabase Storage
- Supabase Row Level Security
- Vercel
- GitHub 連携

### 将来的に検討するライブラリ・機能

- `@supabase/supabase-js`
- `zod` または `valibot`
- `react-hook-form`
- `date-fns`
- `lucide-react`
- `clsx`
- `tailwind-merge`
- `i18next` または `react-intl`
- `vite-plugin-pwa`

## 4. MVP 機能一覧

最初の MVP では、以下の機能を作成します。

1. Google ログイン
2. 招待コード制
3. プロフィール作成
4. 今日のご縁
5. ユーザー一覧
6. プロフィール詳細
7. いいね
8. 相互いいねによるマッチ
9. マッチ後 DM
10. ブロック
11. 通報
12. テーマカラー切り替えの土台
13. 管理画面の土台

## 5. 将来的な機能

招待コード思想とご縁会構想の詳細は、以下のドキュメントを参照してください。

- 招待コード思想: [docs/invite-code-concept.md](./invite-code-concept.md)
- ご縁会構想: [docs/event-matching-concept.md](./event-matching-concept.md)

- 年齢確認
- 本人確認
- Apple ログイン
- 日本語 / 英語切り替え
- AI プロフィール補助
- 初回メッセージテンプレート
- 共通点ハイライト
- 紹介者コメント
- 紹介者ごとの参加者一覧
- ご縁会 / Bloom Meet / EnBloom Circle などの少人数イベント
- イベント後の「また話したい」によるマッチング
- 通知
- PWA 対応
- ネイティブアプリ化
- 課金機能
- App Store / Google Play 展開

## 6. 画面構成

### `/`

- トップページ
- コンセプト紹介
- キャッチコピー
- ログイン導線
- 招待制の説明

### `/login`

- Google ログイン
- 招待コード入力

### `/onboarding`

- 初回プロフィール作成
- 写真登録
- 出会いの温度感設定
- テーマ選択

### `/home`

- 今日のご縁
- 少人数のおすすめ表示
- マッチ・未読メッセージ導線

### `/discover`

- ユーザー一覧
- 条件検索
- 趣味タグ検索

### `/profile/:id`

- 相手プロフィール
- いいね
- ブロック
- 通報
- 共通点
- 出会いの温度感

### `/likes`

- もらったいいね
- 送ったいいね

### `/matches`

- マッチ一覧

### `/messages/:matchId`

- DM

### `/my-profile`

- 自分のプロフィール確認・編集

### `/settings`

- テーマカラー変更
- 言語設定
- 通知設定
- 紹介者表示設定
- アカウント設定

### `/safety`

- 安全ガイド
- 通報・ブロック説明
- 個人情報保護の注意

### `/admin`

- 管理画面
- ユーザー管理
- 招待コード管理
- 通報管理

## 7. デザイン・テーマカラー設計

基本テーマは Pattern A「Gentle Trust / やさしい信頼感タイプ」です。

### デフォルトカラーパレット

| 色 | HEX |
| --- | --- |
| Green | `#6DBE8A` |
| Dark Green | `#3E7C59` |
| Pink | `#F48CA8` |
| Light Pink | `#FDE7EE` |
| Background | `#FFFDF9` |
| Text | `#2F3A34` |

### CSS 変数でテーマ管理する方針

```css
:root {
  --color-main: #6DBE8A;
  --color-main-dark: #3E7C59;
  --color-accent: #F48CA8;
  --color-accent-soft: #FDE7EE;
  --color-bg: #FFFDF9;
  --color-card: #FFFFFF;
  --color-text: #2F3A34;
  --color-muted: #7A8A80;
}
```

### 将来的にユーザーが選べるテーマ

1. EnBloom Natural
2. Sakura Bloom
3. Mint Bloom
4. Lavender Bloom
5. Night Bloom

## 8. Supabase DB 設計案

| テーブル | 用途 | 主なカラム | 初期実装で必要な範囲 |
| --- | --- | --- | --- |
| `profiles` | ユーザーの基本プロフィールを管理する | `id`, `user_id`, `display_name`, `birthdate`, `gender`, `bio`, `interests`, `temperature`, `theme`, `created_at`, `updated_at` | オンボーディング、ユーザー一覧、プロフィール詳細に必要な基本情報を実装する |
| `invite_codes` | 招待コードと利用状況を管理する | `id`, `code`, `created_by`, `used_count`, `max_uses`, `expires_at`, `created_at` | 使い切りチケットではなく、紹介者に紐づく参加ルートとして扱う。`max_uses = null` は無制限利用とする |
| `likes` | いいねの送受信を管理する | `id`, `from_user_id`, `to_user_id`, `created_at` | 重複いいねを防ぎ、相互いいね検出の基礎にする |
| `matches` | 相互いいねで成立したマッチを管理する | `id`, `user_a_id`, `user_b_id`, `created_at`, `last_message_at` | マッチ一覧と DM の参加者判定に利用する |
| `messages` | マッチ後の DM を管理する | `id`, `match_id`, `sender_id`, `body`, `read_at`, `created_at` | マッチ参加者間のテキストメッセージ送受信を実装する |
| `blocks` | ブロック関係を管理する | `id`, `blocker_id`, `blocked_id`, `created_at` | 一覧、詳細、今日のご縁からブロック済みユーザーを除外する |
| `reports` | 通報内容を管理する | `id`, `reporter_id`, `reported_user_id`, `reason`, `detail`, `status`, `created_at`, `resolved_at` | 通報作成と管理画面での確認に必要な最低限を実装する |
| `profile_photos` | プロフィール写真のメタデータを管理する | `id`, `user_id`, `storage_path`, `display_order`, `created_at` | 写真登録、プロフィール表示、Storage 参照に利用する |
| `user_preferences` | ユーザーの検索条件や表示設定を管理する | `id`, `user_id`, `preferred_age_min`, `preferred_age_max`, `preferred_gender`, `language`, `notifications_enabled`, `created_at`, `updated_at` | 今日のご縁、条件検索、設定画面の土台にする |
| `introductions` | 紹介者や紹介コメントを管理する | `id`, `introducer_id`, `introduced_user_id`, `comment`, `visibility`, `created_at` | 初期 MVP では任意。招待制、紹介者コメント、紹介者イベントの将来拡張を見据えて設計する |
| `app_settings` | アプリ全体の設定や管理値を管理する | `id`, `key`, `value`, `updated_at` | 管理画面、テーマ、運用設定の将来拡張を見据えた土台にする |

## 9. RLS 方針

- 全テーブルで Supabase Row Level Security を有効化します。
- `auth.uid()` を基準にアクセス制御します。
- DM はマッチ参加者のみ閲覧・送信可能にします。
- 通報内容は通報者本人と管理者のみ閲覧可能にします。
- ブロック済みユーザーは、ユーザー一覧・プロフィール詳細・今日のご縁から除外します。
- Storage のプロフィール写真も所有者単位で制御します。
- 管理画面向けの操作は、管理者ロールまたは管理者用プロファイル属性を前提に別途ポリシーを設計します。

## 10. 実装フェーズ

### Phase 0：計画・基盤

- 開発計画ドキュメント
- README 概要
- 技術スタック確定
- ディレクトリ設計

### Phase 1：フロントエンド基盤

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- 共通レイアウト
- テーマ CSS 変数
- モバイルファースト UI

### Phase 2：Supabase 基盤

- Supabase クライアント設定
- Auth 設定
- DB マイグレーション
- Storage bucket 設計
- RLS 有効化

### Phase 3：認証・招待・オンボーディング

- Google ログイン
- 招待コード入力
- プロフィール作成
- 写真登録
- 初期設定

### Phase 4：出会い体験

- 今日のご縁
- ユーザー一覧
- プロフィール詳細
- いいね
- 相互いいねによるマッチ

### Phase 5：DM・安全機能

- マッチ一覧
- DM
- ブロック
- 通報
- Safety ページ

### Phase 6：管理画面・運用準備

- 招待コード管理
- ユーザー管理
- 通報管理
- 利用規約
- プライバシーポリシー
- 法務レビュー前提の公開準備

### Phase 7：将来拡張

- 紹介者ごとの参加者一覧
- ご縁会 / Bloom Meet / EnBloom Circle などの少人数イベント
- イベント後の「また話したい」によるマッチング
- 年齢確認
- 本人確認
- Apple ログイン
- i18n
- 通知
- PWA
- 課金
- ネイティブアプリ展開

## 11. 安全面・法務面の注意

EnBloom は恋愛・出会いを目的とするサービスであるため、本格公開前に必ず法務確認が必要です。

特に、以下の観点を事前に確認・設計する必要があります。

- インターネット異性紹介事業への該当性
- 年齢確認の義務
- 本人確認の必要性
- 未成年保護
- 通報・ブロック対応体制
- 不適切ユーザーへの対応フロー
- 利用規約
- プライバシーポリシー
- 個人情報保護法対応
- 写真・メッセージ等の保存方針
- 退会・データ削除方針
- App Store / Google Play の出会い系・UGC 関連ポリシー

## 12. 次回 Codex に依頼するべき具体タスク

次回は Phase 1 として、Vite + React + TypeScript + Tailwind CSS の初期構成を作成することを推奨します。

具体的には、以下を依頼するとスムーズです。

- Vite + React + TypeScript のプロジェクト初期化
- Tailwind CSS の導入
- React Router の導入
- 基本ディレクトリ構成の作成
- 共通レイアウトの土台作成
- テーマ CSS 変数の定義
- モバイルファーストなトップページの仮実装

## 13. 招待コード・ご縁会構想の参照

EnBloom の招待コードは、単なる入場券ではなく「誰のご縁から来たかを記録する参加ルート」として扱います。詳細は [招待コード思想](./invite-code-concept.md) を参照してください。

また、将来的には紹介者がひらく少人数の安心できる出会いの場として、[ご縁会 / イベントマッチング構想](./event-matching-concept.md) を検討します。現時点ではイベント作成、決済、チケット販売、大規模街コン運営、ご縁会の本番運用は実装しません。


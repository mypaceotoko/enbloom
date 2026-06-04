# ConnectBloom Development Plan

## 現在の方向性

ConnectBloom は、紹介制・招待制の **コネクト SNS** として開発します。

主目的は、活動・興味・共創・紹介によるつながりです。恋愛・交際を主目的にせず、性別で相手を探す設計にも寄せません。

## Phase 1: ピボット第一弾（今回）

目的は、既存機能を壊さずに、文言・プロフィール項目・発見軸・世界観を大きく変えることです。

実施内容:

- LandingPage を紹介制コネクト SNS に変更。
- UI 文言を「話してみたい」「コネクト」「今日のつながり」へ変更。
- `/onboarding` と `/my-profile` を活動・興味ベースへ変更。
- 活動ジャンル / 興味タグを刷新。
- `/home` `/discover` `/likes` `/matches` `/messages` の表現を更新。
- 緑を少し強め、ピンクはアクセントとして残す。
- docs にピボット方針、招待コード思想、ご縁会、募集ボード構想を保存。

## 維持する既存機能

- Googleログイン
- Supabase Auth
- profiles保存
- `/auth/callback`
- `/onboarding`
- 招待コード入力
- invite code RPC
- `/admin` の招待コード発行
- `/settings` から招待コード管理への導線
- 招待コード削除 / 無効化
- likes の Supabase 保存
- matches の Supabase 保存
- messages の Supabase 保存
- blocks / reports の Supabase 保存
- `/blocked-users` のブロック解除
- `/admin` の通報管理
- `/admin` のアコーディオン UI
- `/admin` の管理メモ保存
- `/admin` のアーカイブ UI
- `/home` `/discover` `/likes` `/matches` `/messages` の既存表示
- `/my-profile` 編集
- localStorage デモとの共存
- ThemeProvider
- AppStateProvider
- AuthProvider
- Vercel環境変数対応
- `vercel.json` の SPA 対応

## 内部名の扱い

第一弾では、`likes` / `matches` / `messages` などの内部 DB 名や関数名は維持します。UI 上では以下のように表示します。

- likes: 話してみたい
- matches: コネクト
- messages: 会話
- dating_temperature: つながり方のスタンス
- location: 活動エリア

## Phase 2: 活動プロフィールの強化

将来的に検討する内容:

- 「一緒にやりたいこと」「話したいテーマ」を専用カラム化するか検討。
- 活動ジャンルと興味タグを分けるか検討。
- 紹介ルートや招待者情報の見せ方を改善。
- 性別検索や恋愛対象項目は置かない方針を継続。

## Phase 3: 募集ボード（将来構想）

募集ボードは、ユーザーが「一緒にやりたいこと」「探している仲間」「参加してほしい活動」を投稿できる場所です。

投稿例:

- AIアプリを一緒に作りたい
- ラジオにゲストで出てくれる人募集
- 怪談イベントに一緒に行きたい
- 映画を一緒に観て語りたい
- ダンス練習仲間募集
- ブログ作業会をしたい
- ゲーム制作仲間募集
- 週末に面白いイベントに行きたい
- 海外好きで話せる人とつながりたい
- 好きな漫画について語りたい

将来的には、募集投稿に対して「参加したい」「話してみたい」を送れるようにし、相互に OK なら会話できる構想にします。

今回は実装しません。

## Phase 4: ご縁会 / ConnectBloom Circle

ご縁会は、紹介者がひらく少人数の活動交流会です。

例:

- AI開発好きの会
- ラジオ配信者交流会
- 怪談好きの会
- ダンス仲間の会
- ブログ作業会
- 映画を語る会
- ゲーム制作会
- 地域交流会

今回は実装しません。

## 法務・安全確認

ConnectBloom は活動・興味・共創・紹介を主目的とします。以下の方針を明確にします。

- 恋愛・交際を主目的にしない。
- 異性紹介を目的にしない。
- 性別で相手を探す設計にしない。
- 恋愛対象や結婚願望の項目を置かない。
- サービスの主目的は、活動・興味・共創・紹介によるつながりである。
- ユーザーに見える安全関連の案内は「安心ガイド」と呼び、活動・趣味・共創を安心して進めるためのルールとヒントをまとめる。

ただし、法的判断は別途専門家確認が必要です。公開前に、利用規約、プライバシーポリシー、本人確認・年齢確認要否、各種法令への該当性を確認してください。

## 募集ボード Phase 1

- 募集ボードをConnectBloomの主力機能として追加する。
- 軸は活動・興味・共創であり、ユーザーが一緒にやりたいこと、話したいテーマ、探している仲間を投稿できるようにする。
- 第一弾の実装範囲は、募集投稿の作成、一覧表示、詳細表示、参加したいボタンまでとする。
- Supabaseには `activity_posts` と `activity_post_interests` を追加し、RLSで投稿者、参加希望者、admin の権限を分離する。
- localStorageデモ環境では `mockActivityPosts` によって一覧・詳細を表示し、投稿作成と参加したい保存はSupabaseログイン時のみ有効にする。
- 次フェーズでは、参加希望者管理、投稿者による承認、会話連携を検討する。コメント、通知、リアルタイム更新、決済、参加者一覧公開は別フェーズとする。

## 募集ボード Phase 2

- 募集詳細 `/board/:postId` に、投稿者向けの「参加希望者」セクションを追加する。
- 投稿者は、この募集に興味を持っている人のプロフィール概要、参加希望メッセージ、参加希望日時、ステータスを確認できる。
- `activity_post_interests.status` は `interested`（参加希望中）、`accepted`（承認済み）、`declined`（見送り）、`cancelled`（参加希望を取り消し）として扱う。
- 投稿者は参加希望中の依頼を承認 / 見送りでき、参加希望者本人は自分の参加希望を取り消しできる。
- 一覧 `/board` では自分の募集に「自分の募集」「参加希望 〇件」「管理する」を表示し、詳細ページへ誘導する。
- 作成後は募集詳細へ遷移する方針を継続する。
- Supabase未接続・未ログイン時はlocalStorageデモを壊さず、参加希望者管理はSupabaseログイン時に利用できる旨を表示する。
- RLSは投稿者、参加希望者本人、admin の閲覧 / 更新権限を補強し、承認後の会話連携は次フェーズで検討する。
- この機能は活動・興味・共創のための管理であり、恋愛目的の導線にはしない。

## 募集ボード Phase 3: 募集管理と参加管理

- `/my-board` を追加し、投稿者が自分の募集、参加希望数、承認済み数、ステータスを確認できるようにする。
- `/my-board` では募集の詳細確認、管理導線、締切、再開、削除を提供する。参加希望がない募集は完全削除し、参加希望がある募集は `archived` に更新する。
- `/my-interests` を追加し、参加希望者が自分の送った参加希望、投稿者名、募集情報、参加希望ステータス、参加希望日時を確認・取り消しできるようにする。
- `/board/:postId` の投稿者向け「参加希望者」セクションを、ステータス別の表示と承認 / 見送り操作に整理する。
- API helper は `getMyActivityPosts`、`getMyInterestedPosts`、`getActivityPostInterestsForOwner`、`updateActivityPostInterestStatus`、`acceptActivityPostInterest`、`declineActivityPostInterest`、`cancelActivityPostInterest`、`closeActivityPost`、`reopenActivityPost`、`archiveActivityPost`、`deleteActivityPost`、`getActivityPostStats` を管理導線向けに整理する。
- RLS は、投稿者が自分の募集を select/update/delete でき、参加希望者本人が自分の参加希望を select/update でき、投稿者が届いた参加希望を select/update できる状態を維持・補強する。
- 承認後の会話導線は既存DMに接続できる場合のみ接続し、整理が必要な場合は次フェーズで設計する。
- Supabase未接続・未ログイン時はlocalStorageデモを壊さず、ログインすると管理できる案内を表示する。

## 募集ボード Phase 4: 募集内容の編集

- `/board/:postId/edit` を追加し、投稿後の募集内容を編集できるようにする。
- 編集できるのは投稿者本人またはadminのみとし、それ以外のユーザーには権限がない旨と募集詳細へ戻る導線を表示する。
- 編集項目は title、body、category、location、tags、capacity、scheduled_at、mode、status とし、DB保存時は `area` / `max_participants` など既存カラムへ丁寧に変換する。
- 参加希望が届いている募集では、内容が大きく変わりすぎないよう注意文言を表示する。
- `/my-board` と `/board/:postId` から編集ページへの導線を追加し、締切 / 再開 / 削除 / 編集が一通り管理できる状態にする。
- API helper は `updateActivityPost` と `canEditActivityPost` を追加し、投稿者本人またはadminかを確認してから編集を進める。
- Supabase未接続・未ログイン時はlocalStorageデモを維持し、ログインすると自分の募集を編集できる案内のみ表示する。
- RLSは既存のowner/admin更新権限を維持しつつ、`created_by` の書き換え防止と status / mode の制約を migration で補強する。

## ルーム機能 Phase 1

- `/rooms` で公式ルーム一覧を表示し、Supabase未接続・未ログイン時はローカルデモの2ルームを表示する。
- `/rooms/:roomId` でルーム詳細とチャットを表示し、未ログイン時の送信はログイン案内に留める。
- Supabaseには `chat_rooms` と `chat_room_messages` を追加し、公式ルームの閲覧・投稿と管理者操作をRLSで制御する。
- ルーム詳細の「この会話から募集を作る」から `/board/new?roomId=<slug>` へ遷移し、募集作成時に対応する `chat_rooms.id` を `activity_posts.room_id` に保存する。
- 募集詳細では `room_id` がある場合に「この募集は〇〇ルームから生まれました」と表示する。
- BottomNavは「ホーム / 探す / 募集 / ルーム / 設定」に変更し、既存の `/matches` やコネクト機能は削除しない。

## 通知センター Phase 1

- `/notifications` を追加し、未読件数、通知一覧、空状態、すべて既読、個別既読、関連ページへの遷移を提供する。
- `public.notifications` テーブルを追加し、`activity_interest_received`、`activity_interest_accepted`、`direct_message_received` の3種類から開始する。
- RLSは本人のみselect/update/deleteできる設計にし、通知作成は `public.create_notification` SECURITY DEFINER RPC 経由にする。
- 募集への参加希望送信時、参加希望承認時、DM送信時に通知作成を試みる。ただし通知作成だけ失敗した場合、本体処理は失敗扱いにしない。
- `/settings` から通知センターへ遷移できるカードを追加し、可能な範囲で未読件数を表示する。
- Phase 1はアプリ内通知のみ。プッシュ通知、メール通知、リアルタイム通知、通知設定の細分化は今後の拡張として扱う。

## 通知センター Phase 1.5 / マイアクティビティ

- 通知センター Phase 1.5 では、未読通知件数・通知タイプラベル・既読導線を強化し、参加希望・承認・メッセージの反応に気づきやすくする。
- `/my-activity` を追加し、通知・自分の募集・参加希望した募集・会話/コネクト・ルームへの導線をまとめて確認できる場所にする。
- `/home` と `/settings` から通知・募集・参加希望・会話導線へ迷わず移動できるようにし、活動管理をスマホ表示で見やすいカードUIに整理する。
- プッシュ通知、メール通知、リアルタイム通知、通知設定の細分化、ルームメッセージ通知は今後の拡張として扱う。

## 募集参加承認後DM導線の仕様整理

- 通常の相互「話してみたい」で成立したコネクトは、従来通り1対1DMを利用できる。
- `activity_post_interests.status = accepted` になった募集参加希望は、相互「話してみたい」がなくても、その募集に関する1対1DMを開始できる。
- DM作成時は既存の `matches` レコードを再利用し、同じ2人の会話を重複作成しない。ユーザーA/Bの順序が逆でも同じ会話として扱う。
- 募集作成者または参加者のどちらかが相手をブロックしている場合、会話作成・送信は不可とする。
- 募集ごとのグループチャット、リアルタイム通知、プッシュ通知、メール通知は今後の拡張として扱う。

## テスター投入前チェックリストページ Phase 1

- テスター投入前に `/test-guide` を追加し、ログイン、プロフィール、ルーム、募集、参加希望、承認後DM、通知、安心機能の確認導線をまとめる。
- `/settings` からテスターガイドへ移動できる導線を追加し、少人数テスターが試してほしい流れをアプリ内で確認できるようにする。

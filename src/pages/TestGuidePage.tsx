import {
  Bell,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  Flag,
  HeartHandshake,
  LogIn,
  PlusCircle,
  Search,
  Send,
  ShieldCheck,
  ShieldMinus,
  UserRound,
} from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const testerGuideItems = [
  {
    icon: ClipboardCheck,
    title: '招待コードで参加する',
    body: 'ログイン画面で招待コードを入力してからGoogleログインへ進みます。参加後はプロフィールを整えて、今日のつながりを確認します。',
    checkpoints: ['招待コードを入力できる', '参加完了の案内が分かる'],
  },
  {
    icon: LogIn,
    title: 'Googleログインする',
    body: 'GoogleログインでConnectBloomに入ります。ホームへ進めるか確認します。',
    checkpoints: ['ログインできる', 'ホームに戻れる'],
  },
  {
    icon: UserRound,
    title: 'プロフィールを整える',
    body: '自己紹介や興味タグを入力します。保存後の表示も確認します。',
    checkpoints: ['プロフィールを保存できる', '興味タグを選べる'],
  },
  {
    icon: HeartHandshake,
    title: '今日のつながりを見る',
    body: 'ホームで紹介から始まるつながりを確認します。表示内容を見ます。',
    checkpoints: ['今日のつながりが見える', 'カードの内容が分かる'],
  },
  {
    icon: Search,
    title: '人を探す',
    body: '人を探す画面へ進みます。気になるプロフィールを開きます。',
    checkpoints: ['一覧を見られる', 'プロフィール詳細を開ける'],
  },
  {
    icon: Send,
    title: '話してみたいを送る',
    body: 'プロフィールから話してみたいを送ります。送った後の状態を確認します。',
    checkpoints: ['送信できる', '送信済みが分かる'],
  },
  {
    icon: ClipboardList,
    title: '募集ボードを見る',
    body: '募集ボードを開きます。募集の内容と詳細画面を確認します。',
    checkpoints: ['募集一覧が見える', '募集詳細を開ける'],
  },
  {
    icon: PlusCircle,
    title: '募集を作る',
    body: '一緒にやりたいことを募集として作成します。投稿後の表示を確認します。',
    checkpoints: ['募集を作成できる', '自分の募集に表示される'],
  },
  {
    icon: HeartHandshake,
    title: '参加希望を送る',
    body: '気になる募集へ参加希望を送ります。送信後の状態を確認します。',
    checkpoints: ['参加希望を送れる', '送った募集を確認できる'],
  },
  {
    icon: CheckCircle2,
    title: '承認されたら会話する',
    body: '参加希望が承認された後、会話へ進みます。募集由来の会話か確認します。',
    checkpoints: ['承認後の導線が分かる', '会話画面に入れる'],
  },
  {
    icon: DoorOpen,
    title: 'ルームで話す',
    body: 'ルーム一覧から入り、メッセージを投稿します。表示も確認します。',
    checkpoints: ['ルーム詳細に入れる', 'メッセージを送信できる'],
  },
  {
    icon: PlusCircle,
    title: 'ルームから募集を作る',
    body: 'ルームの流れから募集作成へ進みます。作成後の戻り方も確認します。',
    checkpoints: ['募集作成へ進める', '作成後の表示が分かる'],
  },
  {
    icon: Bell,
    title: '通知を確認する',
    body: '通知画面で参加希望、承認、メッセージの新着を確認します。',
    checkpoints: ['通知が見える', '関連ページへ移動できる'],
  },
  {
    icon: ShieldCheck,
    title: '安心ガイドを見る',
    body: '安心ガイドを開きます。テスター向けに伝わる内容か確認します。',
    checkpoints: ['安心ガイドを読める', '設定からも開ける'],
  },
  {
    icon: ShieldMinus,
    title: 'ブロック / 通報導線を確認する',
    body: 'プロフィールや会話で、ブロックと通報の導線が分かるか確認します。',
    checkpoints: ['ブロック導線が分かる', '通報導線が分かる'],
  },
];

const testNotes = [
  'ConnectBloomは現在、招待制のβ版です。',
  '招待コードを受け取ったら、ログイン画面でコードを入力してからGoogleログインへ進んでください。',
  '参加後は、プロフィールを整えてから今日のつながりを確認できます。',
  '表示崩れや予期しないエラーが起きる可能性があります。',
  '気づいた点は、スクリーンショットと一緒に共有してください。',
  '住所・勤務先・電話番号・金融情報など、重要な個人情報は入力しないでください。',
];

const feedbackPoints = [
  'どの画面で起きたか',
  '何を押した時に起きたか',
  '期待していた動き',
  '実際に起きたこと',
  '表示されたエラー文',
  'スクリーンショット',
  '操作に迷ったところ',
  '文言が分かりづらかったところ',
  'ボタンが大きすぎる / 小さすぎるところ',
  'スクロールしづらかったところ',
];

export function TestGuidePage() {
  return (
    <PageShell description="ConnectBloomを試すときに、確認してほしい流れをまとめています。" eyebrow="TESTER GUIDE" title="テスターガイド">
      <div className="space-y-3">
        <Card className="space-y-3 border-theme-main/15 bg-theme-accent-soft/70 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">For testers</p>
            <h2 className="mt-1 text-lg font-black text-theme-text">テスト時のお願い</h2>
          </div>
          <div className="space-y-1.5 text-sm leading-6 text-theme-muted">
            {testNotes.map((sentence) => <p key={sentence}>{sentence}</p>)}
          </div>
        </Card>

        <Card className="space-y-2 border-theme-main/15 bg-theme-card/90 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Checklist</p>
          <h2 className="text-lg font-black text-theme-text">確認してほしい流れ</h2>
          <p className="text-sm leading-6 text-theme-muted">
            上から順番に確認してください。
            <br />
            実際のチェック保存機能はありません。
          </p>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          {testerGuideItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <Card className="space-y-3 border-theme-main/15 bg-theme-card/90 py-3 shadow-sm" key={item.title}>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-theme-main/10 text-theme-main-dark">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-theme-main-dark">STEP {index + 1}</p>
                    <h2 className="mt-0.5 text-base font-black leading-6 text-theme-text">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-theme-muted">{item.body}</p>
                  </div>
                </div>

                <ul className="space-y-1.5 rounded-[1.15rem] bg-theme-sky/10 p-3">
                  {item.checkpoints.map((checkpoint) => (
                    <li className="flex gap-2 text-xs font-bold leading-5 text-theme-text" key={checkpoint}>
                      <CheckCircle2 className="mt-0.5 shrink-0 text-theme-main-dark" size={15} />
                      <span>{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <Card className="space-y-3 border-theme-main/20 bg-theme-main/10 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Feedback</p>
            <h2 className="mt-1 text-lg font-black text-theme-text">フィードバックしてほしいこと</h2>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              気づいた点は、分かる範囲で送ってください。
              <br />
              スクリーンショットがあると確認しやすくなります。
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {feedbackPoints.map((point) => (
              <li className="flex items-center gap-2 rounded-[1rem] bg-theme-card/80 px-3 py-2 text-sm font-bold text-theme-text" key={point}>
                <Flag className="shrink-0 text-theme-main-dark" size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

import { Bell, CheckCircle2, ClipboardCheck, HeartHandshake, MessageCircle, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const testerGuideItems = [
  {
    icon: CheckCircle2,
    title: 'ログインする',
    body: 'GoogleログインでConnectBloomに入れるか確認します。',
    checkpoints: ['ログインできる', 'ホームに戻れる', 'ログアウト後も再ログインできる'],
  },
  {
    icon: UserRound,
    title: 'プロフィールを整える',
    body: '自己紹介、つながり方のスタンス、活動ジャンル・興味タグを入力して保存します。',
    checkpoints: ['プロフィールを保存できる', 'つながり方のスタンスを選べる', '活動ジャンル候補をタップで追加できる', 'プロフィール画像を設定できる'],
  },
  {
    icon: UsersRound,
    title: 'ルームで話す',
    body: 'クリエイティブルームや雑談ルームでメッセージを投稿します。',
    checkpoints: ['ルーム一覧が見える', 'ルーム詳細に入れる', 'メッセージを送信できる', 'メッセージが表示される'],
  },
  {
    icon: ClipboardCheck,
    title: '募集を作る',
    body: '一緒にやりたいことや、探している仲間を募集ボードに投稿します。',
    checkpoints: ['募集を作成できる', '募集を編集できる', '自分の募集に表示される', '締切 / 再開ができる'],
  },
  {
    icon: HeartHandshake,
    title: '参加希望を送る',
    body: '別ユーザーの募集に「参加したい」を送ります。',
    checkpoints: ['参加希望を送れる', '参加希望した募集に表示される', '参加希望を取り消せる'],
  },
  {
    icon: CheckCircle2,
    title: '参加希望を承認する',
    body: '募集投稿者として、届いた参加希望を承認または見送りできます。',
    checkpoints: ['参加希望者が表示される', '承認できる', '見送りできる', '承認後に会話へ進める'],
  },
  {
    icon: MessageCircle,
    title: 'DMで相談する',
    body: '相互コネクト、または募集参加の承認後に1対1で会話します。',
    checkpoints: ['会話画面に入れる', 'メッセージを送れる', '募集由来の会話であることが分かる'],
  },
  {
    icon: Bell,
    title: '通知を見る',
    body: '参加希望、承認、DMなどの通知を確認します。',
    checkpoints: ['通知が届く', '未読が分かる', '既読にできる', '関連ページへ移動できる'],
  },
  {
    icon: ShieldCheck,
    title: '安心機能を確認する',
    body: '安心ガイド、ブロック、通報導線を確認します。',
    checkpoints: ['安心ガイドを読める', 'ブロック導線がある', '通報導線がある', '設定から確認できる'],
  },
];

const feedbackPoints = ['どの画面で起きたか', '何を押した時に起きたか', '期待していた動き', '実際に起きたこと', 'エラー文言', 'スクリーンショット'];

export function TestGuidePage() {
  return (
    <PageShell description="ConnectBloomを試すときに、確認してほしい流れをまとめています。" eyebrow="TEST GUIDE" title="テスターガイド">
      <div className="space-y-3">
        <Card className="space-y-2 border-theme-main/15 bg-theme-accent-soft/70 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">試してほしい流れ</p>
          <p className="text-sm leading-6 text-theme-muted">ConnectBloomは現在、招待制のβ版です。招待コードを受け取ったテスター向けに、確認してほしい流れをまとめています。</p>
          <p className="text-sm leading-6 text-theme-muted">予期しないエラーや表示崩れが起きる可能性があります。気づいた点はスクリーンショットで共有してください。</p>
          <p className="text-sm leading-6 text-theme-muted">上から順番に、ログインから安心機能まで確認してください。実際のチェック保存は不要です。</p>
        </Card>

        <Card className="border-theme-main/15 bg-theme-card/90 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">テスト時のお願い</p>
          <p className="mt-2 text-sm leading-6 text-theme-muted">テスト中は、住所・勤務先・電話番号・金融情報などの重要な個人情報を入力しないでください。</p>
        </Card>

        {testerGuideItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <Card className="space-y-3 border-theme-main/15 bg-theme-card/90 shadow-sm" key={item.title}>
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-main/10 text-theme-main-dark">
                  <Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-theme-main-dark">Step {index + 1}</p>
                  <h2 className="mt-0.5 text-base font-black leading-6 text-theme-text">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-theme-muted">{item.body}</p>
                </div>
              </div>

              <div className="rounded-[1.15rem] bg-theme-sky/10 p-3">
                <p className="text-xs font-black text-theme-main-dark">確認ポイント</p>
                <ul className="mt-2 space-y-1.5">
                  {item.checkpoints.map((checkpoint) => (
                    <li className="flex gap-2 text-sm leading-6 text-theme-text" key={checkpoint}>
                      <CheckCircle2 className="mt-1 shrink-0 text-theme-main-dark" size={16} />
                      <span>{checkpoint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}

        <Card className="space-y-3 border-theme-main/20 bg-theme-main/10 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Feedback</p>
            <h2 className="mt-1 text-lg font-black text-theme-text">フィードバックしてほしいこと</h2>
            <p className="mt-2 text-sm leading-6 text-theme-muted">
              バグ、分かりづらい文言、見切れ、操作に迷ったところがあれば、スクリーンショットと一緒に共有してください。
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {feedbackPoints.map((point) => (
              <li className="flex items-center gap-2 rounded-[1rem] bg-theme-card/80 px-3 py-2 text-sm font-bold text-theme-text" key={point}>
                <CheckCircle2 className="shrink-0 text-theme-main-dark" size={16} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}

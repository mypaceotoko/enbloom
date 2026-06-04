import { Bell, Database, Eye, FileWarning, HelpCircle, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const privacySections = [
  {
    icon: Database,
    title: '1. 取得する情報',
    body: ['ConnectBloomでは、β版の提供に必要な範囲で以下の情報を扱う可能性があります。'],
    list: [
      'Googleログインにより取得される基本情報',
      'プロフィール情報',
      'プロフィール画像',
      '募集ボードへの投稿内容',
      '参加希望情報',
      'ルームメッセージ',
      'DMメッセージ',
      '通知情報',
      'ブロック・通報情報',
      'アプリの利用状況に関する情報',
    ],
  },
  {
    icon: ShieldCheck,
    title: '2. 利用目的',
    body: ['取得した情報は以下のために利用します。'],
    list: [
      'アカウント作成・ログイン',
      'プロフィール表示',
      '募集ボード機能',
      '参加希望・承認・DM機能',
      '通知機能',
      'ルーム機能',
      '通報・ブロックなどの安全対策',
      '不具合調査・サービス改善',
    ],
  },
  {
    icon: Eye,
    title: '3. 他のユーザーに表示される情報',
    body: [
      'プロフィール、募集投稿、ルーム内メッセージなどは、他のユーザーに表示される場合があります。',
      'DMは関係するユーザー同士で表示されます。',
    ],
  },
  {
    icon: FileWarning,
    title: '4. 個人情報の注意',
    body: ['住所、勤務先、電話番号、金融情報などの重要な個人情報は、信頼関係ができるまで共有しないでください。'],
  },
  {
    icon: Bell,
    title: '5. 第三者提供',
    body: ['法令に基づく場合や、安全確保・不正対策のために必要な場合を除き、取得した情報を不必要に第三者へ提供しない方針です。'],
  },
  {
    icon: HelpCircle,
    title: '6. 外部サービス',
    body: ['Googleログイン、Supabase、Vercel、GitHubなど、開発・認証・保存・公開に関わる外部サービスを利用している可能性があります。'],
  },
  {
    icon: Trash2,
    title: '7. データの削除・問い合わせ',
    body: [
      'β版のため、削除や問い合わせ方法は今後整備予定です。',
      '現時点では運営者に連絡することで、可能な範囲で対応します。',
    ],
  },
  {
    icon: RefreshCw,
    title: '8. ポリシーの変更',
    body: ['本ポリシーは、サービス改善や正式公開に向けて変更される場合があります。'],
  },
];

export function PrivacyPage() {
  return (
    <PageShell description="ConnectBloomで扱う情報と、その使い方についてまとめています。" eyebrow="PRIVACY" title="プライバシーポリシー">
      <div className="space-y-3">
        <Card className="border-theme-main/20 bg-theme-main/10 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">Beta notice</p>
          <p className="mt-2 text-sm font-bold leading-6 text-theme-text">
            このプライバシーポリシーは、β版テスト向けの暫定版です。正式公開前に内容を見直す可能性があります。
          </p>
        </Card>

        <Card className="border-theme-main/15 bg-theme-accent-soft/70 shadow-sm">
          <p className="text-sm leading-6 text-theme-muted">
            ConnectBloomは、共通の興味から活動仲間・趣味仲間・制作仲間とつながる紹介制コネクトSNSです。恋愛・交際・婚活・異性交際を主目的としたサービスではありません。
          </p>
        </Card>

        {privacySections.map((section) => {
          const Icon = section.icon;

          return (
            <Card className="space-y-3 border-theme-main/15 bg-theme-card/90 shadow-sm" key={section.title}>
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
                  <Icon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black leading-6 text-theme-text">{section.title}</h2>
                  {section.body.map((paragraph) => (
                    <p className="mt-2 text-sm leading-6 text-theme-muted" key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
              {section.list ? (
                <ul className="grid gap-2 rounded-[1.15rem] bg-theme-sky/10 p-3 sm:grid-cols-2">
                  {section.list.map((item) => (
                    <li className="flex gap-2 text-sm leading-6 text-theme-text" key={item}>
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-theme-main-dark" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

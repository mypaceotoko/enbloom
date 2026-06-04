import { AlertTriangle, ClipboardList, Flag, MessageCircle, RefreshCw, Scale, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const termsSections = [
  {
    icon: ShieldCheck,
    title: '1. サービスについて',
    body: [
      'ConnectBloomは、共通の興味から仲間とつながる紹介制コネクトSNSです。',
      '活動、趣味、企画、制作、学習、地域交流、情報交換などを目的としたコミュニティサービスです。',
    ],
  },
  {
    icon: ShieldCheck,
    title: '2. 目的に沿った利用',
    body: [
      'ConnectBloomは、活動・趣味・企画・制作などの仲間づくりを支えるサービスです。',
      '募集ボードやルーム、DMは、活動内容や進め方を相談するために利用してください。',
    ],
  },
  {
    icon: AlertTriangle,
    title: '3. 禁止事項',
    list: [
      '迷惑行為、嫌がらせ、誹謗中傷',
      '個人情報を過度に求める行為',
      '外部SNSや連絡先への強引な誘導',
      '金銭トラブルにつながる勧誘',
      '投資、宗教、ネットワークビジネス等の強引な勧誘',
      'なりすまし',
      '不適切な投稿、画像、メッセージ',
      '法令または公序良俗に反する行為',
    ],
  },
  {
    icon: ClipboardList,
    title: '4. 募集ボードの利用',
    body: [
      '募集ボードは、一緒にやりたい活動、話したいテーマ、探している仲間を投稿する場所です。',
      '内容が大きく変わる場合は、参加希望者に誤解がないようにしてください。',
    ],
  },
  {
    icon: MessageCircle,
    title: '5. ルームとDMの利用',
    body: [
      'ルームは、雑談やアイデア出し、情報交換をする場所です。',
      'DMは、相互コネクトまたは募集参加承認後に、活動内容や進め方を相談するために利用してください。',
    ],
  },
  {
    icon: Flag,
    title: '6. 通報・ブロック',
    body: [
      '不安を感じる相手や迷惑行為があった場合は、無理に返信せず、ブロックや通報を利用してください。',
      '運営は必要に応じて投稿やアカウントの確認・制限を行う場合があります。',
    ],
  },
  {
    icon: Scale,
    title: '7. 免責',
    body: [
      'β版のため、予期しない不具合や表示崩れが発生する可能性があります。',
      '重要な連絡や金銭に関わるやり取りには利用しないでください。',
    ],
  },
  {
    icon: RefreshCw,
    title: '8. 規約の変更',
    body: ['本規約は、サービス改善や正式公開に向けて変更される場合があります。'],
  },
];

export function TermsPage() {
  return (
    <PageShell description="ConnectBloomを安心して使うための基本ルールです。" eyebrow="TERMS" title="利用規約">
      <div className="space-y-3">
        <Card className="border-theme-main/20 bg-theme-main/10 p-3 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-theme-main-dark">Beta notice</p>
          <p className="mt-1.5 text-[13px] font-bold leading-5 text-theme-text">
            この利用規約は、β版テスト向けの暫定版です。
            <br />
            正式公開前に内容を見直す可能性があります。
          </p>
        </Card>

        {termsSections.map((section) => {
          const Icon = section.icon;

          return (
            <Card className="space-y-2.5 border-theme-main/15 bg-theme-card/90 p-3 shadow-sm" key={section.title}>
              <div className="flex items-start gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-black leading-5 text-theme-text">{section.title}</h2>
                  {section.body ? (
                    <div className="mt-1.5 space-y-1.5">
                      {section.body.map((paragraph) => (
                        <p className="text-[13px] leading-5 text-theme-muted" key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {section.list ? (
                <ul className="space-y-1 rounded-[1rem] bg-theme-sky/10 p-2.5">
                  {section.list.map((item) => (
                    <li className="flex gap-2 text-[13px] leading-5 text-theme-text" key={item}>
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

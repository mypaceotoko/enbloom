import { Flag, HandHeart, MessagesSquare, ShieldCheck, UserX, UsersRound } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const guides = [
  {
    icon: ShieldCheck,
    title: '個人情報をすぐ渡さない',
    body: '住所、勤務先、連絡先、金融情報などは、信頼関係ができるまで共有しないでください。',
  },
  {
    icon: UserX,
    title: '違和感があればブロック',
    body: '不安を感じる言動があった場合は、無理に返信せずブロック機能を使ってください。',
  },
  {
    icon: Flag,
    title: '通報で運営へ共有',
    body: '迷惑行為や危険を感じる内容は、通報機能で運営へ共有できます。',
  },
  {
    icon: UsersRound,
    title: '募集は活動・趣味・共創のために',
    body: 'ConnectBloomの募集は、恋愛や交際相手探しではなく、活動・趣味・企画・制作仲間を募るためのものです。',
  },
  {
    icon: MessagesSquare,
    title: 'ルームは会話とアイデア出しの場所',
    body: '雑談や情報交換から、小さな企画の種を見つける場所です。',
  },
  {
    icon: HandHeart,
    title: 'DMは丁寧に',
    body: '相手のペースを大切にし、活動内容や進め方を丁寧に相談しましょう。',
  },
];

export function SafetyPage() {
  return (
    <PageShell description="ConnectBloomを安心して使うためのルールとヒントをまとめています。" eyebrow="Safety" title="安心ガイド">
      <div className="space-y-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {guides.map((guide) => {
          const Icon = guide.icon;

          return (
            <Card className="flex gap-4" key={guide.title}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark">
                <Icon size={22} />
              </span>
              <span>
                <span className="block font-black">{guide.title}</span>
                <span className="mt-1 block text-sm leading-6 text-theme-muted">{guide.body}</span>
              </span>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

import { Flag, Hand, ShieldCheck, UserX } from 'lucide-react';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

const guides = [
  { icon: ShieldCheck, title: '個人情報をすぐ渡さない', body: '住所、勤務先、連絡先、金融情報などは信頼関係ができるまで共有しないでください。' },
  { icon: UserX, title: '違和感があればブロック', body: '不安を感じる言動があった場合は、無理に返信せずブロック導線を利用する想定です。' },
  { icon: Flag, title: '通報で運営へ共有', body: '迷惑行為や危険を感じる内容は通報し、管理画面で確認できる流れを次フェーズ以降に実装します。' },
  { icon: Hand, title: '実際に会うときの注意', body: '初回は公共の場所で会い、友人に予定を共有し、帰宅手段を事前に確保しましょう。' },
];

export function SafetyPage() {
  return (
    <PageShell description="安心感のある出会い体験を支える安全ガイドです。" eyebrow="Safety" title="安全ガイド">
      {guides.map((guide) => {
        const Icon = guide.icon;
        return <Card className="flex gap-4" key={guide.title}><span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-theme-accent-soft text-theme-main-dark"><Icon size={22} /></span><span><span className="block font-black">{guide.title}</span><span className="mt-1 block text-sm leading-6 text-theme-muted">{guide.body}</span></span></Card>;
      })}
    </PageShell>
  );
}

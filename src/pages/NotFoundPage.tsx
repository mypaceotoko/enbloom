import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';

export function NotFoundPage() {
  return (
    <PageShell title="ページが見つかりません">
      <Card className="space-y-4 text-center">
        <p className="text-sm leading-6 text-theme-muted">お探しのご縁はまだ咲いていないようです。</p>
        <Link to="/home"><Button>ホームへ戻る</Button></Link>
      </Card>
    </PageShell>
  );
}

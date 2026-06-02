import { Search } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ProfileCard } from '../components/ProfileCard';
import { mockUsers } from '../data/mockUsers';

const filters = ['紹介経由', 'カフェ', '旅行', 'ゆっくり話したい', '東京近郊'];

export function DiscoverPage() {
  return (
    <PageShell description="検索条件はまだダミーです。タグで探せる雰囲気を先に実装しています。" eyebrow="Discover" title="ご縁を探す">
      <Card className="space-y-3">
        <Input label="キーワード" name="search" placeholder="趣味・地域で探す" />
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => <Badge key={filter}><Search size={12} />{filter}</Badge>)}
        </div>
      </Card>
      <div className="space-y-5">
        {mockUsers.map((user) => <ProfileCard compact key={user.id} user={user} />)}
      </div>
    </PageShell>
  );
}

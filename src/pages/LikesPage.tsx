import { Heart } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';

export function LikesPage() {
  const received = mockUsers.slice(0, 2);
  const sent = mockUsers.slice(2, 5);

  return (
    <PageShell description="Phase 1ではダミーのいいね一覧です。" eyebrow="Likes" title="いいね">
      <LikeSection title="もらったいいね" users={received} />
      <LikeSection title="送ったいいね" users={sent} />
    </PageShell>
  );
}

function LikeSection({ title, users }: { title: string; users: typeof mockUsers }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-black">{title}</h2>
      {users.map((user) => (
        <div className="flex items-center gap-3 rounded-3xl bg-theme-accent-soft/45 p-3" key={user.id}>
          <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${user.gradient} font-black text-theme-main-dark`}>{user.name.slice(0, 1)}</span>
          <span className="min-w-0 flex-1"><span className="block font-bold">{user.name}</span><span className="block text-xs text-theme-muted">{user.location}</span></span>
          <Badge><Heart size={12} />Demo</Badge>
        </div>
      ))}
    </Card>
  );
}

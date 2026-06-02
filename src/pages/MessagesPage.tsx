import { Send } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { mockUsers } from '../data/mockUsers';

type Message = { id: number; from: 'me' | 'them'; body: string };

export function MessagesPage() {
  const { matchId } = useParams();
  const user = mockUsers.find((mockUser) => mockUser.id === matchId);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'them', body: '紹介してもらえて嬉しいです。よろしくお願いします。' },
    { id: 2, from: 'me', body: 'こちらこそ、ゆっくりお話しできたら嬉しいです。' },
  ]);
  const [draft, setDraft] = useState('');

  if (!user) {
    return <Navigate replace to="/matches" />;
  }

  function sendMessage() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;
    setMessages((current) => [...current, { id: Date.now(), from: 'me', body: trimmedDraft }]);
    setDraft('');
  }

  return (
    <PageShell description="送信内容はローカルstateにのみ追加されます。" eyebrow="Message" title={`${user.name}さんとのDM`}>
      <Card className="flex min-h-[56vh] flex-col gap-3">
        <div className="flex-1 space-y-3">
          {messages.map((message) => (
            <div className={`flex ${message.from === 'me' ? 'justify-end' : 'justify-start'}`} key={message.id}>
              <p className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm leading-6 ${message.from === 'me' ? 'bg-theme-main text-white' : 'bg-theme-accent-soft text-theme-text'}`}>{message.body}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2 border-t border-theme-main/10 pt-3">
          <Input className="min-h-11" name="message" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="メッセージを書く" value={draft} />
          <Button className="min-h-11 px-4" onClick={sendMessage}><Send size={17} /></Button>
        </div>
      </Card>
    </PageShell>
  );
}

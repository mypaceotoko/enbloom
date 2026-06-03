import type { UserProfile } from './user';

export type LikeDirection = 'sent' | 'received';

export type Like = {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
};

export type LikeWithProfile = Like & {
  direction: LikeDirection;
  profile: UserProfile | null;
};

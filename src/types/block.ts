import type { UserProfile } from './user';

export type Block = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

export type BlockInsertResult = {
  success: boolean;
  alreadyExists?: boolean;
  block?: Block | null;
};

export type BlockedUserWithProfile = {
  block: Block;
  profile: UserProfile | null;
};

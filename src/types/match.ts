import type { UserProfile } from './user';

export type MatchStatus = 'active' | 'archived' | 'blocked';

export type Match = {
  id: string;
  user1_id: string;
  user2_id: string;
  status: MatchStatus;
  created_at: string;
  last_message_at: string | null;
};

export type MatchWithProfile = Match & {
  otherUserId: string;
  profile: UserProfile | null;
};

export type MatchCreateResult = {
  success: boolean;
  matched: boolean;
  matchId?: string;
  alreadyExists?: boolean;
  message?: string;
};


export type ConversationFailurePhase = 'rpc_failed' | 'match_id_missing' | 'navigation_failed' | 'messages_load_failed' | 'validate-direct-target' | 'ensure_direct_conversation';

export type DirectConversationResult = {
  success: boolean;
  matchId?: string;
  alreadyExists?: boolean;
  blocked?: boolean;
  message?: string;
  phase?: ConversationFailurePhase | string;
  debugError?: string;
  errorDetails?: {
    message?: string;
    details?: string | null;
    hint?: string | null;
    code?: string;
  };
};

import type { UserProfile } from './user';

export type ActivityPostMode = 'online' | 'offline' | 'hybrid' | 'either';
export type ActivityPostStatus = 'open' | 'closed' | 'archived';
export type ActivityPostStatusLabel = '募集中' | '締切済み' | 'アーカイブ';
export type ActivityInterestStatus = 'interested' | 'accepted' | 'declined' | 'cancelled';
export type ActivityInterestStatusLabel = '参加希望中' | '承認済み' | '見送り' | '取り消し済み';

export type ActivityPost = {
  id: string;
  created_by: string;
  title: string;
  body: string;
  category: string;
  area: string | null;
  tags: string[];
  mode: ActivityPostMode;
  max_participants: number | null;
  scheduled_at: string | null;
  status: ActivityPostStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  archived_by?: string | null;
  archived_at?: string | null;
  moderation_locked?: boolean;
  room_id?: string | null;
};

export type ActivityPostStats = {
  post_id: string;
  interest_count: number;
  accepted_count: number;
};

export type ActivityPostWithAuthor = ActivityPost & {
  author: UserProfile | null;
  interest_count: number;
  accepted_count: number;
};

export type ActivityPostWithStats = ActivityPostWithAuthor & ActivityPostStats;

export type ActivityPostInterest = {
  id: string;
  post_id: string;
  user_id: string;
  message: string | null;
  status: ActivityInterestStatus;
  created_at: string;
  updated_at: string;
};

export type ActivityPostInterestWithProfile = ActivityPostInterest & {
  profile: UserProfile | null;
};

export type MyInterestedActivityPost = ActivityPostInterest & {
  post: ActivityPostWithAuthor | null;
};

export type ActivityPostInput = {
  title: string;
  body: string;
  category: string;
  area?: string | null;
  tags?: string[];
  mode?: ActivityPostMode;
  max_participants?: number | null;
  scheduled_at?: string | null;
  status?: ActivityPostStatus;
  room_id?: string | null;
};

export type ActivityPostUpdateInput = {
  title?: string;
  body?: string;
  category?: string;
  location?: string | null;
  area?: string | null;
  tags?: string[];
  capacity?: number | null;
  max_participants?: number | null;
  scheduled_at?: string | null;
  mode?: ActivityPostMode;
  status?: ActivityPostStatus;
  room_id?: string | null;
};

export type ActivityPostEditFormState = {
  title: string;
  body: string;
  category: string;
  location: string;
  tags: string;
  capacity: string;
  scheduledAt: string;
  mode: ActivityPostMode;
  status: ActivityPostStatus;
};

export type ActivityPostFilters = {
  category?: string;
  tag?: string;
  status?: ActivityPostStatus;
};

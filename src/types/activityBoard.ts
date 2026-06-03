import type { UserProfile } from './user';

export type ActivityPostMode = 'online' | 'offline' | 'either';
export type ActivityPostStatus = 'open' | 'closed' | 'archived';
export type ActivityInterestStatus = 'interested' | 'accepted' | 'declined' | 'cancelled';

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
};

export type ActivityPostWithAuthor = ActivityPost & {
  author: UserProfile | null;
  interest_count: number;
};

export type ActivityPostInterest = {
  id: string;
  post_id: string;
  user_id: string;
  message: string | null;
  status: ActivityInterestStatus;
  created_at: string;
  updated_at: string;
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
};

export type ActivityPostFilters = {
  category?: string;
  tag?: string;
  status?: ActivityPostStatus;
};

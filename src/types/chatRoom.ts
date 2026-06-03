import type { UserProfile } from './user';

export type ChatRoom = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string | null;
  is_official: boolean;
  created_at: string;
  updated_at: string;
};

export type ChatRoomMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ChatRoomWithStats = ChatRoom & {
  message_count: number;
  latest_message_at: string | null;
};

export type ChatRoomMessageWithProfile = ChatRoomMessage & {
  profile: UserProfile | null;
};

export type ChatRoomCreateInput = {
  slug: string;
  name: string;
  description: string;
  category?: string | null;
  is_official?: boolean;
};

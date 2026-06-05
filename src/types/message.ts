import type { UserProfile } from './user';

export type Message = {
  id: string;
  matchId: string;
  senderId: 'current-user' | string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export type MessageWithSender = Message & {
  senderProfile?: UserProfile | null;
};

export type SendMessageResult = {
  success: boolean;
  message?: Message;
  messageId?: string;
  createdAt?: string;
  errorMessage?: string;
};

export type MessageMatch = {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUserId: string;
  otherProfile: UserProfile | null;
  createdAt: string;
  lastMessageAt: string | null;
  adminInitiatedBy?: string | null;
  adminInitiatedAt?: string | null;
};

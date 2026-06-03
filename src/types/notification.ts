export type NotificationType =
  | 'activity_interest_received'
  | 'activity_interest_accepted'
  | 'direct_message_received';

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationCreateInput = {
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath?: string | null;
};

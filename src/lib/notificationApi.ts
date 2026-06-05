import type { AppNotification, NotificationCreateInput, NotificationType } from '../types/notification';
import { getSafeErrorLog } from './errorMessage';
import { supabase } from './supabase';
import { assertNotDemoMode } from './demoSession';

export const notificationSetupMessage = '通知機能の準備がまだ完了していない可能性があります。';

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link_path: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type NotificationSummary = {
  unreadCount: number;
  latestNotifications: AppNotification[];
};

const notificationColumns = 'id,user_id,type,title,body,link_path,is_read,created_at,read_at';
const notificationTypes: NotificationType[] = [
  'activity_interest_received',
  'activity_interest_accepted',
  'direct_message_received',
];

function mapNotificationRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    linkPath: row.link_path,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

async function getCurrentUserId({ optional = false }: { optional?: boolean } = {}) {
  if (!supabase) {
    if (optional) return null;
    throw new Error('ログイン状態を確認できませんでした。');
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (optional) return null;
    throw new Error('ログイン状態を確認できませんでした。');
  }

  if (!data.user) {
    if (optional) return null;
    throw new Error('ログイン状態を確認できませんでした。');
  }

  return data.user.id;
}

function validateNotificationType(type: NotificationType) {
  return notificationTypes.includes(type);
}

function truncate(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export function getNotificationErrorMessage(error: unknown, fallback = '通知の取得に失敗しました。時間を置いてもう一度お試しください。') {
  if (error instanceof Error && /ログイン状態/.test(error.message)) return 'ログイン状態を確認できませんでした。';

  const errorLike = error as { code?: string; message?: string } | null;
  const message = errorLike?.message ?? (error instanceof Error ? error.message : '');
  const code = errorLike?.code ?? '';
  if (code === '42P01' || code === '42883' || /notifications|create_notification|relation .* does not exist|function .* does not exist/i.test(message)) {
    return notificationSetupMessage;
  }

  return fallback;
}

export async function getMyNotifications(limit = 100): Promise<AppNotification[]> {
  if (!supabase) return [];
  const currentUserId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('notifications')
    .select(notificationColumns)
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const notifications = ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
  console.info('[ConnectBloom] notifications fetched', { count: notifications.length });
  return notifications;
}

export async function getLatestNotifications(limit = 3): Promise<AppNotification[]> {
  return getMyNotifications(limit);
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (!supabase) return 0;
  const currentUserId = await getCurrentUserId({ optional: true });
  if (!currentUserId) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', currentUserId)
    .eq('is_read', false);

  if (error) throw error;
  return count ?? 0;
}

export async function safeGetUnreadNotificationCount(): Promise<number> {
  try {
    return await getUnreadNotificationCount();
  } catch (caughtError) {
    console.warn('[ConnectBloom] notification unread count fetch failed', getSafeErrorLog(caughtError, 'unread_count_fetch_failed'));
    return 0;
  }
}

export async function getNotificationSummary(limit = 3): Promise<NotificationSummary> {
  if (!supabase) return { unreadCount: 0, latestNotifications: [] };
  const [unreadCount, latestNotifications] = await Promise.all([
    getUnreadNotificationCount(),
    getLatestNotifications(limit),
  ]);

  return { unreadCount, latestNotifications };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  assertNotDemoMode('通知の既読');
  if (!supabase) return;
  const currentUserId = await getCurrentUserId();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', currentUserId);

  if (error) throw error;
  console.info('[ConnectBloom] notification marked read', { success: true });
}

export async function markAllNotificationsRead(): Promise<void> {
  assertNotDemoMode('通知の既読');
  if (!supabase) return;
  const currentUserId = await getCurrentUserId();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', currentUserId)
    .eq('is_read', false);

  if (error) throw error;
  console.info('[ConnectBloom] notifications marked read', { success: true });
}

function warnNotificationCreation(type: NotificationType, targetUserId: string | null | undefined, success: boolean, error?: unknown) {
  console.warn('[ConnectBloom] notification creation status', {
    type,
    targetUserExists: Boolean(targetUserId),
    success,
    ...getSafeErrorLog(error, 'notification_creation_failed'),
  });
}

export async function createNotification(input: NotificationCreateInput): Promise<string | null> {
  assertNotDemoMode('通知作成');
  if (!supabase) return null;
  const currentUserId = await getCurrentUserId({ optional: true });
  if (!currentUserId) return null;
  if (currentUserId === input.targetUserId) return null;
  if (!validateNotificationType(input.type)) throw new Error('通知タイプを確認できませんでした。');

  const title = truncate(input.title, 120);
  const body = truncate(input.body, 500);
  if (!title || !body) throw new Error('通知内容を確認できませんでした。');

  const { data, error } = await supabase.rpc('create_notification', {
    target_user_id: input.targetUserId,
    notification_type: input.type,
    notification_title: title,
    notification_body: body,
    notification_link_path: input.linkPath ?? null,
  });

  if (error) {
    warnNotificationCreation(input.type, input.targetUserId, false, error);
    throw error;
  }

  console.warn('[ConnectBloom] notification creation status', {
    type: input.type,
    targetUserExists: Boolean(input.targetUserId),
    success: true,
  });
  return typeof data === 'string' ? data : null;
}

export async function notifyActivityInterestReceived(
  postId: string,
  postTitle: string,
  postOwnerId: string,
  interestedUserName: string,
): Promise<string | null> {
  return createNotification({
    targetUserId: postOwnerId,
    type: 'activity_interest_received',
    title: '新しい参加希望が届きました',
    body: `「${truncate(postTitle, 80)}」に ${truncate(interestedUserName || 'ユーザー', 40)} さんが参加希望を送りました。`,
    linkPath: `/board/${postId}`,
  });
}

export async function notifyActivityInterestAccepted(
  postId: string,
  postTitle: string,
  participantUserId: string,
): Promise<string | null> {
  return createNotification({
    targetUserId: participantUserId,
    type: 'activity_interest_accepted',
    title: '参加希望が承認されました',
    body: `「${truncate(postTitle, 80)}」への参加希望が承認されました。会話を始められます。`,
    linkPath: `/my-interests?postId=${postId}`,
  });
}

export async function notifyDirectMessageReceived(
  matchId: string,
  recipientUserId: string,
  senderName: string,
): Promise<string | null> {
  return createNotification({
    targetUserId: recipientUserId,
    type: 'direct_message_received',
    title: '新しいメッセージが届きました',
    body: `${truncate(senderName || '相手', 40)} さんからメッセージが届きました。`,
    linkPath: `/messages/${matchId}`,
  });
}

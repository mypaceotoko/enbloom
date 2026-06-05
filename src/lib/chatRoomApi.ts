import type { ChatRoom, ChatRoomMessage, ChatRoomMessageWithProfile, ChatRoomWithStats } from '../types/chatRoom';
import { isSchemaRelationshipError } from './dbError';
import { getSafeErrorLog } from './errorMessage';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';
import { assertNotDemoMode } from './demoSession';

type ChatRoomMessageRow = ChatRoomMessage & {
  profile?: ProfileRow | ProfileRow[] | null;
};

type RoomMessageCountRow = {
  room_id: string;
  message_count: number;
  latest_message_at: string | null;
};

export type ChatRoomMessageDeleteResult = {
  deletedId: string;
  deletedRowCount: number;
};

export type ChatRoomAdminDeleteDiagnostics = {
  action: 'admin_delete_room_message';
  messageId: string;
  roomId: string | null;
  roomSlug: string | null;
  currentUserId: string | null;
  currentUserEmail: string | null;
  isFounder: boolean;
  isAdmin: boolean;
  messageSenderId: string | null;
  senderMatchesCurrentUser: boolean;
};

export type AdminDeleteRoomMessageDiagnosis =
  | 'not_admin'
  | 'auth_missing'
  | 'message_not_found'
  | 'delete_zero_rows'
  | 'rpc_not_found'
  | 'invalid_message_id'
  | 'unknown';

type RpcErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export class AdminDeleteRoomMessageError extends Error {
  diagnosis: AdminDeleteRoomMessageDiagnosis;

  constructor(diagnosis: AdminDeleteRoomMessageDiagnosis, cause?: unknown) {
    super('削除に失敗しました。');
    this.name = 'AdminDeleteRoomMessageError';
    this.diagnosis = diagnosis;
    this.cause = cause;
  }
}

const chatRoomColumns = 'id,slug,name,description,category,is_official,created_at,updated_at';
const profileSelectColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,account_status,invited_by,invite_code_used';
const profileSelectColumnsWithoutAccountStatus = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,invited_by,invite_code_used';
const chatRoomMessageColumns = 'id,room_id,sender_id,body,created_at,updated_at';
const chatRoomMessageWithProfileColumns = [
  chatRoomMessageColumns,
  `profile:profiles!chat_room_messages_sender_id_fkey(${profileSelectColumns})`,
].join(',');
const chatRoomMessageWithProfileFallbackColumns = [
  chatRoomMessageColumns,
  `profile:profiles!chat_room_messages_sender_id_fkey(${profileSelectColumnsWithoutAccountStatus})`,
].join(',');

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function mapMessage(row: ChatRoomMessageRow): ChatRoomMessageWithProfile {
  const profile = firstProfile(row.profile);
  return {
    id: row.id,
    room_id: row.room_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profile: profile ? profileRowToUserProfile(profile) : null,
  };
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログインするとルームで会話できます。');
  return data.user.id;
}

export async function getRoomMessageCounts(): Promise<Map<string, { message_count: number; latest_message_at: string | null }>> {
  const { data, error } = await requireSupabaseClient().rpc('get_chat_room_message_counts');
  if (error) {
    console.info('[ConnectBloom] room message counts fetch skipped', { success: false });
    return new Map();
  }

  const rows = (data ?? []) as RoomMessageCountRow[];
  console.info('[ConnectBloom] room message counts loaded', { count: rows.length });
  return new Map(rows.map((row) => [row.room_id, { message_count: Number(row.message_count) || 0, latest_message_at: row.latest_message_at }]));
}

export async function getChatRooms(): Promise<ChatRoomWithStats[]> {
  const { data, error } = await requireSupabaseClient()
    .from('chat_rooms')
    .select(chatRoomColumns)
    .eq('is_official', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[ConnectBloom] chat rooms fetch failed', getSafeErrorLog(error, 'chat_rooms_fetch'));
    throw error;
  }
  const rows = (data ?? []) as ChatRoom[];
  const counts = await getRoomMessageCounts();
  console.info('[ConnectBloom] chat rooms loaded', { count: rows.length });
  return rows.map((room) => ({
    ...room,
    message_count: counts.get(room.id)?.message_count ?? 0,
    latest_message_at: counts.get(room.id)?.latest_message_at ?? null,
  }));
}

export async function getChatRoomBySlug(slug: string): Promise<ChatRoom | null> {
  const { data, error } = await requireSupabaseClient()
    .from('chat_rooms')
    .select(chatRoomColumns)
    .eq('slug', slug)
    .maybeSingle<ChatRoom>();

  if (error) {
    console.warn('[ConnectBloom] chat room fetch by slug failed', getSafeErrorLog(error, 'chat_room_fetch_by_slug'));
    throw error;
  }
  console.info('[ConnectBloom] chat room loaded', { success: Boolean(data) });
  return data ?? null;
}


export async function getChatRoomById(roomId: string): Promise<ChatRoom | null> {
  const { data, error } = await requireSupabaseClient()
    .from('chat_rooms')
    .select(chatRoomColumns)
    .eq('id', roomId)
    .maybeSingle<ChatRoom>();

  if (error) {
    console.warn('[ConnectBloom] chat room fetch by id failed', getSafeErrorLog(error, 'chat_room_fetch_by_id'));
    throw error;
  }
  console.info('[ConnectBloom] chat room loaded by id', { success: Boolean(data) });
  return data ?? null;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isChatRoomMessageUuid(value: string) {
  return looksLikeUuid(value);
}

function getRpcErrorValue(value: unknown): RpcErrorLike {
  if (!value || typeof value !== 'object') return {};
  return value as RpcErrorLike;
}

function rpcErrorText(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function classifyAdminDeleteRoomMessageFailure(
  messageIdLooksUuid: boolean,
  rpcError: RpcErrorLike | null | undefined,
): AdminDeleteRoomMessageDiagnosis {
  if (!messageIdLooksUuid) return 'invalid_message_id';

  const code = typeof rpcError?.code === 'string' ? rpcError.code : '';
  const message = rpcErrorText(rpcError?.message);

  if (code === 'PGRST202' || message.includes('could not find the function')) return 'rpc_not_found';
  if (message.includes('not admin')) return 'not_admin';
  if (message.includes('auth uid missing')) return 'auth_missing';
  if (message.includes('message not found')) return 'message_not_found';
  if (message.includes('delete returned no rows')) return 'delete_zero_rows';
  return 'unknown';
}

function logAdminDeleteRoomMessageFailure(params: {
  diagnostics: ChatRoomAdminDeleteDiagnostics;
  messageIdLooksUuid: boolean;
  publicIsAdminAuthUid: boolean | null;
  rpcName: string;
  rpcPayload: { p_message_id: string };
  rpcError: RpcErrorLike | null;
  diagnosis: AdminDeleteRoomMessageDiagnosis;
}) {
  const { diagnostics, messageIdLooksUuid, publicIsAdminAuthUid, rpcName, rpcPayload, rpcError, diagnosis } = params;
  console.error('[ConnectBloom] admin room message delete failed', {
    action: 'admin_delete_room_message_failed',
    messageId: diagnostics.messageId,
    messageIdLooksUuid,
    currentUserId: diagnostics.currentUserId,
    currentUserEmail: diagnostics.currentUserEmail,
    isFounder: diagnostics.isFounder,
    isAdmin: diagnostics.isAdmin,
    publicIsAdminAuthUid,
    rpcName,
    rpcPayload,
    rpcError: {
      code: rpcError?.code,
      message: rpcError?.message,
      details: rpcError?.details,
      hint: rpcError?.hint,
    },
    diagnosis,
  });
}

export async function getChatRoomByIdentifier(roomIdOrSlug: string): Promise<ChatRoom | null> {
  if (looksLikeUuid(roomIdOrSlug)) {
    const roomById = await getChatRoomById(roomIdOrSlug);
    if (roomById) return roomById;
  }

  const roomBySlug = await getChatRoomBySlug(roomIdOrSlug);
  if (roomBySlug || !looksLikeUuid(roomIdOrSlug)) return roomBySlug;
  return getChatRoomById(roomIdOrSlug);
}

export async function getChatRoomMessages(roomId: string): Promise<ChatRoomMessageWithProfile[]> {
  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_room_messages')
    .select(chatRoomMessageWithProfileColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!error) {
    const rows = (data ?? []) as unknown as ChatRoomMessageRow[];
    console.info('[ConnectBloom] chat room messages loaded', { count: rows.length });
    return rows.map(mapMessage);
  }

  console.warn('[ConnectBloom] chat room messages fetch failed', getSafeErrorLog(error, 'chat_room_messages_fetch'));
  if (!isSchemaRelationshipError(error)) throw error;

  const fallbackWithProfile = await client
    .from('chat_room_messages')
    .select(chatRoomMessageWithProfileFallbackColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (!fallbackWithProfile.error) {
    console.warn('[ConnectBloom] chat room messages profile fallback used', getSafeErrorLog(error, 'chat_room_messages_profile_fallback'));
    return ((fallbackWithProfile.data ?? []) as unknown as ChatRoomMessageRow[]).map(mapMessage);
  }

  console.warn('[ConnectBloom] chat room messages profile fallback failed', getSafeErrorLog(fallbackWithProfile.error, 'chat_room_messages_profile_fallback_failed'));
  if (!isSchemaRelationshipError(fallbackWithProfile.error)) throw fallbackWithProfile.error;

  const baseResult = await client
    .from('chat_room_messages')
    .select(chatRoomMessageColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (baseResult.error) {
    console.warn('[ConnectBloom] chat room messages base fallback failed', getSafeErrorLog(baseResult.error, 'chat_room_messages_base_fallback_failed'));
    throw baseResult.error;
  }

  console.warn('[ConnectBloom] chat room messages base fallback used', getSafeErrorLog(fallbackWithProfile.error, 'chat_room_messages_base_fallback'));
  return ((baseResult.data ?? []) as unknown as ChatRoomMessageRow[]).map(mapMessage);
}

export async function sendChatRoomMessage(roomId: string, body: string): Promise<ChatRoomMessageWithProfile> {
  assertNotDemoMode('ルーム投稿');
  const senderId = await getCurrentUserId();
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error('メッセージを入力してください。');
  if (trimmedBody.length > 2000) throw new Error('メッセージは2000文字以内で入力してください。');

  const resolvedRoom = looksLikeUuid(roomId) ? await getChatRoomById(roomId) : await getChatRoomBySlug(roomId);
  const resolvedRoomId = resolvedRoom?.id ?? (looksLikeUuid(roomId) ? roomId : '');
  console.info('[ConnectBloom] chat room message room resolved', { inputLooksUuid: looksLikeUuid(roomId), resolved: Boolean(resolvedRoomId) });
  if (!resolvedRoomId) throw new Error('ルームを確認できませんでした。');

  const client = requireSupabaseClient();
  const { data, error } = await client
    .from('chat_room_messages')
    .insert({ room_id: resolvedRoomId, sender_id: senderId, body: trimmedBody })
    .select(chatRoomMessageColumns)
    .single<ChatRoomMessageRow>();

  if (error) {
    console.warn('[ConnectBloom] chat room message send failed', getSafeErrorLog(error, 'chat_room_message_send'));
    throw error;
  }

  const profileResult = await client
    .from('chat_room_messages')
    .select(chatRoomMessageWithProfileColumns)
    .eq('id', data.id)
    .maybeSingle<ChatRoomMessageRow>();

  if (!profileResult.error && profileResult.data) {
    console.info('[ConnectBloom] chat room message sent', { success: true, profileAttached: Boolean(firstProfile(profileResult.data.profile)) });
    return mapMessage(profileResult.data);
  }

  console.warn('[ConnectBloom] chat room message send profile readback failed', getSafeErrorLog(profileResult.error, 'chat_room_message_send_profile_readback'));
  if (profileResult.error && isSchemaRelationshipError(profileResult.error)) {
    const fallbackResult = await client
      .from('chat_room_messages')
      .select(chatRoomMessageWithProfileFallbackColumns)
      .eq('id', data.id)
      .maybeSingle<ChatRoomMessageRow>();

    if (!fallbackResult.error && fallbackResult.data) {
      console.warn('[ConnectBloom] chat room message send profile fallback used', getSafeErrorLog(profileResult.error, 'chat_room_message_send_profile_fallback'));
      return mapMessage(fallbackResult.data);
    }
    console.warn('[ConnectBloom] chat room message send profile fallback failed', getSafeErrorLog(fallbackResult.error, 'chat_room_message_send_profile_fallback_failed'));
  }

  console.info('[ConnectBloom] chat room message sent', { success: true, profileAttached: false });
  return mapMessage(data);

}

export async function getDatabaseAdminStatus(currentUserId: string | null): Promise<{ isAdmin: boolean; error: unknown | null }> {
  if (!currentUserId || !looksLikeUuid(currentUserId)) return { isAdmin: false, error: new Error('ログイン状態を確認できませんでした。') };

  const { data, error } = await requireSupabaseClient().rpc('is_admin', { user_id: currentUserId });
  if (error) return { isAdmin: false, error };
  return { isAdmin: data === true, error: null };
}

export async function deleteChatRoomMessage(messageId: string): Promise<ChatRoomMessageDeleteResult> {
  assertNotDemoMode('ルームメッセージ削除');
  if (!looksLikeUuid(messageId)) throw new Error('削除対象のメッセージを確認できませんでした。');
  const { data, error } = await requireSupabaseClient()
    .from('chat_room_messages')
    .delete()
    .eq('id', messageId)
    .select('id')
    .maybeSingle<{ id: string }>();

  if (error) {
    console.warn('[ConnectBloom] chat room message delete failed', getSafeErrorLog(error, 'chat_room_message_delete'));
    throw error;
  }
  if (!data) {
    const notDeletedError = new Error('メッセージを削除できませんでした。権限または削除対象を確認してください。');
    console.warn('[ConnectBloom] delete_zero_rows_or_rls_denied', getSafeErrorLog(notDeletedError, 'chat_room_message_delete_no_rows'));
    throw notDeletedError;
  }
  console.info('[ConnectBloom] chat room message deleted', { success: true, deletedRowCount: 1 });
  return { deletedId: data.id, deletedRowCount: 1 };
}

export async function adminDeleteChatRoomMessage(
  messageId: string,
  diagnostics: ChatRoomAdminDeleteDiagnostics,
): Promise<ChatRoomMessageDeleteResult> {
  assertNotDemoMode('ルームメッセージ管理者削除');
  const messageIdLooksUuid = looksLikeUuid(messageId);
  const rpcName = 'admin_delete_chat_room_message';
  const rpcPayload = { p_message_id: messageId };
  console.info('[ConnectBloom] admin room message delete requested', {
    ...diagnostics,
    messageIdLooksUuid,
    rpcName,
    rpcPayload,
  });

  if (!messageIdLooksUuid) {
    const rpcError = { message: 'messageId is not uuid' };
    const diagnosis = classifyAdminDeleteRoomMessageFailure(messageIdLooksUuid, rpcError);
    logAdminDeleteRoomMessageFailure({
      diagnostics,
      messageIdLooksUuid,
      publicIsAdminAuthUid: null,
      rpcName,
      rpcPayload,
      rpcError,
      diagnosis,
    });
    throw new AdminDeleteRoomMessageError(diagnosis);
  }

  const dbAdminStatus = await getDatabaseAdminStatus(diagnostics.currentUserId);
  const safeAdminStatusErrorLog = dbAdminStatus.error ? getSafeErrorLog(dbAdminStatus.error, 'admin_delete_room_message_is_admin_rpc') : null;
  const publicIsAdminAuthUid = dbAdminStatus.isAdmin;
  console.info('[ConnectBloom] admin room message delete db admin check', {
    ...diagnostics,
    messageIdLooksUuid,
    publicIsAdminAuthUid,
    rpcName,
    rpcPayload,
    publicIsAdminRpcError: safeAdminStatusErrorLog,
  });

  if (!publicIsAdminAuthUid) {
    const rpcError = safeAdminStatusErrorLog ?? { message: 'not admin' };
    const diagnosis = safeAdminStatusErrorLog
      ? classifyAdminDeleteRoomMessageFailure(messageIdLooksUuid, rpcError)
      : 'not_admin';
    logAdminDeleteRoomMessageFailure({
      diagnostics,
      messageIdLooksUuid,
      publicIsAdminAuthUid,
      rpcName,
      rpcPayload,
      rpcError,
      diagnosis,
    });
    throw new AdminDeleteRoomMessageError(diagnosis, dbAdminStatus.error);
  }

  const { data, error } = await requireSupabaseClient().rpc(rpcName, rpcPayload);
  const deletedResult = Array.isArray(data) ? data[0] as { success?: unknown; deleted_message_id?: unknown } | undefined : null;
  const deletedId = typeof data === 'string'
    ? data
    : typeof deletedResult?.deleted_message_id === 'string'
      ? deletedResult.deleted_message_id
      : null;
  const deleteSucceeded = typeof data === 'string' || deletedResult?.success === true;
  const deletedRowCount = deletedId && deleteSucceeded ? 1 : 0;
  const safeDeleteErrorLog = error ? getSafeErrorLog(error, 'admin_delete_room_message_rpc') : null;
  const rpcError = safeDeleteErrorLog ? getRpcErrorValue(safeDeleteErrorLog) : null;
  const baseDeleteLog = {
    ...diagnostics,
    messageIdLooksUuid,
    publicIsAdminAuthUid,
    rpcName,
    rpcPayload,
    rpcError,
  };

  console.info('[ConnectBloom] admin room message delete result', {
    ...baseDeleteLog,
    deleteData: data ?? null,
    deletedRowCount,
  });

  if (error) {
    const diagnosis = classifyAdminDeleteRoomMessageFailure(messageIdLooksUuid, rpcError);
    logAdminDeleteRoomMessageFailure({
      diagnostics,
      messageIdLooksUuid,
      publicIsAdminAuthUid,
      rpcName,
      rpcPayload,
      rpcError,
      diagnosis,
    });
    throw new AdminDeleteRoomMessageError(diagnosis, error);
  }

  if (!deletedId || !deleteSucceeded) {
    const notDeletedError = new Error('delete returned no rows');
    const rpcError = getRpcErrorValue(getSafeErrorLog(notDeletedError, 'admin_delete_room_message_zero_rows'));
    const diagnosis = classifyAdminDeleteRoomMessageFailure(messageIdLooksUuid, rpcError);
    logAdminDeleteRoomMessageFailure({
      diagnostics,
      messageIdLooksUuid,
      publicIsAdminAuthUid,
      rpcName,
      rpcPayload,
      rpcError,
      diagnosis,
    });
    throw new AdminDeleteRoomMessageError(diagnosis, notDeletedError);
  }

  return { deletedId, deletedRowCount };
}

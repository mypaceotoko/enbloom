import type { ChatRoom, ChatRoomMessage, ChatRoomMessageWithProfile, ChatRoomWithStats } from '../types/chatRoom';
import { isSchemaRelationshipError } from './dbError';
import { getSafeErrorLog } from './errorMessage';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';

type ChatRoomMessageRow = ChatRoomMessage & {
  profile?: ProfileRow | ProfileRow[] | null;
};

type RoomMessageCountRow = {
  room_id: string;
  message_count: number;
  latest_message_at: string | null;
};

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
  const senderId = await getCurrentUserId();
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error('メッセージを入力してください。');
  if (trimmedBody.length > 2000) throw new Error('メッセージは2000文字以内で入力してください。');

  const { data, error } = await requireSupabaseClient()
    .from('chat_room_messages')
    .insert({ room_id: roomId, sender_id: senderId, body: trimmedBody })
    .select(chatRoomMessageWithProfileColumns)
    .single<ChatRoomMessageRow>();

  if (error) {
    console.warn('[ConnectBloom] chat room message send failed', getSafeErrorLog(error, 'chat_room_message_send'));
    throw error;
  }
  console.info('[ConnectBloom] chat room message sent', { success: true });
  return mapMessage(data);
}

export async function deleteChatRoomMessage(messageId: string): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('chat_room_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.warn('[ConnectBloom] chat room message delete failed', getSafeErrorLog(error, 'chat_room_message_delete'));
    throw error;
  }
  console.info('[ConnectBloom] chat room message deleted', { success: true });
}

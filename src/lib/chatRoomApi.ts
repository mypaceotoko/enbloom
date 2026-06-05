import type { ChatRoom, ChatRoomMessage, ChatRoomMessageWithProfile, ChatRoomWithStats } from '../types/chatRoom';
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
const chatRoomMessageColumns = 'id,room_id,sender_id,body,created_at,updated_at';
const chatRoomMessageWithProfileColumns = [
  chatRoomMessageColumns,
  `profile:profiles!chat_room_messages_sender_id_fkey(${profileSelectColumns})`,
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

  if (error) throw error;
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

  if (error) throw error;
  console.info('[ConnectBloom] chat room loaded', { success: Boolean(data) });
  return data ?? null;
}


export async function getChatRoomById(roomId: string): Promise<ChatRoom | null> {
  const { data, error } = await requireSupabaseClient()
    .from('chat_rooms')
    .select(chatRoomColumns)
    .eq('id', roomId)
    .maybeSingle<ChatRoom>();

  if (error) throw error;
  console.info('[ConnectBloom] chat room loaded by id', { success: Boolean(data) });
  return data ?? null;
}

export async function getChatRoomMessages(roomId: string): Promise<ChatRoomMessageWithProfile[]> {
  const { data, error } = await requireSupabaseClient()
    .from('chat_room_messages')
    .select(chatRoomMessageWithProfileColumns)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) throw error;
  const rows = (data ?? []) as unknown as ChatRoomMessageRow[];
  console.info('[ConnectBloom] chat room messages loaded', { count: rows.length });
  return rows.map(mapMessage);
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

  if (error) throw error;
  console.info('[ConnectBloom] chat room message sent', { success: true });
  return mapMessage(data);
}

export async function deleteChatRoomMessage(messageId: string): Promise<void> {
  const { error } = await requireSupabaseClient()
    .from('chat_room_messages')
    .delete()
    .eq('id', messageId);

  if (error) throw error;
  console.info('[ConnectBloom] chat room message deleted', { success: true });
}

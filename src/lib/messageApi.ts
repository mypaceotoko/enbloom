import type { Message, MessageMatch, SendMessageResult } from '../types/message';
import { getPrimaryProfilePhoto } from './profilePhotoApi';
import { profileRowToUserProfile, type ProfileRow } from './profileApi';
import { requireSupabaseClient } from './supabase';

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type MatchMessageRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message_at: string | null;
  user1_profile?: ProfileRow | ProfileRow[] | null;
  user2_profile?: ProfileRow | ProfileRow[] | null;
};

type SendMatchMessageRpcRow = {
  success?: boolean;
  message_id?: string | null;
  created_at?: string | null;
  message?: string | null;
};

const profileColumns = 'id,display_name,age,location,occupation,bio,interests,relationship_goal,dating_temperature,onboarding_completed,visibility,role,account_status,invited_by,invite_code_used';
const messageMatchColumns = [
  'id,user1_id,user2_id,created_at,last_message_at',
  `user1_profile:profiles!matches_user1_id_fkey(${profileColumns})`,
  `user2_profile:profiles!matches_user2_id_fkey(${profileColumns})`,
].join(',');

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

function firstProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (Array.isArray(profile)) return profile[0] ?? null;
  return profile ?? null;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return error.code === '42883' || /function .*send_match_message/i.test(error.message ?? '');
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function getMessageMatchById(matchId: string): Promise<MessageMatch | null> {
  const currentUserId = await getCurrentUserId();
  console.info('[ConnectBloom] matchId exists', { exists: Boolean(matchId) });

  const { data, error } = await requireSupabaseClient()
    .from('matches')
    .select(messageMatchColumns)
    .eq('id', matchId)
    .eq('status', 'active')
    .maybeSingle<MatchMessageRow>();

  if (error) throw error;

  const isParticipant = Boolean(data && (data.user1_id === currentUserId || data.user2_id === currentUserId));
  console.info('[ConnectBloom] is match participant', { isParticipant });
  if (!data || !isParticipant) return null;

  const otherProfile = data.user1_id === currentUserId ? firstProfile(data.user2_profile) : firstProfile(data.user1_profile);

  return {
    id: data.id,
    user1Id: data.user1_id,
    user2Id: data.user2_id,
    otherUserId: data.user1_id === currentUserId ? data.user2_id : data.user1_id,
    otherProfile: otherProfile ? profileRowToUserProfile(otherProfile, (await getPrimaryProfilePhoto(data.user1_id === currentUserId ? data.user2_id : data.user1_id).catch(() => null))?.publicUrl) : null,
    createdAt: data.created_at,
    lastMessageAt: data.last_message_at,
  };
}

export async function getMessagesByMatchId(matchId: string): Promise<Message[]> {
  console.info('[ConnectBloom] messages fetch started', { matchIdExists: Boolean(matchId) });

  const { data, error } = await requireSupabaseClient()
    .from('messages')
    .select('id,match_id,sender_id,body,read_at,created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  const success = !error;
  console.info('[ConnectBloom] messages fetch success', { success });
  if (error) throw error;

  const messages = ((data ?? []) as MessageRow[]).map(mapMessageRow);
  console.info('[ConnectBloom] messages count', { count: messages.length });
  return messages;
}

export async function sendMessage(matchId: string, body: string): Promise<SendMessageResult> {
  const trimmedBody = body.trim();
  console.info('[ConnectBloom] send message started', { matchIdExists: Boolean(matchId), bodyExists: Boolean(trimmedBody) });

  if (!trimmedBody) {
    return { success: false, errorMessage: '会話内容を入力してください。' };
  }

  const currentUserId = await getCurrentUserId();
  const { data: rpcData, error: rpcError } = await requireSupabaseClient()
    .rpc('send_match_message', { target_match_id: matchId, message_body: trimmedBody });

  if (!rpcError) {
    const rpcRow = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as SendMatchMessageRpcRow | null | undefined;
    const success = Boolean(rpcRow?.success);
    console.info('[ConnectBloom] send message success', { success });

    if (!success) {
      return { success: false, errorMessage: rpcRow?.message ?? '会話の送信に失敗しました。' };
    }

    const sentMessage: Message = {
      id: rpcRow?.message_id ?? `${matchId}-${Date.now()}`,
      matchId,
      senderId: currentUserId,
      body: trimmedBody,
      createdAt: rpcRow?.created_at ?? new Date().toISOString(),
      readAt: null,
    };

    return {
      success: true,
      message: sentMessage,
      messageId: sentMessage.id,
      createdAt: sentMessage.createdAt,
    };
  }

  if (!isMissingRpcError(rpcError)) {
    console.info('[ConnectBloom] send message success', { success: false });
    throw rpcError;
  }

  const { data, error } = await requireSupabaseClient()
    .from('messages')
    .insert({ match_id: matchId, sender_id: currentUserId, body: trimmedBody })
    .select('id,match_id,sender_id,body,read_at,created_at')
    .single<MessageRow>();

  const success = !error;
  console.info('[ConnectBloom] send message success', { success });
  if (error) throw error;

  return {
    success: true,
    message: mapMessageRow(data),
    messageId: data.id,
    createdAt: data.created_at,
  };
}

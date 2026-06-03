import type { UserProfile } from '../types/user';
import type { ProfilePhoto, ProfilePhotoUploadResult, ProfilePhotoWithUrl } from '../types/profilePhoto';
import { requireSupabaseClient } from './supabase';

const PROFILE_PHOTO_BUCKET = 'profile-photos';
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type ProfilePhotoUploadStage =
  | 'storage-upload'
  | 'public-url'
  | 'existing-photos-fetch'
  | 'primary-update'
  | 'profile-photos-insert'
  | 'profiles-update'
  | 'saved-photo-fetch'
  | 'storage-rollback';

const profilePhotoColumns = 'id,user_id,storage_path,position,is_primary,created_at';

export { ALLOWED_PROFILE_PHOTO_TYPES, MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_BUCKET };

export class ProfilePhotoUploadError extends Error {
  stage: ProfilePhotoUploadStage;
  storageUploadSucceeded: boolean;
  rollbackAttempted: boolean;
  rollbackSucceeded: boolean | null;
  originalMessage: string;

  constructor({
    message,
    stage,
    originalMessage,
    storageUploadSucceeded = false,
    rollbackAttempted = false,
    rollbackSucceeded = null,
  }: {
    message: string;
    stage: ProfilePhotoUploadStage;
    originalMessage: string;
    storageUploadSucceeded?: boolean;
    rollbackAttempted?: boolean;
    rollbackSucceeded?: boolean | null;
  }) {
    super(message);
    this.name = 'ProfilePhotoUploadError';
    this.stage = stage;
    this.storageUploadSucceeded = storageUploadSucceeded;
    this.rollbackAttempted = rollbackAttempted;
    this.rollbackSucceeded = rollbackSucceeded;
    this.originalMessage = originalMessage;
  }
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return '詳細不明のエラーです';
}

function createUploadError(stage: ProfilePhotoUploadStage, message: string, error: unknown, storageUploadSucceeded = false) {
  const safeMessage = getSafeErrorMessage(error);
  return new ProfilePhotoUploadError({
    message: `${message}: ${safeMessage}`,
    stage,
    originalMessage: safeMessage,
    storageUploadSucceeded,
  });
}

async function removeUploadedPhoto(storagePath: string) {
  const { error } = await requireSupabaseClient().storage.from(PROFILE_PHOTO_BUCKET).remove([storagePath]);
  if (error) throw error;
}

async function rollbackUploadedPhoto(storagePath: string, cause: ProfilePhotoUploadError) {
  try {
    await removeUploadedPhoto(storagePath);
    cause.rollbackAttempted = true;
    cause.rollbackSucceeded = true;
  } catch (rollbackError) {
    cause.rollbackAttempted = true;
    cause.rollbackSucceeded = false;
    cause.message = `${cause.message}（Storage rollbackにも失敗しました: ${getSafeErrorMessage(rollbackError)}）`;
  }

  throw cause;
}

function getPublicUrl(storagePath: string) {
  const { data } = requireSupabaseClient().storage.from(PROFILE_PHOTO_BUCKET).getPublicUrl(storagePath);
  if (!data.publicUrl) {
    throw new ProfilePhotoUploadError({
      message: 'Storageへの保存は成功しましたが、public URLの取得に失敗しました',
      stage: 'public-url',
      originalMessage: 'public URLが空です',
      storageUploadSucceeded: true,
    });
  }
  return data.publicUrl;
}

function withPublicUrl(photo: ProfilePhoto): ProfilePhotoWithUrl {
  return {
    ...photo,
    publicUrl: getPublicUrl(photo.storage_path),
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'profile-photo';
}

function validateProfilePhotoFile(file: File | null | undefined) {
  console.info('[EnBloom] file exists', { exists: Boolean(file) });
  if (!file) throw new Error('画像ファイルを選択してください');

  console.info('[EnBloom] file size', { size: file.size });
  console.info('[EnBloom] file type', { type: file.type });

  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください');
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
    throw new Error('JPG / PNG / WebP の画像を選択してください');
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error('画像サイズは5MB以下にしてください');
  }
}

async function getCurrentUserId() {
  const { data, error } = await requireSupabaseClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('ログイン情報を確認できませんでした。もう一度ログインしてください。');
  return data.user.id;
}

export async function uploadProfilePhoto(file: File): Promise<ProfilePhotoUploadResult> {
  console.info('[EnBloom] profile photo upload started');
  validateProfilePhotoFile(file);

  const userId = await getCurrentUserId();
  const extension = EXTENSION_BY_TYPE[file.type] ?? sanitizeFileName(file.name).split('.').pop() ?? 'jpg';
  const storagePath = `${userId}/main-${Date.now()}.${extension}`;

  const { error: uploadError } = await requireSupabaseClient()
    .storage
    .from(PROFILE_PHOTO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  console.info('[EnBloom] upload success', { success: !uploadError, stage: 'storage-upload' });
  if (uploadError) throw createUploadError('storage-upload', 'Storageへの保存に失敗しました', uploadError);

  let publicUrl = '';
  try {
    publicUrl = getPublicUrl(storagePath);
    console.info('[EnBloom] public URL fetch success', { success: true, stage: 'public-url' });
  } catch (publicUrlError) {
    console.info('[EnBloom] public URL fetch success', { success: false, stage: 'public-url' });
    if (publicUrlError instanceof ProfilePhotoUploadError) {
      await rollbackUploadedPhoto(storagePath, publicUrlError);
    }
    await rollbackUploadedPhoto(
      storagePath,
      createUploadError('public-url', 'Storageへの保存は成功しましたが、public URLの取得に失敗しました', publicUrlError, true),
    );
  }

  const { data: existingPhotos, error: existingPhotosError } = await requireSupabaseClient()
    .from('profile_photos')
    .select('id,position,is_primary')
    .eq('user_id', userId)
    .order('position', { ascending: false });

  console.info('[EnBloom] existing profile photos fetch success', { success: !existingPhotosError, stage: 'existing-photos-fetch' });
  if (existingPhotosError) {
    await rollbackUploadedPhoto(
      storagePath,
      createUploadError('existing-photos-fetch', 'Storageへの保存は成功しましたが、既存画像情報の取得に失敗しました', existingPhotosError, true),
    );
  }

  const previousPrimaryPhoto = existingPhotos?.find((photo) => photo.is_primary) ?? null;
  const nextPosition = ((existingPhotos?.[0]?.position as number | undefined) ?? -1) + 1;

  const { error: primaryUpdateError } = await requireSupabaseClient()
    .from('profile_photos')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .eq('is_primary', true);

  console.info('[EnBloom] existing primary photo update success', { success: !primaryUpdateError, stage: 'primary-update' });
  if (primaryUpdateError) {
    await rollbackUploadedPhoto(
      storagePath,
      createUploadError('primary-update', 'Storageへの保存は成功しましたが、既存primary画像の更新に失敗しました', primaryUpdateError, true),
    );
  }

  const { data: insertedPhoto, error: insertError } = await requireSupabaseClient()
    .from('profile_photos')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      position: nextPosition,
      is_primary: true,
    })
    .select(profilePhotoColumns)
    .single<ProfilePhoto>();

  console.info('[EnBloom] profile photo row insert success', { success: !insertError, stage: 'profile-photos-insert' });
  if (insertError || !insertedPhoto) {
    if (previousPrimaryPhoto) {
      await requireSupabaseClient().from('profile_photos').update({ is_primary: true }).eq('id', previousPrimaryPhoto.id);
    }
    await rollbackUploadedPhoto(
      storagePath,
      createUploadError(
        'profile-photos-insert',
        'Storageへの保存は成功しましたが、profile_photosへの保存に失敗しました',
        insertError ?? '保存した画像行が返されませんでした',
        true,
      ),
    );
  }

  const insertedProfilePhoto = insertedPhoto as ProfilePhoto;

  const { data: savedPhoto, error: savedPhotoError } = await requireSupabaseClient()
    .from('profile_photos')
    .select(profilePhotoColumns)
    .eq('id', insertedProfilePhoto.id)
    .maybeSingle<ProfilePhoto>();

  console.info('[EnBloom] saved profile photo fetch success', { success: !savedPhotoError && Boolean(savedPhoto), stage: 'saved-photo-fetch' });
  if (savedPhotoError || !savedPhoto) {
    throw createUploadError(
      'saved-photo-fetch',
      '画像情報のDB保存は完了しましたが、保存後の画像取得に失敗しました',
      savedPhotoError ?? '保存した画像行を取得できませんでした',
      true,
    );
  }

  return { photo: { ...withPublicUrl(savedPhoto), publicUrl } };
}

export async function getMyPrimaryProfilePhoto(): Promise<ProfilePhotoWithUrl | null> {
  const userId = await getCurrentUserId();
  return getPrimaryProfilePhoto(userId);
}

export async function getPrimaryProfilePhoto(userId: string): Promise<ProfilePhotoWithUrl | null> {
  if (!userId) return null;

  const { data, error } = await requireSupabaseClient()
    .from('profile_photos')
    .select(profilePhotoColumns)
    .eq('user_id', userId)
    .eq('is_primary', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ProfilePhoto>();

  const success = !error;
  console.info('[EnBloom] primary photo fetch success', { success, stage: 'saved-photo-fetch' });
  if (error) throw createUploadError('saved-photo-fetch', 'primary画像取得に失敗しました', error);

  return data ? withPublicUrl(data) : null;
}

export async function getPrimaryProfilePhotos(userIds: string[]): Promise<Record<string, ProfilePhotoWithUrl>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return {};

  const { data, error } = await requireSupabaseClient()
    .from('profile_photos')
    .select(profilePhotoColumns)
    .in('user_id', uniqueUserIds)
    .eq('is_primary', true)
    .order('created_at', { ascending: false });

  const success = !error;
  console.info('[EnBloom] primary photo fetch success', { success, stage: 'saved-photo-fetch' });
  if (error) throw createUploadError('saved-photo-fetch', 'primary画像取得に失敗しました', error);

  return (data ?? []).reduce<Record<string, ProfilePhotoWithUrl>>((photosByUserId, photo) => {
    if (!photosByUserId[photo.user_id]) {
      photosByUserId[photo.user_id] = withPublicUrl(photo as ProfilePhoto);
    }
    return photosByUserId;
  }, {});
}

export function attachPrimaryPhotoUrls<T extends UserProfile>(profiles: T[], photosByUserId: Record<string, ProfilePhotoWithUrl>): T[] {
  return profiles.map((profile) => ({
    ...profile,
    photoUrl: photosByUserId[profile.id]?.publicUrl ?? profile.photoUrl,
    primaryPhotoUrl: photosByUserId[profile.id]?.publicUrl ?? profile.primaryPhotoUrl,
    avatarUrl: photosByUserId[profile.id]?.publicUrl ?? profile.avatarUrl,
  }));
}

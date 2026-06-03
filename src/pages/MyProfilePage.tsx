import { useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { getMyPrimaryProfilePhoto, uploadProfilePhoto } from '../lib/profilePhotoApi';
import { getMyProfile, profileRowToCurrentUser, updateMyProfile } from '../lib/profileApi';
import { DEFAULT_DATING_TEMPERATURE } from '../types/user';

export function MyProfilePage() {
  const { currentUser, saveCurrentUserProfile } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { themeId } = useTheme();
  const [form, setForm] = useState({
    name: currentUser.name,
    age: String(currentUser.age),
    location: currentUser.location,
    occupation: currentUser.occupation,
    bio: currentUser.bio,
    datingTemperature: currentUser.datingTemperature || DEFAULT_DATING_TEMPERATURE,
    interestsText: currentUser.interests.join('、'),
  });
  const [notice, setNotice] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  const [photoUrl, setPhotoUrl] = useState(currentUser.photoUrl ?? currentUser.primaryPhotoUrl ?? currentUser.avatarUrl ?? '');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!isSupabaseMode || !isAuthenticated || !user) return;

      try {
        const [profile, primaryPhoto] = await Promise.all([getMyProfile(user.id), getMyPrimaryProfilePhoto().catch(() => null)]);
        if (!mounted || !profile) return;
        const syncedProfile = profileRowToCurrentUser(profile, themeId);
        if (primaryPhoto?.publicUrl) {
          setPhotoUrl(primaryPhoto.publicUrl);
        }
        setForm({
          name: syncedProfile.name,
          age: String(syncedProfile.age),
          location: syncedProfile.location,
          occupation: syncedProfile.occupation,
          bio: syncedProfile.bio,
          datingTemperature: syncedProfile.datingTemperature || DEFAULT_DATING_TEMPERATURE,
          interestsText: syncedProfile.interests.join('、'),
        });
      } catch (caughtError) {
        if (!mounted) return;
        setNotice(caughtError instanceof Error ? `Supabaseプロフィールの取得に失敗しました: ${caughtError.message}` : 'Supabaseプロフィールの取得に失敗しました。');
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode, themeId, user]);

  function validateSelectedPhoto(file: File | null) {
    console.info('[ConnectBloom] file exists', { exists: Boolean(file) });
    if (!file) return '画像ファイルを選択してください';
    console.info('[ConnectBloom] file size', { size: file.size });
    console.info('[ConnectBloom] file type', { type: file.type });
    if (!file.type.startsWith('image/')) return '画像ファイルを選択してください';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'JPG / PNG / WebP の画像を選択してください';
    if (file.size > 5 * 1024 * 1024) return '画像サイズは5MB以下にしてください';
    return '';
  }

  function handlePhotoSelect(file: File | null) {
    setPhotoNotice('');
    if (selectedPhotoPreview) URL.revokeObjectURL(selectedPhotoPreview);

    const validationError = validateSelectedPhoto(file);
    if (validationError) {
      setSelectedPhotoFile(null);
      setSelectedPhotoPreview('');
      setPhotoNotice(validationError);
      return;
    }

    setSelectedPhotoFile(file);
    setSelectedPhotoPreview(file ? URL.createObjectURL(file) : '');
  }

  async function handlePhotoUpload() {
    if (!isSupabaseMode || !isAuthenticated) {
      setPhotoNotice('プロフィール画像アップロードはSupabase接続時に利用できます。');
      return;
    }

    const validationError = validateSelectedPhoto(selectedPhotoFile);
    if (validationError || !selectedPhotoFile) {
      setPhotoNotice(validationError || '画像ファイルを選択してください');
      return;
    }

    setUploadingPhoto(true);
    setPhotoNotice('');

    try {
      const result = await uploadProfilePhoto(selectedPhotoFile);
      setPhotoUrl(result.photo.publicUrl);
      saveCurrentUserProfile({ ...currentUser, photoUrl: result.photo.publicUrl, avatarUrl: result.photo.publicUrl, primaryPhotoUrl: result.photo.publicUrl });
      setSelectedPhotoFile(null);
      if (selectedPhotoPreview) URL.revokeObjectURL(selectedPhotoPreview);
      setSelectedPhotoPreview('');
      setPhotoNotice('プロフィール画像を保存しました');
    } catch (caughtError) {
      setPhotoNotice(caughtError instanceof Error ? `画像の保存に失敗しました: ${caughtError.message}` : 'アップロードに失敗しました。少し時間を置いてもう一度お試しください');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    const age = Number(form.age);
    if (!form.name.trim() || Number.isNaN(age) || age < 18 || !form.location.trim()) {
      setNotice('表示名・18歳以上の年齢・活動エリアを入力してください。');
      return;
    }

    const nextProfile = {
      ...currentUser,
      name: form.name.trim(),
      age,
      location: form.location.trim(),
      occupation: form.occupation.trim(),
      bio: form.bio.trim(),
      datingTemperature: form.datingTemperature.trim() || DEFAULT_DATING_TEMPERATURE,
      interests: form.interestsText.split(/[、,]/).map((interest) => interest.trim()).filter(Boolean),
      themePreference: themeId,
    };

    setSaving(true);
    setNotice('');

    try {
      if (isSupabaseMode && isAuthenticated && user) {
        await updateMyProfile({
          id: user.id,
          display_name: nextProfile.name,
          age: nextProfile.age,
          location: nextProfile.location,
          occupation: nextProfile.occupation,
          bio: nextProfile.bio,
          interests: nextProfile.interests,
          relationship_goal: nextProfile.relationshipGoal,
          dating_temperature: nextProfile.datingTemperature,
          onboarding_completed: true,
        });
      }

      saveCurrentUserProfile({ ...nextProfile, photoUrl: photoUrl || currentUser.photoUrl });
      setNotice(isSupabaseMode && isAuthenticated ? '編集内容をSupabase profilesとlocalStorageに保存しました。' : '編集内容をlocalStorageに保存しました。');
    } catch (caughtError) {
      setNotice(caughtError instanceof Error ? `保存に失敗しました: ${caughtError.message}` : '保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell description={isSupabaseMode && isAuthenticated ? 'Googleログイン後に作成したプロフィールを確認・編集できます。変更内容はSupabase profilesに保存され、表示安定のためlocalStorageにも反映します。' : '初回プロフィール登録や編集で保存した内容を確認・編集できます。変更内容はlocalStorageに保存されます。'} eyebrow="My Profile" title="マイプロフィール">
      <Card className="space-y-3.5">
        {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
        {!isSupabaseMode || !isAuthenticated ? <Badge className="w-fit">ローカルデモ</Badge> : null}
        <div className="flower-gradient rounded-[1.15rem] p-3">
          <div className="rounded-[1rem] bg-white/66 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              <ProfileAvatar className="size-24 rounded-[1.65rem] border border-white/80 shadow-xl" fallbackClassName="text-3xl font-black" user={{ name: form.name || '自分', gradient: 'from-sky-100 via-cyan-50 to-yellow-100', photoUrl: selectedPhotoPreview || photoUrl }} />
              <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                <div>
                  <p className="text-sm font-black text-theme-text">プロフィール画像</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">安心して雰囲気が伝わる、上品で自然な1枚を登録できます。</p>
                </div>
                {!isSupabaseMode || !isAuthenticated ? <Badge className="w-fit">Supabase接続時に利用できます</Badge> : null}
                {photoNotice ? <p className="rounded-xl bg-theme-accent-soft/70 px-3 py-2 text-xs font-bold text-theme-text">{photoNotice}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-theme-main/20 bg-theme-card px-4 py-2 text-sm font-black text-theme-main-dark shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    画像を選ぶ
                    <input accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!isSupabaseMode || !isAuthenticated || uploadingPhoto} onChange={(event) => handlePhotoSelect(event.target.files?.[0] ?? null)} type="file" />
                  </label>
                  <Button className="min-h-11" disabled={!selectedPhotoFile || uploadingPhoto || !isSupabaseMode || !isAuthenticated} onClick={handlePhotoUpload} variant="secondary">{uploadingPhoto ? 'アップロード中...' : 'プロフィール画像を保存'}</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Input helperText="アプリ内で表示される名前です。" label="表示名" name="myName" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="マイペース男" value={form.name} />
        <div className="grid grid-cols-2 gap-3"><Input helperText="18歳未満は利用できません。" label="年齢" name="myAge" onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} placeholder="39" type="number" value={form.age} /><Input helperText="大まかな活動エリアでOKです。" label="活動エリア" name="myLocation" onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="東京都・世田谷区 / オンライン" value={form.location} /></div>
        <Input helperText="未入力でも保存できます。あなたらしい一言として編集できます。" label="できること" name="myOccupation" onChange={(event) => setForm((current) => ({ ...current, occupation: event.target.value }))} placeholder="例：AIアプリ制作 / ブログ作業 / 音声配信" value={form.occupation} />
        <label className="block space-y-2 text-sm font-semibold text-theme-text">
          <span>自己紹介</span>
          <textarea className="min-h-24 w-full rounded-xl border border-theme-main/20 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-main focus:ring-4 focus:ring-theme-main/15" onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="例：一緒にやりたいこと、話したいテーマ、探している活動仲間を書いてください。" value={form.bio} />
          <span className="block text-xs font-medium leading-5 text-theme-muted">自己紹介には「一緒にやりたいこと」「話したいテーマ」「探している仲間」を書けます。</span>
        </label>
        <Input helperText="つながり方のスタンスです。例：まずはゆっくり話したい / 一緒に企画・制作したい" label="つながり方のスタンス" name="myDatingTemperature" onChange={(event) => setForm((current) => ({ ...current, datingTemperature: event.target.value }))} placeholder="まずはゆっくり話したい" value={form.datingTemperature} />
        <Input helperText="活動ジャンル・興味のあること・話したいテーマを読点（、）やカンマで区切って入力します。" label="活動ジャンル / 興味タグ（読点区切り）" name="myInterests" onChange={(event) => setForm((current) => ({ ...current, interestsText: event.target.value }))} placeholder="AI、ブログ、音声配信、ゲーム制作、作業仲間" value={form.interestsText} />
        <div className="flex flex-wrap gap-1.5">{form.interestsText.split(/[、,]/).map((interest) => interest.trim()).filter(Boolean).map((interest) => <Badge key={interest}>{interest}</Badge>)}</div>
        <p className="text-xs font-medium leading-5 text-theme-muted">変更内容は保存できます。保存後もこの画面で確認・編集できます。</p>
        <Button className="w-full" disabled={saving} onClick={handleSave}>{saving ? '保存中...' : '編集内容を保存'}</Button>
      </Card>
    </PageShell>
  );
}

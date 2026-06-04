import { useEffect, useRef, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { getShortErrorMessage } from '../lib/errorMessage';
import { getMyPrimaryProfilePhoto, uploadProfilePhoto } from '../lib/profilePhotoApi';
import { getMyProfile, profileRowToCurrentUser, updateMyProfile } from '../lib/profileApi';
import { DEFAULT_DATING_TEMPERATURE } from '../types/user';

const suggestedInterestTags = ['映画', '旅行', 'カフェ', '音楽', '読書', '散歩', 'AI制作'];
const suggestedDatingTemperatures = ['まずはゆっくり話したい', '価値観が合えば前向きに進めたい', '一緒に企画・制作したい', '気軽に情報交換したい'];

function parseInterestTags(text: string) {
  return Array.from(new Set(text.split(/[、,]/).map((interest) => interest.trim()).filter(Boolean)));
}

function SentenceLines({ text }: { text: string }) {
  const lines = text.split(/(?<=。)/).map((line) => line.trim()).filter(Boolean);

  return (
    <>
      {lines.map((line) => (
        <span className="block" key={line}>{line}</span>
      ))}
    </>
  );
}

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
  const [showDatingTemperatureSuggestions, setShowDatingTemperatureSuggestions] = useState(false);
  const datingTemperatureFieldRef = useRef<HTMLDivElement>(null);
  const selectedInterests = parseInterestTags(form.interestsText);

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
        setNotice(getShortErrorMessage(caughtError, 'プロフィールの取得に失敗しました。時間を置いてもう一度お試しください。'));
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isSupabaseMode, themeId, user]);

  useEffect(() => {
    if (!showDatingTemperatureSuggestions) return;

    function handlePointerDown(event: PointerEvent) {
      if (datingTemperatureFieldRef.current?.contains(event.target as Node)) return;
      setShowDatingTemperatureSuggestions(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showDatingTemperatureSuggestions]);

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
      setPhotoNotice('プロフィール画像アップロードはログイン後に利用できます。');
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
      setPhotoNotice(getShortErrorMessage(caughtError, '画像の保存に失敗しました。別の画像でお試しください。'));
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleSuggestedInterestClick(tag: string) {
    setForm((current) => {
      const interests = parseInterestTags(current.interestsText);
      if (interests.includes(tag)) return current;
      return { ...current, interestsText: [...interests, tag].join('、') };
    });
  }

  function handleSuggestedDatingTemperatureClick(datingTemperature: string) {
    setForm((current) => ({ ...current, datingTemperature }));
    setShowDatingTemperatureSuggestions(false);
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
      interests: parseInterestTags(form.interestsText),
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
      setNotice('プロフィールを保存しました。');
    } catch (caughtError) {
      setNotice(getShortErrorMessage(caughtError, '保存に失敗しました。時間を置いてもう一度お試しください。'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell description={<SentenceLines text="プロフィールを確認・編集できます。一緒にやりたいことや、話してみたいテーマを整えておきましょう。" />} eyebrow="My Profile" title="マイプロフィール">
      <Card className="space-y-3.5">
        {notice ? <div className="rounded-[1.15rem] bg-theme-accent-soft/70 p-3 text-sm font-bold text-theme-text">{notice}</div> : null}
        {!isSupabaseMode || !isAuthenticated ? <Badge className="w-fit">デモ表示</Badge> : null}
        <div className="flower-gradient rounded-[1.15rem] p-3">
          <div className="rounded-[1rem] bg-white/66 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
              <ProfileAvatar className="size-24 rounded-[1.65rem] border border-white/80 shadow-xl" fallbackClassName="text-3xl font-black" user={{ name: form.name || '自分', gradient: 'from-sky-100 via-cyan-50 to-yellow-100', photoUrl: selectedPhotoPreview || photoUrl }} />
              <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
                <div>
                  <p className="text-sm font-black text-theme-text">プロフィール画像</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-theme-muted">安心して雰囲気が伝わる、上品で自然な1枚を登録できます。</p>
                </div>
                {!isSupabaseMode || !isAuthenticated ? <Badge className="w-fit">ログイン後に利用できます</Badge> : null}
                {photoNotice ? <p className="rounded-xl bg-theme-accent-soft/70 px-3 py-2 text-xs font-bold text-theme-text">{photoNotice}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-theme-sky/30 bg-theme-card px-4 py-2 text-sm font-black text-theme-main-dark shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
          <textarea className="min-h-24 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="例：一緒にやりたいこと、話したいテーマ、探している仲間を書いてください。" value={form.bio} />
          <span className="block text-xs font-medium leading-5 text-theme-muted">一緒にやりたいこと、話したいテーマ、探している仲間を書いてみましょう。</span>
        </label>
        <div ref={datingTemperatureFieldRef} className="relative space-y-2 text-sm font-semibold text-theme-text">
          <span id="myDatingTemperatureLabel">つながり方のスタンス</span>
          <button
            aria-controls="dating-temperature-options"
            aria-expanded={showDatingTemperatureSuggestions}
            aria-haspopup="listbox"
            aria-labelledby="myDatingTemperatureLabel"
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 py-3 text-left text-sm text-theme-text outline-none transition focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15 active:scale-[0.99]"
            id="myDatingTemperature"
            onClick={() => setShowDatingTemperatureSuggestions((current) => !current)}
            type="button"
          >
            <span className={form.datingTemperature ? 'truncate font-bold' : 'truncate font-medium text-theme-muted'}>
              {form.datingTemperature || 'つながり方のスタンスを選択'}
            </span>
            <span aria-hidden="true" className={`shrink-0 text-base text-theme-main-dark transition-transform ${showDatingTemperatureSuggestions ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          <span className="block text-xs font-medium leading-5 text-theme-muted">どんな距離感で話したいかを4つの候補から選べます。</span>
          {showDatingTemperatureSuggestions ? (
            <div className="absolute left-0 right-0 z-30 overflow-hidden rounded-[1.35rem] border border-white/15 bg-neutral-900/82 p-1.5 shadow-2xl shadow-neutral-950/20 backdrop-blur-md" id="dating-temperature-options" role="listbox" aria-label="つながり方のスタンス候補">
              <div className="max-h-72 overflow-y-auto py-1">
                {suggestedDatingTemperatures.map((datingTemperature) => {
                  const selected = form.datingTemperature === datingTemperature;
                  return (
                    <button
                      aria-selected={selected}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-bold transition active:scale-[0.98] ${selected ? 'bg-white/95 text-neutral-950 shadow-sm' : 'text-white hover:bg-white/15'}`}
                      key={datingTemperature}
                      onClick={() => handleSuggestedDatingTemperatureClick(datingTemperature)}
                      role="option"
                      type="button"
                    >
                      <span>{datingTemperature}</span>
                      {selected ? <span aria-hidden="true" className="text-base">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <Input helperText="興味のあることを読点やカンマで入力できます。候補タグをタップして追加もできます。" label="活動ジャンル / 興味タグ（読点区切り）" name="myInterests" onChange={(event) => setForm((current) => ({ ...current, interestsText: event.target.value }))} placeholder="AI、ブログ、音声配信、ゲーム制作、作業仲間" value={form.interestsText} />
        <div className="flex flex-wrap gap-1">
          {suggestedInterestTags.map((tag) => {
            const selected = selectedInterests.includes(tag);
            return (
              <button
                aria-label={`${tag}を活動ジャンル / 興味タグに追加`}
                className={`min-h-7 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5 transition hover:-translate-y-0.5 active:scale-[0.97] ${selected ? 'bg-gradient-to-r from-theme-yellow/85 to-theme-sky/45 text-theme-main-dark ring-1 ring-theme-sky/30' : 'bg-theme-card text-theme-text ring-1 ring-theme-sky/20 hover:bg-theme-accent-soft/70'}`}
                key={tag}
                onClick={() => handleSuggestedInterestClick(tag)}
                type="button"
              >
                {tag}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-medium leading-5 text-theme-muted">変更内容は保存後もこの画面で確認・編集できます。</p>
        <Button className="w-full" disabled={saving} onClick={handleSave}>{saving ? '保存中...' : '編集内容を保存'}</Button>
      </Card>
    </PageShell>
  );
}

import { useEffect, useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!isSupabaseMode || !isAuthenticated || !user) return;

      try {
        const profile = await getMyProfile(user.id);
        if (!mounted || !profile) return;
        const syncedProfile = profileRowToCurrentUser(profile, themeId);
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

  async function handleSave() {
    const age = Number(form.age);
    if (!form.name.trim() || Number.isNaN(age) || age < 18 || !form.location.trim()) {
      setNotice('表示名・18歳以上の年齢・地域を入力してください。');
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

      saveCurrentUserProfile(nextProfile);
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
        <div className="flower-gradient flex h-36 items-center justify-center rounded-[1.15rem]">
          <span className="flex size-20 items-center justify-center rounded-[1.45rem] bg-white/80 text-3xl font-black text-theme-main-dark">{form.name.slice(0, 1) || '自'}</span>
        </div>
        <Input helperText="アプリ内で表示される名前です。" label="表示名" name="myName" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="マイペース男" value={form.name} />
        <div className="grid grid-cols-2 gap-3"><Input helperText="18歳未満は利用できません。" label="年齢" name="myAge" onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))} placeholder="39" type="number" value={form.age} /><Input helperText="大まかな地域でOKです。" label="地域" name="myLocation" onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="東京都・世田谷区" value={form.location} /></div>
        <Input helperText="未入力でも保存できます。あなたらしい一言として編集できます。" label="職業" name="myOccupation" onChange={(event) => setForm((current) => ({ ...current, occupation: event.target.value }))} placeholder="例：会社員 / 休日はカフェ巡り" value={form.occupation} />
        <label className="block space-y-2 text-sm font-semibold text-theme-text">
          <span>自己紹介</span>
          <textarea className="min-h-24 w-full rounded-xl border border-theme-main/20 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-main focus:ring-4 focus:ring-theme-main/15" onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="例：休日は散歩やカフェでゆっくり過ごすのが好きです。" value={form.bio} />
          <span className="block text-xs font-medium leading-5 text-theme-muted">自己紹介はあとから何度でも編集できます。</span>
        </label>
        <Input helperText="今の出会い方の希望です。例：ゆっくり会話から始めたい" label="出会いの温度感" name="myDatingTemperature" onChange={(event) => setForm((current) => ({ ...current, datingTemperature: event.target.value }))} placeholder="ゆっくり会話から始めたい" value={form.datingTemperature} />
        <Input helperText="読点（、）やカンマで区切って入力します。あとから編集できます。" label="趣味タグ（読点区切り）" name="myInterests" onChange={(event) => setForm((current) => ({ ...current, interestsText: event.target.value }))} placeholder="読書、映画、カフェ" value={form.interestsText} />
        <div className="flex flex-wrap gap-1.5">{form.interestsText.split(/[、,]/).map((interest) => interest.trim()).filter(Boolean).map((interest) => <Badge key={interest}>{interest}</Badge>)}</div>
        <p className="text-xs font-medium leading-5 text-theme-muted">変更内容は保存できます。保存後もこの画面で確認・編集できます。</p>
        <Button className="w-full" disabled={saving} onClick={handleSave}>{saving ? '保存中...' : '編集内容を保存'}</Button>
      </Card>
    </PageShell>
  );
}

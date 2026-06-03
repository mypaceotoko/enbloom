import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Flower2, MapPin, Palette, Tags, Ticket, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { PageShell } from '../components/PageShell';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { useTheme } from '../context/ThemeProvider';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { validateInviteCode, useInviteCode as redeemInviteCode } from '../lib/inviteCodeApi';
import { upsertMyProfile } from '../lib/profileApi';
import { DEFAULT_DATING_TEMPERATURE, type CurrentUserProfile } from '../types/user';

const tags = ['AI', 'ブログ', '音声配信', 'ラジオ', 'YouTube', 'ダンス', '歌', '音楽', 'ライブ', '映画', '怪談', '漫画', 'アニメ', 'ゲーム', 'ゲーム制作', 'イベント同行', '地域交流', '海外', '旅行', 'カフェ', '読書', '作業仲間', '企画仲間', '相談相手', 'コラボ', '創作', '写真', '動画制作'];
const steps = ['基本情報', 'スタンス', '活動タグ', '招待コード'];

type OnboardingForm = {
  name: string;
  age: string;
  location: string;
  occupation: string;
  bio: string;
  datingTemperature: string;
  interests: string[];
  inviteCode: string;
};

type ValidationField = 'displayName' | 'age' | 'location' | 'datingTemperature' | 'interests' | 'inviteCode';
type StepKey = 'basic' | 'temperature' | 'interests' | 'inviteCode';
type ValidationErrors = Partial<Record<ValidationField, string>>;

type NormalizedForm = {
  displayName: string;
  age: number;
  location: string;
  occupation: string;
  bio: string;
  datingTemperature: string;
  selectedInterestTags: string[];
  inviteCode: string;
};

const fieldStepOrder: Array<{ field: ValidationField; step: StepKey }> = [
  { field: 'displayName', step: 'basic' },
  { field: 'age', step: 'basic' },
  { field: 'location', step: 'basic' },
  { field: 'datingTemperature', step: 'temperature' },
  { field: 'interests', step: 'interests' },
  { field: 'inviteCode', step: 'inviteCode' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { currentUser, completeOnboarding } = useAppState();
  const { isAuthenticated, isSupabaseMode, user } = useAuth();
  const { themeId } = useTheme();
  const [form, setForm] = useState<OnboardingForm>({
    name: currentUser.name,
    age: String(currentUser.age),
    location: currentUser.location,
    occupation: currentUser.occupation,
    bio: currentUser.bio,
    datingTemperature: currentUser.datingTemperature || DEFAULT_DATING_TEMPERATURE,
    interests: currentUser.interests,
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const basicStepRef = useRef<HTMLDivElement>(null);
  const temperatureStepRef = useRef<HTMLDivElement>(null);
  const interestsStepRef = useRef<HTMLDivElement>(null);
  const inviteCodeStepRef = useRef<HTMLDivElement>(null);

  function updateField(field: keyof OnboardingForm, value: string | string[]) {
    setForm((current) => ({ ...current, [field]: value }));
    const fieldErrorMap: Partial<Record<keyof OnboardingForm, ValidationField>> = {
      name: 'displayName',
      age: 'age',
      location: 'location',
      datingTemperature: 'datingTemperature',
      interests: 'interests',
      inviteCode: 'inviteCode',
    };
    const errorField = fieldErrorMap[field];
    if (errorField) {
      setValidationErrors((current) => ({ ...current, [errorField]: undefined }));
    }
  }

  function toggleTag(tag: string) {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(tag) ? current.interests.filter((interest) => interest !== tag) : [...current.interests, tag],
    }));
    setValidationErrors((current) => ({ ...current, interests: undefined }));
  }

  function showError(message: string) {
    setError(message);
    setStatusMessage('');
  }

  function logOnboardingStep(step: string, details: Record<string, boolean | string | number | string[] | null> = {}) {
    console.info('[Onboarding] ' + step, details);
  }

  function getNormalizedForm(): NormalizedForm {
    return {
      displayName: form.name.trim(),
      age: Number(form.age),
      location: form.location.trim(),
      occupation: form.occupation.trim() || '興味や活動を準備中',
      bio: form.bio.trim() || '一緒にやりたいことや話したいテーマを準備中です。',
      datingTemperature: form.datingTemperature.trim() || DEFAULT_DATING_TEMPERATURE,
      selectedInterestTags: Array.isArray(form.interests) ? form.interests : [],
      inviteCode: form.inviteCode.trim().toUpperCase(),
    };
  }

  function validateOnboardingForm(normalizedForm: NormalizedForm) {
    const nextValidationErrors: ValidationErrors = {};
    const ageInputExists = form.age.trim().length > 0;

    if (!normalizedForm.displayName) {
      nextValidationErrors.displayName = '表示名を入力してください';
    }

    if (!ageInputExists) {
      nextValidationErrors.age = '年齢を入力してください';
    } else if (!Number.isFinite(normalizedForm.age)) {
      nextValidationErrors.age = '年齢を半角数字で入力してください';
    } else if (normalizedForm.age < 18) {
      nextValidationErrors.age = '年齢を18歳以上で入力してください';
    }

    if (!normalizedForm.location) {
      nextValidationErrors.location = '活動エリアを入力してください';
    }

    if (!normalizedForm.datingTemperature) {
      nextValidationErrors.datingTemperature = 'つながり方のスタンスを選択してください';
    }

    if (normalizedForm.selectedInterestTags.length === 0) {
      nextValidationErrors.interests = '活動ジャンル / 興味タグを1つ以上選んでください';
    }

    if (isSupabaseMode && isAuthenticated && user && !normalizedForm.inviteCode) {
      nextValidationErrors.inviteCode = '招待コードを入力してください';
    }

    const firstMissingStep = fieldStepOrder.find(({ field }) => nextValidationErrors[field])?.step ?? null;

    return {
      errors: nextValidationErrors,
      firstMissingStep,
      missingMessages: Object.values(nextValidationErrors).filter((message): message is string => Boolean(message)),
    };
  }

  function scrollToStep(step: StepKey | null) {
    if (!step) return;
    const stepRefMap = {
      basic: basicStepRef,
      temperature: temperatureStepRef,
      interests: interestsStepRef,
      inviteCode: inviteCodeStepRef,
    };
    window.setTimeout(() => {
      stepRefMap[step].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  async function handleComplete() {
    const normalizedForm = getNormalizedForm();
    logOnboardingStep('onboarding submit started', {
      supabaseMode: isSupabaseMode,
      authenticated: isAuthenticated,
      displayNameExists: Boolean(normalizedForm.displayName),
      ageValid: Number.isFinite(normalizedForm.age) && normalizedForm.age >= 18,
      locationExists: Boolean(normalizedForm.location),
      datingTemperatureExists: Boolean(normalizedForm.datingTemperature),
      interestsCount: normalizedForm.selectedInterestTags.length,
      inviteCodeExists: Boolean(normalizedForm.inviteCode),
      saving,
    });

    if (saving) {
      logOnboardingStep('submit ignored while saving');
      return;
    }

    const validationResult = validateOnboardingForm(normalizedForm);
    logOnboardingStep('validation result', {
      valid: validationResult.missingMessages.length === 0,
      displayNameExists: Boolean(normalizedForm.displayName),
      ageValid: Number.isFinite(normalizedForm.age) && normalizedForm.age >= 18,
      locationExists: Boolean(normalizedForm.location),
      datingTemperatureExists: Boolean(normalizedForm.datingTemperature),
      interestsCount: normalizedForm.selectedInterestTags.length,
      inviteCodeExists: Boolean(normalizedForm.inviteCode),
    });
    logOnboardingStep('missing fields list', { fields: validationResult.missingMessages });

    if (validationResult.missingMessages.length > 0) {
      setValidationErrors(validationResult.errors);
      showError('まだ入力が足りない項目があります。以下を確認してください。');
      scrollToStep(validationResult.firstMissingStep);
      return;
    }

    setValidationErrors({});

    const profile: CurrentUserProfile = {
      ...currentUser,
      name: normalizedForm.displayName,
      age: normalizedForm.age,
      location: normalizedForm.location,
      occupation: normalizedForm.occupation,
      bio: normalizedForm.bio,
      datingTemperature: normalizedForm.datingTemperature,
      interests: normalizedForm.selectedInterestTags,
      themePreference: themeId,
    };

    setSaving(true);
    setError('');
    setStatusMessage('保存を開始しています。');

    try {
      if (isSupabaseMode && isAuthenticated && user) {
        setStatusMessage('招待コードを確認しています。');
        const inviteValidation = await validateInviteCode(normalizedForm.inviteCode);
        logOnboardingStep('validateInviteCode success', { success: inviteValidation.ok, inviteCodeExists: Boolean(normalizedForm.inviteCode) });
        if (!inviteValidation.ok) {
          setValidationErrors({ inviteCode: inviteValidation.error });
          showError(inviteValidation.error);
          scrollToStep('inviteCode');
          logOnboardingStep('validateInviteCode success', { success: false });
          return;
        }

        setStatusMessage('招待コードを確認しました。プロフィールを保存しています。');
        try {
          await upsertMyProfile({
            id: user.id,
            display_name: profile.name,
            age: profile.age,
            location: profile.location,
            occupation: profile.occupation,
            bio: profile.bio,
            interests: profile.interests,
            relationship_goal: profile.relationshipGoal,
            dating_temperature: profile.datingTemperature,
            onboarding_completed: true,
            visibility: 'public',
            role: 'user',
          });
          logOnboardingStep('profile save success', { success: true });
        } catch (profileError) {
          const message = profileError instanceof Error ? profileError.message : '';
          const userMessage = message ? `プロフィール保存に失敗しました。${message}` : 'プロフィール保存に失敗しました。少し時間を置いてもう一度お試しください。';
          showError(userMessage);
          logOnboardingStep('profile save success', { success: false });
          return;
        }

        setStatusMessage('プロフィールを保存しました。紹介情報を保存しています。');
        const inviteUse = await redeemInviteCode(inviteValidation.inviteCode.code, user.id);
        logOnboardingStep('useInviteCode success', { success: inviteUse.ok });
        if (!inviteUse.ok) {
          setValidationErrors({ inviteCode: inviteUse.error });
          showError(inviteUse.error);
          scrollToStep('inviteCode');
          return;
        }
        setStatusMessage('紹介情報を保存しました。今日のつながりへ進みます。');
      }

      completeOnboarding(profile);
      logOnboardingStep('navigate home', { success: true });
      setStatusMessage('プロフィールを保存しました。今日のつながりへ進みます。');
      setTimeout(() => {
        navigate('/home', { state: { profileSaved: true, message: 'プロフィールを保存しました。今日のつながりへ進みます。' } });
      }, 350);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : '通信に失敗しました。少し時間を置いてもう一度お試しください。';
      showError(message);
      logOnboardingStep('unexpected error', { success: false });
    } finally {
      setSaving(false);
    }
  }

  const missingMessages = Object.values(validationErrors).filter((message): message is string => Boolean(message));

  return (
    <PageShell description="まずは、あなたのプロフィールを作りましょう。ここで入力した内容はマイプロフィールに保存され、あとから編集できます。" eyebrow="プロフィール作成" title="はじめてのプロフィール">
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/78 p-3.5 backdrop-blur">
          <div className="flex items-center gap-1.5 text-sm font-black text-theme-main-dark"><Flower2 size={18} />まずは、あなたのプロフィールを作りましょう</div>
          <p className="mt-2 text-[13px] leading-6 text-theme-muted">ここで入力した内容は、あなたのマイプロフィールに保存されます。まだ公開前のため、今はテスト入力でOKです。</p>
          <p className="mt-1 text-[13px] leading-6 text-theme-muted">登録後は今日のつながりへ進みます。プロフィールは、あとから設定やマイプロフィールで確認・編集できます。</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {steps.map((step, index) => (
              <div className="rounded-xl bg-theme-card/80 p-2.5 text-center" key={step}>
                <span className="mx-auto flex size-6 items-center justify-center rounded-full bg-theme-main text-xs font-black text-white">{index + 1}</span>
                <p className="mt-1.5 text-[10.5px] font-black text-theme-text">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {error ? <ValidationSummary message={error} missingMessages={missingMessages} /> : null}
      {statusMessage ? <div className="rounded-[1.15rem] bg-theme-accent-soft/55 p-3 text-sm font-bold leading-6 text-theme-main-dark" role="status">{statusMessage}</div> : null}

      <div ref={basicStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<UserRound size={18} />} label="Step 1" title="基本情報" />
          <StepErrors errors={[validationErrors.displayName, validationErrors.age, validationErrors.location]} />
          <Input helperText="アプリ内で表示される名前です。あとからマイプロフィールで編集できます。" label="表示名" name="displayName" onChange={(event) => updateField('name', event.target.value)} placeholder="マイペース男" value={form.name} />
          {validationErrors.displayName ? <FieldError message={validationErrors.displayName} /> : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Input helperText="18歳未満は利用できません。" label="年齢" name="age" onChange={(event) => updateField('age', event.target.value)} placeholder="39" type="number" value={form.age} />
              {validationErrors.age ? <FieldError message={validationErrors.age} /> : null}
            </div>
            <div className="space-y-2">
              <Input helperText="大まかな活動エリアでOKです。前後の空白は保存時に自動で整理します。" label="活動エリア" name="location" onChange={(event) => updateField('location', event.target.value)} placeholder="東京都・世田谷区 / オンライン" value={form.location} />
              {validationErrors.location ? <FieldError message={validationErrors.location} /> : null}
            </div>
          </div>
          <Input helperText="未入力でも大丈夫です。できること・活動ジャンルの補足としてあとから編集できます。" label="できること" name="occupation" onChange={(event) => updateField('occupation', event.target.value)} placeholder="例：AIアプリ制作 / ブログ作業 / イベント企画" value={form.occupation} />
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>自己紹介</span>
            <textarea className="min-h-24 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" onChange={(event) => updateField('bio', event.target.value)} placeholder="例：一緒にやりたいこと、話したいテーマ、探している仲間を書いてください。" value={form.bio} />
            <span className="block text-xs font-medium leading-5 text-theme-muted">自己紹介には「興味のあること」「一緒にやりたいこと」「話したいテーマ」を書けます。</span>
          </label>
        </Card>
      </div>

      <div ref={temperatureStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<MapPin size={18} />} label="Step 2" title="つながり方のスタンス" />
          <StepErrors errors={[validationErrors.datingTemperature]} />
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>今の気持ちに近いもの</span>
            <p className="text-xs font-medium leading-5 text-theme-muted">どんなきっかけでつながりたいかに近いものを1つ選んでください。</p>
            <p className="text-xs font-bold leading-5 text-theme-main-dark">迷ったら“まずはゆっくり話したい”のままで大丈夫です。あとからマイプロフィールで変更できます。</p>
            <select className="min-h-11 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" onChange={(event) => updateField('datingTemperature', event.target.value)} value={form.datingTemperature}>
              <option value={DEFAULT_DATING_TEMPERATURE}>{DEFAULT_DATING_TEMPERATURE}</option>
              <option>共通の趣味でつながりたい</option>
              <option>一緒に企画・制作したい</option>
              <option>イベントや活動で会って話したい</option>
              <option>相談・情報交換から始めたい</option>
            </select>
          </label>
          {validationErrors.datingTemperature ? <FieldError message={validationErrors.datingTemperature} /> : null}
        </Card>
      </div>

      <div ref={interestsStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<Tags size={18} />} label="Step 3" title="活動ジャンル / 興味タグ" />
          <StepErrors errors={[validationErrors.interests]} />
          <div className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-sm font-black"><Tags size={16} />活動ジャンル / 興味タグ</p>
            <p className="text-xs leading-5 text-theme-muted">活動ジャンルや興味のあることを1つ以上選んでください。選んだタグはマイプロフィールに保存され、あとから編集できます。</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const selected = form.interests.includes(tag);
                return <button className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selected ? 'bg-gradient-to-r from-theme-yellow/85 to-theme-sky/45 text-theme-main-dark ring-1 ring-theme-sky/30' : 'bg-theme-background/80 text-theme-text ring-1 ring-theme-sky/15'}`} key={tag} onClick={() => toggleTag(tag)} type="button">{tag}</button>;
              })}
            </div>
            {validationErrors.interests ? <FieldError message={validationErrors.interests} /> : null}
          </div>
        </Card>
      </div>

      <div ref={inviteCodeStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<Ticket size={18} />} label="Step 4" title="招待コード" />
          <StepErrors errors={[validationErrors.inviteCode]} />
          <Input
            helperText={isSupabaseMode ? '紹介者から受け取った招待コードを入力してください。Supabase接続時は必須です。入力値は保存前に大文字化します。' : 'ローカルデモでは任意です。MYPACE-2026 のようなテストコードも入力できます。'}
            label="招待コード"
            name="inviteCode"
            onChange={(event) => updateField('inviteCode', event.target.value.toUpperCase())}
            placeholder="例：MYPACE-2026"
            value={form.inviteCode}
          />
          {validationErrors.inviteCode ? <FieldError message={validationErrors.inviteCode} /> : null}
          <div className="rounded-[1.15rem] bg-theme-accent-soft/45 p-3 text-xs font-bold leading-5 text-theme-main-dark">
            招待コードは1回限りのチケットではなく、紹介者に紐づいた参加ルートです。同じコードで参加した方は、紹介者からのご縁として記録されます。
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionTitle icon={<Palette size={18} />} label="Step 5" title="テーマを選ぶ" />
        <p className="text-sm leading-6 text-theme-muted">画面の雰囲気を選べます。テーマはプロフィール登録後も設定から変更できます。</p>
        <ThemeSwitcher />
        <Badge className="w-fit">現在のテーマ: {themeId}</Badge>
      </Card>

      <div className="sticky bottom-24 z-10 rounded-[1.25rem] border border-white/60 bg-theme-card/90 p-2.5 shadow-2xl shadow-theme-main/15 backdrop-blur">
        <p className="mb-2 px-1 text-center text-xs font-bold leading-5 text-theme-muted">入力内容を保存して、今日のつながりを見に行きます。プロフィールはあとから編集できます。</p>
        {error ? <ValidationSummary compact message={error} missingMessages={missingMessages} /> : null}
        {statusMessage ? <div className="mb-2 rounded-xl bg-theme-accent-soft/60 p-2.5 text-xs font-bold leading-5 text-theme-main-dark" role="status">{statusMessage}</div> : null}
        <Button className="w-full" disabled={saving} onClick={handleComplete}>
          <CheckCircle2 size={16} />
          {saving ? '保存中...' : '今日のつながりへ進む'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </PageShell>
  );
}

function SectionTitle({ icon, label, title }: { icon: ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-xl bg-theme-accent-soft text-theme-main-dark">{icon}</span>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-theme-main-dark">{label}</p>
        <h2 className="font-black text-theme-text">{title}</h2>
      </div>
    </div>
  );
}

function ValidationSummary({ compact = false, message, missingMessages }: { compact?: boolean; message: string; missingMessages: string[] }) {
  return (
    <div className={`${compact ? 'mb-2 rounded-xl p-2.5 text-xs' : 'rounded-[1.15rem] p-3 text-sm'} bg-red-50 font-bold leading-6 text-red-600`} role="alert">
      <p>{message}</p>
      {missingMessages.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          {missingMessages.map((missingMessage) => <li key={missingMessage}>{missingMessage}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

function StepErrors({ errors }: { errors: Array<string | undefined> }) {
  const visibleErrors = errors.filter((error): error is string => Boolean(error));
  if (visibleErrors.length === 0) return null;

  return (
    <div className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-600" role="alert">
      <p>このSTEPで確認してください。</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {visibleErrors.map((error) => <li key={error}>{error}</li>)}
      </ul>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs font-bold leading-5 text-red-600">{message}</p>;
}

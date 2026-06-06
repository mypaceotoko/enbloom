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
import { DATING_TEMPERATURE_OPTIONS, normalizeDatingTemperature } from '../constants/datingTemperature';
import { useAppState } from '../hooks/useAppState';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { getSafeErrorLog } from '../lib/errorMessage';
import { isFounderInviteCode, isInviteCodeSelfUseError, validateInviteCode, useInviteCode as redeemInviteCode } from '../lib/inviteCodeApi';
import { clearPendingInviteCode, getPendingInviteCode, normalizeInviteCodeInput } from '../lib/inviteSession';
import { upsertMyProfile } from '../lib/profileApi';
import type { CurrentUserProfile } from '../types/user';

const tags = ['AI', 'ブログ', '音声配信', 'ラジオ', 'YouTube', 'ダンス', '歌', '音楽', 'ライブ', '映画', '怪談', '漫画', 'アニメ', 'ゲーム', 'ゲーム制作', 'イベント同行', '地域交流', '海外', '旅行', 'カフェ', '読書', '作業仲間', '企画仲間', '相談相手', 'コラボ', '創作', '写真', '動画制作'];

type OnboardingForm = {
  name: string;
  age: string;
  location: string;
  occupation: string;
  bio: string;
  talkTopics: string;
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
  talkTopics: string;
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
  const { t } = useLanguage();
  const { themeId } = useTheme();
  const [form, setForm] = useState<OnboardingForm>({
    name: currentUser.name,
    age: String(currentUser.age),
    location: currentUser.location,
    occupation: currentUser.occupation,
    bio: currentUser.bio,
    talkTopics: currentUser.talkTopics ?? '',
    datingTemperature: normalizeDatingTemperature(currentUser.datingTemperature),
    interests: currentUser.interests,
    inviteCode: getPendingInviteCode(),
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
      talkTopics: form.talkTopics.trim().slice(0, 160),
      datingTemperature: normalizeDatingTemperature(form.datingTemperature),
      selectedInterestTags: Array.isArray(form.interests) ? form.interests : [],
      inviteCode: normalizeInviteCodeInput(form.inviteCode),
    };
  }

  function validateOnboardingForm(normalizedForm: NormalizedForm) {
    const nextValidationErrors: ValidationErrors = {};
    const ageInputExists = form.age.trim().length > 0;

    if (!normalizedForm.displayName) {
      nextValidationErrors.displayName = t('onboarding.validation.displayName');
    }

    if (!ageInputExists) {
      nextValidationErrors.age = t('onboarding.validation.ageRequired');
    } else if (!Number.isFinite(normalizedForm.age)) {
      nextValidationErrors.age = t('onboarding.validation.ageNumber');
    } else if (normalizedForm.age < 18) {
      nextValidationErrors.age = t('onboarding.validation.ageAdult');
    }

    if (!normalizedForm.location) {
      nextValidationErrors.location = t('onboarding.validation.location');
    }

    if (!normalizedForm.datingTemperature) {
      nextValidationErrors.datingTemperature = t('onboarding.validation.temperature');
    }

    if (normalizedForm.selectedInterestTags.length === 0) {
      nextValidationErrors.interests = t('onboarding.validation.interests');
    }

    if (isSupabaseMode && isAuthenticated && user && !normalizedForm.inviteCode) {
      nextValidationErrors.inviteCode = t('onboarding.validation.inviteCode');
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
      showError(t('onboarding.validation.summary'));
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
      talkTopics: normalizedForm.talkTopics,
      datingTemperature: normalizedForm.datingTemperature,
      interests: normalizedForm.selectedInterestTags,
      themePreference: themeId,
    };

    setSaving(true);
    setError('');
    setStatusMessage(t('onboarding.status.startSaving'));

    try {
      if (isSupabaseMode && isAuthenticated && user) {
        const usingFounderInviteCode = isFounderInviteCode(normalizedForm.inviteCode);

        setStatusMessage(t('onboarding.status.checkingInvite'));
        const inviteValidation = await validateInviteCode(normalizedForm.inviteCode);
        logOnboardingStep('validateInviteCode success', { success: inviteValidation.ok, inviteCodeExists: Boolean(normalizedForm.inviteCode), founderInviteCode: usingFounderInviteCode });
        if (!inviteValidation.ok) {
          console.warn('[Onboarding] invite code validation failed', { success: false, inviteCodeExists: Boolean(normalizedForm.inviteCode), founderInviteCode: usingFounderInviteCode });
          setValidationErrors({ inviteCode: t('onboarding.error.inviteCode') });
          showError(t('onboarding.error.inviteCode'));
          scrollToStep('inviteCode');
          logOnboardingStep('validateInviteCode success', { success: false });
          return;
        }

        setStatusMessage(t('onboarding.status.inviteConfirmedDraft'));
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
            talk_topics: profile.talkTopics || null,
            dating_temperature: profile.datingTemperature,
            onboarding_completed: false,
            visibility: 'public',
            role: 'user',
          });
          logOnboardingStep('profile draft save success', { success: true });
        } catch (profileError) {
          console.error('[Onboarding] profile draft save failed', getSafeErrorLog(profileError, 'profile_draft_save'));
          showError(t('onboarding.error.profileSave'));
          logOnboardingStep('profile draft save success', { success: false });
          return;
        }

        setStatusMessage(t('onboarding.status.savingInvite'));
        const inviteUse = await redeemInviteCode(inviteValidation.inviteCode.code, user.id);
        const founderSelfInviteFallback = !inviteUse.ok && usingFounderInviteCode && isInviteCodeSelfUseError(inviteUse.error);
        logOnboardingStep('useInviteCode success', { success: inviteUse.ok, founderInviteCode: usingFounderInviteCode, founderSelfInviteFallback });
        if (!inviteUse.ok && !founderSelfInviteFallback) {
          console.warn('[Onboarding] invite code use failed', { success: false, founderInviteCode: usingFounderInviteCode, founderSelfInviteFallback });
          setValidationErrors({ inviteCode: t('onboarding.error.inviteSave') });
          showError(t('onboarding.error.inviteSave'));
          scrollToStep('inviteCode');
          return;
        }
        setStatusMessage(founderSelfInviteFallback
          ? t('onboarding.status.founderConfirmed')
          : t('onboarding.status.savingOfficialProfile'));
        const officialInviteCode = inviteUse.ok ? inviteUse.code : inviteValidation.inviteCode.code;
        const officialIntroducerId = inviteUse.ok ? inviteUse.introducerId : null;
        await upsertMyProfile({
          id: user.id,
          display_name: profile.name,
          age: profile.age,
          location: profile.location,
          occupation: profile.occupation,
          bio: profile.bio,
          interests: profile.interests,
          relationship_goal: profile.relationshipGoal,
          talk_topics: profile.talkTopics || null,
          dating_temperature: profile.datingTemperature,
          onboarding_completed: true,
          visibility: 'public',
          role: 'user',
          invited_by: officialIntroducerId,
          invite_code_used: officialInviteCode,
        });
        clearPendingInviteCode();
        setStatusMessage(founderSelfInviteFallback ? t('onboarding.status.completeFounder') : t('onboarding.status.completeInvite'));
      }

      completeOnboarding(profile);
      logOnboardingStep('navigate home', { success: true });
      setStatusMessage(t('onboarding.status.profileSaved'));
      setTimeout(() => {
        navigate('/home', { state: { profileSaved: true, message: t('onboarding.status.profileSaved') } });
      }, 350);
    } catch (caughtError) {
      console.error('[Onboarding] unexpected save failed', getSafeErrorLog(caughtError, 'onboarding_complete'));
      showError(t('onboarding.error.unexpected'));
      logOnboardingStep('unexpected error', { success: false });
    } finally {
      setSaving(false);
    }
  }

  const missingMessages = Object.values(validationErrors).filter((message): message is string => Boolean(message));
  const steps = [t('onboarding.step.basic'), t('onboarding.step.temperature'), t('onboarding.step.interests'), t('onboarding.step.inviteCode')];

  return (
    <PageShell description={t('onboarding.description')} eyebrow={t('onboarding.eyebrow')} title={t('onboarding.title')}>
      <Card className="flower-gradient border-0 p-1">
        <div className="rounded-[1.25rem] bg-theme-card/78 p-3.5 backdrop-blur">
          <div className="flex items-center gap-1.5 text-sm font-black text-theme-main-dark"><Flower2 size={18} />{t('onboarding.heroTitle')}</div>
          <p className="mt-2 text-[13px] leading-6 text-theme-muted">{t('onboarding.heroBody1')}</p>
          <p className="mt-1 text-[13px] leading-6 text-theme-muted">{t('onboarding.heroBody2')}</p>
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

      <div ref={basicStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<UserRound size={18} />} label="Step 1" title={t('onboarding.basic.title')} />
          <Input helperText={t('onboarding.basic.displayNameHelper')} label={t('onboarding.basic.displayName')} name="displayName" onChange={(event) => updateField('name', event.target.value)} placeholder="マイペース男" value={form.name} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Input helperText="18歳未満は利用できません。" label={t('onboarding.basic.age')} name="age" onChange={(event) => updateField('age', event.target.value)} placeholder="39" type="number" value={form.age} />
            </div>
            <div className="space-y-2">
              <Input helperText="大まかな活動エリアでOKです。前後の空白は保存時に自動で整理します。" label={t('onboarding.basic.location')} name="location" onChange={(event) => updateField('location', event.target.value)} placeholder="東京都・世田谷区 / オンライン" value={form.location} />
            </div>
          </div>
          <Input helperText={t('onboarding.basic.occupationHelper')} label={t('onboarding.basic.occupation')} name="occupation" onChange={(event) => updateField('occupation', event.target.value)} placeholder="例：AIアプリ制作 / ブログ作業 / イベント企画" value={form.occupation} />
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>{t('onboarding.basic.bio')}</span>
            <textarea className="min-h-24 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" onChange={(event) => updateField('bio', event.target.value)} placeholder="例：一緒にやりたいこと、探している仲間を書いてください。" value={form.bio} />
            <span className="block text-xs font-medium leading-5 text-theme-muted">{t('onboarding.basic.bioHelper')}</span>
          </label>
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>{t('onboarding.basic.talkTopics')}</span>
            <textarea className="min-h-20 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 py-3 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" maxLength={160} onChange={(event) => updateField('talkTopics', event.target.value)} placeholder={t('onboarding.basic.talkTopicsPlaceholder')} value={form.talkTopics} />
            <span className="block text-xs font-medium leading-5 text-theme-muted">{t('onboarding.basic.talkTopicsHelper')}</span>
            <span className="block text-right text-[11px] font-bold text-theme-muted">{form.talkTopics.length}/160</span>
          </label>
        </Card>
      </div>

      <div ref={temperatureStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<MapPin size={18} />} label="Step 2" title={t('onboarding.temperature.title')} />
          <label className="block space-y-2 text-sm font-semibold text-theme-text">
            <span>{t('onboarding.temperature.label')}</span>
            <p className="text-xs font-medium leading-5 text-theme-muted">{t('onboarding.temperature.body')}</p>
            <p className="text-xs font-bold leading-5 text-theme-main-dark">{t('onboarding.temperature.editLater')}</p>
            <select className="min-h-11 w-full rounded-xl border border-theme-sky/30 bg-theme-card px-3.5 text-sm text-theme-text outline-none focus:border-theme-cyan focus:ring-4 focus:ring-theme-cyan/15" onChange={(event) => updateField('datingTemperature', event.target.value)} value={form.datingTemperature}>
              {DATING_TEMPERATURE_OPTIONS.map((datingTemperature) => (
                <option key={datingTemperature} value={datingTemperature}>{datingTemperature}</option>
              ))}
            </select>
          </label>
        </Card>
      </div>

      <div ref={interestsStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<Tags size={18} />} label="Step 3" title={t('onboarding.interests.title')} />
          <div className="space-y-2.5">
            <p className="flex items-center gap-1.5 text-sm font-black"><Tags size={16} />{t('onboarding.interests.title')}</p>
            <p className="text-xs leading-5 text-theme-muted">{t('onboarding.interests.body')}</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const selected = form.interests.includes(tag);
                return <button className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${selected ? 'bg-gradient-to-r from-theme-yellow/85 to-theme-sky/45 text-theme-main-dark ring-1 ring-theme-sky/30' : 'bg-theme-background/80 text-theme-text ring-1 ring-theme-sky/15'}`} key={tag} onClick={() => toggleTag(tag)} type="button">{tag}</button>;
              })}
            </div>
          </div>
        </Card>
      </div>

      <div ref={inviteCodeStepRef}>
        <Card className="space-y-4">
          <SectionTitle icon={<Ticket size={18} />} label="Step 4" title={t('onboarding.inviteCode.title')} />
          <Input
            helperText={isSupabaseMode ? t('onboarding.inviteCode.helper') : t('onboarding.inviteCode.demoHelper')}
            label={t('onboarding.inviteCode.title')}
            name="inviteCode"
            autoCapitalize="characters"
            autoCorrect="off"
            inputMode="text"
            onChange={(event) => updateField('inviteCode', normalizeInviteCodeInput(event.target.value))}
            placeholder="例：MYPACE-2026"
            spellCheck={false}
            value={form.inviteCode}
          />
          <div className="rounded-[1.15rem] bg-theme-accent-soft/45 p-3 text-xs font-bold leading-5 text-theme-main-dark">
            {t('onboarding.inviteCode.body')}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionTitle icon={<Palette size={18} />} label="Step 5" title={t('onboarding.theme.title')} />
        <p className="text-sm leading-6 text-theme-muted">{t('onboarding.theme.body')}</p>
        <ThemeSwitcher />
        <Badge className="w-fit">{t('onboarding.theme.current')}: {themeId}</Badge>
      </Card>

      <div className="sticky bottom-24 z-10 rounded-[1.25rem] border border-white/60 bg-theme-card/90 p-2.5 shadow-2xl shadow-theme-main/15 backdrop-blur">
        <p className="mb-2 px-1 text-center text-xs font-bold leading-5 text-theme-muted">{t('onboarding.footer.note')}</p>
        {error ? <ValidationSummary compact message={error} missingMessages={missingMessages} /> : null}
        {statusMessage ? <div className="mb-2 rounded-xl bg-theme-accent-soft/60 p-2.5 text-xs font-bold leading-5 text-theme-main-dark" role="status">{statusMessage}</div> : null}
        <Button className="w-full" disabled={saving} onClick={handleComplete}>
          <CheckCircle2 size={16} />
          {saving ? t('onboarding.button.saving') : t('onboarding.button.goToday')}
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

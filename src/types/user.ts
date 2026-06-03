import type { ThemeId } from '../context/ThemeProvider';

export type { ThemeId };

export const DEFAULT_DATING_TEMPERATURE = 'ゆっくり会話から始めたい';

export type DatingTemperature =
  | typeof DEFAULT_DATING_TEMPERATURE
  | '安心感があれば会ってみたい'
  | '価値観が合えば前向きに進めたい'
  | 'まずは友達の紹介のように、ゆっくり話したい'
  | 'メッセージで安心感が持てたら会いたい'
  | 'まずはオンラインで気軽に話したい'
  | '紹介者の話も聞きながら丁寧に進めたい';

export type RelationshipGoal =
  | '自然体で長く付き合える関係'
  | '一緒に日常を育てられる関係'
  | '信頼を重ねられる恋人'
  | 'お互いを応援できる関係'
  | '家族や友人も大切にできる関係'
  | '日常を大切にできる関係';

export type UserProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  occupation: string;
  bio: string;
  interests: string[];
  datingTemperature: DatingTemperature | string;
  relationshipGoal: RelationshipGoal | string;
  introducedBy: string;
  photoUrl?: string;
  gradient: string;
};

export type CurrentUserProfile = Omit<UserProfile, 'introducedBy' | 'gradient' | 'photoUrl'> & {
  themePreference: ThemeId;
};

import type { ThemeId } from '../context/ThemeProvider';
import { DEFAULT_DATING_TEMPERATURE } from '../constants/datingTemperature';

export type { ThemeId };

export { DEFAULT_DATING_TEMPERATURE } from '../constants/datingTemperature';

export type DatingTemperature =
  | typeof DEFAULT_DATING_TEMPERATURE
  | '共通の趣味でつながりたい'
  | '一緒に企画・制作したい'
  | 'イベントや活動で会って話したい'
  | '相談・情報交換から始めたい'
  | 'まずはオンラインで気軽に話したい'
  | '紹介者の話も聞きながら丁寧につながりたい';

export type RelationshipGoal =
  | '一緒に楽しめる活動仲間'
  | '興味関心で話せる人'
  | '企画や制作を共創できる人'
  | '相談・情報交換できる人'
  | '地域やイベントでつながれる人'
  | '自然体で応援し合える関係';

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
  avatarUrl?: string;
  primaryPhotoUrl?: string;
  gradient: string;
};

export type CurrentUserProfile = Omit<UserProfile, 'introducedBy' | 'gradient'> & {
  themePreference: ThemeId;
};

export const DEFAULT_DATING_TEMPERATURE = 'まずはゆっくり話したい';

export const DATING_TEMPERATURE_OPTIONS = [
  DEFAULT_DATING_TEMPERATURE,
  '共通の趣味でつながりたい',
  '一緒に企画・制作したい',
  'イベントや活動で会って話したい',
  '相談・情報交換から始めたい',
] as const;

export type DatingTemperatureOption = (typeof DATING_TEMPERATURE_OPTIONS)[number];

const LEGACY_DATING_TEMPERATURE_MAP: Record<string, DatingTemperatureOption> = {
  '価値観が合えば前向きに進めたい': DEFAULT_DATING_TEMPERATURE,
  '気軽に情報交換したい': '相談・情報交換から始めたい',
  'まずはオンラインで気軽に話したい': '相談・情報交換から始めたい',
  '紹介者の話も聞きながら丁寧につながりたい': DEFAULT_DATING_TEMPERATURE,
};

export function normalizeDatingTemperature(value: string | null | undefined): DatingTemperatureOption {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return DEFAULT_DATING_TEMPERATURE;

  const option = DATING_TEMPERATURE_OPTIONS.find((datingTemperature) => datingTemperature === trimmedValue);
  if (option) return option;

  return LEGACY_DATING_TEMPERATURE_MAP[trimmedValue] ?? DEFAULT_DATING_TEMPERATURE;
}

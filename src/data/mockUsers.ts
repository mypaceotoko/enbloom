export type MockUser = {
  id: string;
  name: string;
  age: number;
  location: string;
  occupation: string;
  bio: string;
  interests: string[];
  datingTemperature: string;
  relationshipGoal: string;
  introducedBy: string;
  photoUrl?: string;
  gradient: string;
};

export const mockUsers: MockUser[] = [
  {
    id: 'mio',
    name: '美桜',
    age: 29,
    location: '東京都・世田谷',
    occupation: '編集者',
    bio: '休日は本屋さん巡りと喫茶店で過ごすのが好きです。ゆっくり会話しながら、お互いのペースを大切にしたいです。',
    interests: ['読書', '喫茶店', '散歩', '映画'],
    datingTemperature: 'まずは友達の紹介のように、ゆっくり話したい',
    relationshipGoal: '自然体で長く付き合える関係',
    introducedBy: '大学時代の友人・遥さん',
    gradient: 'from-pink-100 via-rose-50 to-emerald-100',
  },
  {
    id: 'ren',
    name: '蓮',
    age: 31,
    location: '神奈川県・横浜',
    occupation: 'プロダクトデザイナー',
    bio: 'デザインと料理が好きです。週末は友人を招いて小さな食卓を囲むことが多いです。',
    interests: ['料理', 'デザイン', '美術館', '犬'],
    datingTemperature: '価値観が合えば前向きに会ってみたい',
    relationshipGoal: '一緒に日常を育てられる関係',
    introducedBy: '職場の先輩・佐藤さん',
    gradient: 'from-emerald-100 via-lime-50 to-pink-100',
  },
  {
    id: 'akari',
    name: '朱里',
    age: 27,
    location: '千葉県・市川',
    occupation: '看護師',
    bio: '人の話を聞くことが好きです。安心できる関係から少しずつ距離を縮めたいです。',
    interests: ['ヨガ', '旅行', 'カフェ', '花'],
    datingTemperature: 'メッセージで安心感が持てたら会いたい',
    relationshipGoal: '信頼を重ねられる恋人',
    introducedBy: '共通の友人・真央さん',
    gradient: 'from-rose-100 via-orange-50 to-teal-100',
  },
  {
    id: 'sora',
    name: '蒼',
    age: 33,
    location: '東京都・吉祥寺',
    occupation: 'Webエンジニア',
    bio: '自然のある場所と音楽が好きです。無理に盛り上げるより、落ち着いた時間を大切にしています。',
    interests: ['音楽', '登山', 'コーヒー', '写真'],
    datingTemperature: 'まずはオンラインで気軽に話したい',
    relationshipGoal: 'お互いを応援できる関係',
    introducedBy: '趣味コミュニティ・写真部',
    gradient: 'from-sky-100 via-emerald-50 to-purple-100',
  },
  {
    id: 'hana',
    name: '花',
    age: 30,
    location: '埼玉県・大宮',
    occupation: 'ブランドプランナー',
    bio: '季節の花を飾ること、友人と小さな旅に出ることが好きです。あたたかい会話から始めたいです。',
    interests: ['花', '旅', '和菓子', 'アート'],
    datingTemperature: '紹介者の話も聞きながら丁寧に進めたい',
    relationshipGoal: '家族や友人も大切にできる関係',
    introducedBy: '幼なじみ・菜々さん',
    gradient: 'from-fuchsia-100 via-pink-50 to-green-100',
  },
];

export const currentUser = {
  name: 'あなた',
  age: 30,
  location: '東京都',
  occupation: 'マーケター',
  bio: '信頼できるつながりから、自然体で話せる人と出会いたいです。',
  interests: ['散歩', '映画', '料理', '植物'],
  datingTemperature: 'ゆっくり会話から始めたい',
  relationshipGoal: '日常を大切にできる関係',
};

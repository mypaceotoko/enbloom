import type { ChatRoomMessageWithProfile, ChatRoomWithStats } from '../types/chatRoom';

const now = '2026-06-03T09:00:00.000Z';

export const officialRoomDescriptions = {
  creative: '制作、AI、動画、音声、イベントなど、何かを一緒に作りたい人のアイデア出しルームです。',
  casual: 'ゆるく話しながら、趣味や日常の話から小さなきっかけを見つけるルームです。',
} as const;

export const demoChatRooms: ChatRoomWithStats[] = [
  {
    id: 'demo-room-creative',
    slug: 'creative',
    name: 'クリエイティブルーム',
    description: officialRoomDescriptions.creative,
    category: 'creative',
    is_official: true,
    created_at: now,
    updated_at: now,
    message_count: 2,
    latest_message_at: '2026-06-03T08:45:00.000Z',
  },
  {
    id: 'demo-room-casual',
    slug: 'casual',
    name: '雑談ルーム',
    description: officialRoomDescriptions.casual,
    category: 'casual',
    is_official: true,
    created_at: now,
    updated_at: now,
    message_count: 1,
    latest_message_at: '2026-06-03T08:10:00.000Z',
  },
];

export const demoRoomMessages: Record<string, ChatRoomMessageWithProfile[]> = {
  creative: [
    {
      id: 'demo-message-creative-1',
      room_id: 'demo-room-creative',
      sender_id: 'demo-user-yu',
      body: 'AIで週末に小さな作品を作る会、試してみたいです。まずは雑にアイデア出しからでも。',
      created_at: '2026-06-03T08:30:00.000Z',
      updated_at: '2026-06-03T08:30:00.000Z',
      profile: {
        id: 'demo-user-yu',
        name: 'ゆう',
        age: 29,
        location: '東京 / オンライン',
        occupation: 'プロダクトづくり',
        bio: '小さく始める活動や共創が好きです。',
        interests: ['AI', 'プロトタイピング'],
        datingTemperature: '一緒に企画・制作したい',
        relationshipGoal: '企画や制作を共創できる人',
        introducedBy: 'ConnectBloom',
        gradient: 'from-cyan-100 via-sky-50 to-blue-100',
      },
    },
    {
      id: 'demo-message-creative-2',
      room_id: 'demo-room-creative',
      sender_id: 'demo-user-saki',
      body: '動画や音声にするなら、テーマ決めと台本づくりを手伝えます。募集ボードにすると集まりやすそう。',
      created_at: '2026-06-03T08:45:00.000Z',
      updated_at: '2026-06-03T08:45:00.000Z',
      profile: {
        id: 'demo-user-saki',
        name: 'さき',
        age: 31,
        location: '東京',
        occupation: '編集・発信',
        bio: '文章と声で、興味の近い人とつながりたいです。',
        interests: ['ブログ', '音声配信'],
        datingTemperature: '相談・情報交換から始めたい',
        relationshipGoal: '興味関心で話せる人',
        introducedBy: 'ConnectBloom',
        gradient: 'from-sky-100 via-cyan-50 to-blue-100',
      },
    },
  ],
  casual: [
    {
      id: 'demo-message-casual-1',
      room_id: 'demo-room-casual',
      sender_id: 'demo-user-haru',
      body: '最近観た映画の感想をゆるく話せる会があったら楽しそうです。',
      created_at: '2026-06-03T08:10:00.000Z',
      updated_at: '2026-06-03T08:10:00.000Z',
      profile: {
        id: 'demo-user-haru',
        name: 'はる',
        age: 27,
        location: '大阪',
        occupation: 'イベント好き',
        bio: '興味の近い人と、面白い体験を共有したいです。',
        interests: ['映画', 'イベント同行'],
        datingTemperature: 'ゆっくり',
        relationshipGoal: '趣味仲間を探したい',
        introducedBy: 'ConnectBloom',
        gradient: 'from-yellow-100 via-sky-50 to-cyan-100',
      },
    },
  ],
};

export const roomTags: Record<string, string[]> = {
  creative: ['AI', '共創', '制作', '企画'],
  casual: ['雑談', '趣味', '日常', 'ゆるく話す'],
};

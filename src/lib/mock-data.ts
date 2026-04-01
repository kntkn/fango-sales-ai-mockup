import type {
  Conversation, Message, AiSuggestion, SmartReply,
  CustomerProfile, Property, PersonalityAnalysis,
  SuggestedReaction, Inquiry, SalesAgent, ViewingSlot,
} from './types';

const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60_000);

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const conversations: Conversation[] = [
  {
    id: '1',
    customerName: '田中太郎',
    score: 'high',
    scoreTrend: 'up',
    stage: 'hearing',
    lastMessage: '駅から近い物件を探しています。予算は8万円くらいで...',
    lastMessageTime: mins(3),
    lastMessageSender: 'customer',
    unread: true,
    area: '杉並区',
    propertyType: '賃貸',
    unansweredSince: mins(3),
  },
  {
    id: '2',
    customerName: '佐藤花子',
    score: 'mid',
    scoreTrend: 'stable',
    stage: 'proposal',
    lastMessage: 'ありがとうございます。他にもありますか？',
    lastMessageTime: mins(15),
    lastMessageSender: 'customer',
    unread: true,
    area: '世田谷区',
    propertyType: '賃貸',
    unansweredSince: mins(15),
  },
  {
    id: '3',
    customerName: '鈴木一郎',
    score: 'high',
    scoreTrend: 'up',
    stage: 'viewing',
    lastMessage: '土曜日の午後なら空いています！',
    lastMessageTime: mins(45),
    lastMessageSender: 'customer',
    unread: false,
    area: '中野区',
    propertyType: '賃貸',
  },
  {
    id: '4',
    customerName: '山田美咲',
    score: 'mid',
    scoreTrend: 'down',
    stage: 'hearing',
    lastMessage: 'ペット可の物件はありますか？',
    lastMessageTime: mins(120),
    lastMessageSender: 'customer',
    unread: true,
    area: '目黒区',
    propertyType: '賃貸',
    unansweredSince: mins(120),
  },
  {
    id: '5',
    customerName: '高橋健一',
    score: 'low',
    scoreTrend: 'stable',
    stage: 'initial',
    lastMessage: 'SUUMOで見た物件について聞きたいです',
    lastMessageTime: mins(180),
    lastMessageSender: 'customer',
    unread: false,
    area: '渋谷区',
    propertyType: '賃貸',
  },
  {
    id: '6',
    customerName: '伊藤由美',
    score: 'high',
    scoreTrend: 'stable',
    stage: 'deal',
    lastMessage: '契約書を確認しました。問題ありません。',
    lastMessageTime: mins(300),
    lastMessageSender: 'customer',
    unread: false,
    area: '杉並区',
    propertyType: '賃貸',
  },
  {
    id: '7',
    customerName: '渡辺拓也',
    score: 'mid',
    scoreTrend: 'up',
    stage: 'hearing',
    lastMessage: '1LDKで10万以内を希望します',
    lastMessageTime: mins(60),
    lastMessageSender: 'customer',
    unread: true,
    area: '中野区',
    propertyType: '賃貸',
    unansweredSince: mins(60),
  },
  {
    id: '8',
    customerName: '小林真由',
    score: 'low',
    scoreTrend: 'down',
    stage: 'proposal',
    lastMessage: 'もう少し考えてみます...',
    lastMessageTime: mins(1440),
    lastMessageSender: 'customer',
    unread: false,
    area: '世田谷区',
    propertyType: '賃貸',
    nurtureRecommendation: '提案後24時間以上返信なし。ソフトなフォローアップで温度感を確認',
  },
];

// ---------------------------------------------------------------------------
// Messages for Conversation 1
// ---------------------------------------------------------------------------

export const messagesForConv1: Message[] = [
  {
    id: 'm1',
    sender: 'system',
    text: 'SUUMO経由で友だち追加されました',
    timestamp: mins(65),
  },
  {
    id: 'm2',
    sender: 'customer',
    text: 'こんにちは。SUUMOで杉並区の物件を見て連絡しました。',
    timestamp: mins(60),
    interpretation: '早く具体的な情報がほしい。SUUMOの物件がまだあるか気になっている',
  },
  {
    id: 'm3',
    sender: 'agent',
    text: 'お問い合わせありがとうございます！杉並区の物件にご興味をお持ちいただき、ありがとうございます。どのような物件をお探しですか？',
    timestamp: mins(58),
    readStatus: 'read',
  },
  {
    id: 'm4',
    sender: 'customer',
    text: '一人暮らし用で、1Kか1DKを探しています。',
    timestamp: mins(50),
    interpretation: '余計な提案はいらない。1K・1DKだけに絞ってほしい',
  },
  {
    id: 'm5',
    sender: 'agent',
    text: '承知しました！1K・1DKですね。ご予算や最寄り駅のご希望はありますか？',
    timestamp: mins(48),
    readStatus: 'read',
  },
  {
    id: 'm6',
    sender: 'customer',
    text: '予算は7〜9万円くらいです。荻窪か阿佐ヶ谷あたりが理想ですね。',
    timestamp: mins(30),
    interpretation: '荻窪・阿佐ヶ谷以外は見たくない。9万超えたら即却下する',
  },
  {
    id: 'm7',
    sender: 'agent',
    text: 'いい条件ですね！荻窪・阿佐ヶ谷エリアの1K〜1DKで7〜9万円、いくつか候補がございます。お引越し時期のご希望はありますか？',
    timestamp: mins(28),
    readStatus: 'read',
  },
  {
    id: 'm8',
    sender: 'customer',
    text: '来月中には引っ越したいです。あと、駅から近い物件を探しています。予算は8万円くらいで、バス・トイレ別だと嬉しいです。',
    timestamp: mins(3),
    interpretation: '早くしてほしい。来月中に決めたい焦りがある。条件に合う物件を今すぐ見せて',
  },
];

// ---------------------------------------------------------------------------
// AI Suggestion for Conversation 1
// ---------------------------------------------------------------------------

export const aiSuggestionForConv1: AiSuggestion = {
  id: 'ai1',
  mode: 'suggest',
  text: '承知しました！駅から徒歩5分以内、バス・トイレ別の条件で、荻窪・阿佐ヶ谷エリアの物件を3件ピックアップしました。\n\n①ハイツ荻窪 1K 7.8万円 荻窪駅徒歩3分\n②コーポ阿佐ヶ谷 1DK 8.2万円 阿佐ヶ谷駅徒歩4分\n③メゾン南荻窪 1K 7.5万円 荻窪駅徒歩5分\n\nいずれもバス・トイレ別です。ご興味のある物件がございましたら、詳しい資料をお送りしますね！',
  reasoning: '顧客が具体的な条件（駅近・予算8万・BT別）を提示。ヒアリング情報と物件DBのマッチング結果から、上位3件を選定。来月引越し希望のため、即入居可能な物件を優先。',
  alternatives: [
    '条件に合う物件がいくつかございます！まず、一番おすすめの荻窪駅徒歩3分のハイツ荻窪(1K/7.8万)はいかがでしょうか？バス・トイレ別で、来月からご入居可能です。',
    '駅近でBT別のご希望、承知しました！荻窪・阿佐ヶ谷エリアで条件に合う物件をリストアップ中です。少々お待ちください。\n\nちなみに、オートロックや宅配ボックスなど、他にご希望の設備はございますか？',
  ],
  suggestedProperties: [
    { id: 'p1', name: 'ハイツ荻窪', rent: '7.8万円', matchScore: 5 },
    { id: 'p2', name: 'コーポ阿佐ヶ谷', rent: '8.2万円', matchScore: 4 },
    { id: 'p3', name: 'メゾン南荻窪', rent: '7.5万円', matchScore: 4 },
  ],
};

export const smartRepliesForConv1: SmartReply[] = [
  { id: 'sr1', text: '承知しました！物件をお探しします' },
  { id: 'sr2', text: 'いくつか候補がございます' },
  { id: 'sr3', text: '内見のご予約はいかがですか？' },
  { id: 'sr4', text: '他にご希望の条件はありますか？' },
];

// ---------------------------------------------------------------------------
// Customer Profile for Conversation 1
// ---------------------------------------------------------------------------

export const customerProfileForConv1: CustomerProfile = {
  name: '田中太郎',
  lineId: 'U1234abcd5678',
  firstContact: '2026-03-28',
  source: 'SUUMO',
  sourceProperty: 'グランメゾン杉並',
  stage: 'hearing',
  requirements: [
    { label: 'エリア', value: '杉並区（荻窪・阿佐ヶ谷）', captured: true },
    { label: '間取り', value: '1K〜1DK', captured: true },
    { label: '賃料', value: '7〜9万円', captured: true },
    { label: '駅徒歩', value: '5分以内', captured: true },
    { label: '引越時期', value: '来月中', captured: true },
    { label: 'BT別', value: '希望', captured: true },
    { label: 'ペット', captured: false },
    { label: '保証人', captured: false },
    { label: '勤務地', captured: false },
  ],
  behaviorLog: [
    { date: '03/28 14:30', action: 'SUUMO問い合わせ（グランメゾン杉並）' },
    { date: '03/28 14:35', action: 'LINE友だち追加' },
    { date: '03/28 14:36', action: '初回メッセージ送信' },
    { date: '03/28 14:50', action: '間取り条件提示' },
    { date: '03/28 15:00', action: '予算・エリア条件提示' },
    { date: '03/29 10:00', action: '物件リンク閲覧（グランメゾン杉並）' },
    { date: '03/29 10:15', action: '物件リンク閲覧（ハイツ荻窪）' },
    { date: '03/31 14:27', action: '駅近・BT別条件を追加提示' },
  ],
};

// ---------------------------------------------------------------------------
// Personality Analysis for Conversation 1
// ---------------------------------------------------------------------------

export const personalityForConv1: PersonalityAnalysis = {
  estimatedType: 'ISTJ-A 堅実型・計画的',
  communicationStyle: '簡潔で論理的。条件を順序立てて伝える。要点を先に伝えると好反応。長文より箇条書きが効果的。',
  sensitivities: [
    { label: '駅距離', level: 'high' },
    { label: '価格', level: 'high' },
    { label: 'BT別', level: 'mid' },
    { label: '築年数', level: 'low' },
  ],
  lifeRhythm: {
    description: '平日日中の返信が多い（在宅勤務の可能性）。週末午前に物件リンクを閲覧。',
    recommendation: '平日 10:00-12:00 / 14:00-16:00 の送信が最適',
  },
  decisionPattern: '比較検討型。3件程度の選択肢を提示すると反応が良い。即決はしないが、条件が合えば素早く動く。',
};

// ---------------------------------------------------------------------------
// Suggested Reactions
// ---------------------------------------------------------------------------

export const suggestedReactionsForConv1: SuggestedReaction[] = [
  { propertyName: 'グランメゾン杉並', reaction: 'interested', comment: '反響元物件・リンク閲覧2回' },
  { propertyName: 'ハイツ荻窪', reaction: 'interested', comment: 'リンク閲覧1回' },
];

// ---------------------------------------------------------------------------
// Properties for Conversation 1
// ---------------------------------------------------------------------------

export const propertiesForConv1: Property[] = [
  {
    id: 'p1',
    name: 'ハイツ荻窪',
    imageUrl: '',
    type: '1K',
    rent: '7.8万円',
    walkMinutes: 3,
    station: '荻窪',
    matchScore: 5,
  },
  {
    id: 'p2',
    name: 'コーポ阿佐ヶ谷',
    imageUrl: '',
    type: '1DK',
    rent: '8.2万円',
    walkMinutes: 4,
    station: '阿佐ヶ谷',
    matchScore: 4,
  },
  {
    id: 'p3',
    name: 'メゾン南荻窪',
    imageUrl: '',
    type: '1K',
    rent: '7.5万円',
    walkMinutes: 5,
    station: '荻窪',
    matchScore: 4,
  },
  {
    id: 'p4',
    name: 'ヴィラ杉並',
    imageUrl: '',
    type: '1K',
    rent: '8.5万円',
    walkMinutes: 2,
    station: '阿佐ヶ谷',
    matchScore: 3,
  },
  {
    id: 'p5',
    name: 'レジデンス高円寺',
    imageUrl: '',
    type: '1DK',
    rent: '8.8万円',
    walkMinutes: 6,
    station: '高円寺',
    matchScore: 3,
  },
];

// ---------------------------------------------------------------------------
// Inquiries (反響リスト)
// ---------------------------------------------------------------------------

export const inquiries: Inquiry[] = [
  {
    id: 'inq1',
    customerName: '田中太郎',
    timestamp: mins(3),
    property: 'グランメゾン杉並',
    source: 'SUUMO',
    message: '駅から近い物件を探しています。予算は8万円くらいです。',
    hasLine: true,
  },
  {
    id: 'inq2',
    customerName: '木村拓哉',
    timestamp: mins(45),
    property: 'パークハイム世田谷',
    source: "HOME'S",
    hasLine: false,
  },
  {
    id: 'inq3',
    customerName: '佐藤花子',
    timestamp: mins(90),
    property: 'ヴィラ下北沢',
    source: 'SUUMO',
    message: 'ペット可の物件はありますか？小型犬1匹です。',
    hasLine: true,
  },
  {
    id: 'inq4',
    customerName: '中村翔太',
    timestamp: mins(120),
    property: 'メゾン三軒茶屋',
    source: 'at home',
    hasLine: false,
  },
  {
    id: 'inq5',
    customerName: '高橋健一',
    timestamp: mins(180),
    property: 'コーポ渋谷',
    source: 'SUUMO',
    message: 'SUUMOで見た物件について詳しく聞きたいです。内見は可能ですか？',
    hasLine: true,
  },
  {
    id: 'inq6',
    customerName: '伊藤真紀',
    timestamp: mins(240),
    property: 'レジデンス中野',
    source: "HOME'S",
    hasLine: false,
  },
];

// ---------------------------------------------------------------------------
// Sales Agents & Viewing Slots (内見カレンダー)
// ---------------------------------------------------------------------------

export const salesAgents: SalesAgent[] = [
  { id: 'a1', name: '山本' },
  { id: 'a2', name: '鈴木' },
  { id: 'a3', name: '佐々木' },
];

const today = new Date();
today.setHours(0, 0, 0, 0);
const dayMs = 24 * 60 * 60_000;
const slot = (day: number, hour: number, minute = 0) =>
  new Date(today.getTime() + day * dayMs + hour * 3600_000 + minute * 60_000);

export const viewingSlots: ViewingSlot[] = [
  // Today
  { id: 'vs1', agentId: 'a1', agentName: '山本', customerName: '田中太郎', property: 'ハイツ荻窪', area: '杉並区', startTime: slot(0, 10, 0), endTime: slot(0, 11, 0), status: 'confirmed' },
  { id: 'vs2', agentId: 'a2', agentName: '鈴木', customerName: '鈴木一郎', property: 'コーポ阿佐ヶ谷', area: '中野区', startTime: slot(0, 13, 0), endTime: slot(0, 14, 0), status: 'pending' },
  { id: 'vs3', agentId: 'a1', agentName: '山本', customerName: '佐藤花子', property: 'ヴィラ杉並', area: '世田谷区', startTime: slot(0, 15, 0), endTime: slot(0, 16, 0), status: 'confirmed' },
  { id: 'vs4', agentId: 'a3', agentName: '佐々木', customerName: '高橋健一', property: 'レジデンス高円寺', area: '渋谷区', startTime: slot(0, 14, 0), endTime: slot(0, 15, 30), status: 'confirmed' },
  // Future days
  { id: 'vs5', agentId: 'a2', agentName: '鈴木', customerName: '山田美咲', property: 'メゾン南荻窪', area: '目黒区', startTime: slot(2, 14, 0), endTime: slot(2, 15, 0), status: 'pending' },
  { id: 'vs6', agentId: 'a1', agentName: '山本', customerName: '渡辺拓也', property: 'ハイツ荻窪', area: '中野区', startTime: slot(5, 11, 0), endTime: slot(5, 12, 0), status: 'confirmed' },
  { id: 'vs7', agentId: 'a3', agentName: '佐々木', customerName: '伊藤由美', property: 'コーポ阿佐ヶ谷', area: '杉並区', startTime: slot(7, 10, 0), endTime: slot(7, 11, 0), status: 'pending' },
  { id: 'vs8', agentId: 'a2', agentName: '鈴木', customerName: '小林真由', property: 'ヴィラ杉並', area: '世田谷区', startTime: slot(10, 15, 0), endTime: slot(10, 16, 0), status: 'confirmed' },
];

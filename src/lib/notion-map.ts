import type { Conversation, Inquiry, ScoreTier, FunnelStage, CustomerProfile } from './types';
import type { NotionCustomer } from './notion';

// Deterministic hash (FNV-1a 32-bit) so same id → same derived state.
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

const SCORE_TIERS: ScoreTier[] = ['high', 'mid', 'low'];
const STAGES: FunnelStage[] = [
  'initial',
  'proposal_1',
  'proposal_2',
  'proposal_3',
  'proposal_4plus',
  'viewing',
  'screening',
  'deal',
];

function deriveScore(id: string): ScoreTier {
  return SCORE_TIERS[hash(id + ':score') % SCORE_TIERS.length];
}

function deriveStage(id: string): FunnelStage {
  return STAGES[hash(id + ':stage') % STAGES.length];
}

function areaFromLocation(location: string): string {
  if (!location) return '-';
  // 東京都杉並区... → 杉並区
  const m = location.match(/(.*?都|.*?府|.*?県)?(.+?[区市町村])/);
  return m?.[2] ?? location.slice(0, 6);
}

function propertyTypeLabel(pt: NotionCustomer['propertyType']): string {
  if (!pt) return '賃貸';
  return pt;
}

export function customerToConversation(c: NotionCustomer): Conversation {
  const lastMessageTime = c.inquiryDate ? new Date(c.inquiryDate) : new Date(c.createdAt);
  return {
    id: c.id,
    customerName: c.name || '(名称未設定)',
    score: deriveScore(c.id),
    scoreTrend: 'stable',
    stage: deriveStage(c.id),
    lastMessage: c.propertyName ? `「${c.propertyName}」について反響` : '新規反響',
    lastMessageTime,
    lastMessageSender: 'customer',
    unread: hash(c.id + ':unread') % 3 === 0,
    area: areaFromLocation(c.location),
    propertyType: propertyTypeLabel(c.propertyType),
  };
}

export function customerToInquiry(c: NotionCustomer): Inquiry {
  const ts = c.inquiryDate ? new Date(c.inquiryDate) : new Date(c.createdAt);
  return {
    id: c.id,
    customerName: c.name || '(名称未設定)',
    email: c.email,
    phone: c.phone,
    timestamp: ts,
  };
}

export function customerToProfile(c: NotionCustomer): CustomerProfile {
  return {
    name: c.name || '(名称未設定)',
    lineId: '-',
    firstContact: c.inquiryDate
      ? new Date(c.inquiryDate).toLocaleDateString('ja-JP')
      : new Date(c.createdAt).toLocaleDateString('ja-JP'),
    source: 'SUUMO',
    sourceProperty: c.propertyName || '-',
    stage: deriveStage(c.id),
    requirements: [
      { label: '物件名', value: c.propertyName || '-', captured: !!c.propertyName },
      { label: '所在地', value: c.location || '-', captured: !!c.location },
      { label: '最寄り駅', value: c.station || '-', captured: !!c.station },
      { label: '間取り', value: c.layout || '-', captured: !!c.layout },
      { label: '賃料', value: c.rentMan ? `${c.rentMan}万円` : '-', captured: c.rentMan !== null },
      { label: '占有面積', value: c.areaM2 ? `${c.areaM2}m²` : '-', captured: c.areaM2 !== null },
      { label: 'Email', value: c.email || '-', captured: !!c.email },
      { label: '電話番号', value: c.phone || '-', captured: !!c.phone },
    ],
    behaviorLog: [
      {
        date: c.inquiryDate
          ? new Date(c.inquiryDate).toLocaleString('ja-JP')
          : new Date(c.createdAt).toLocaleString('ja-JP'),
        action: `反響: ${c.propertyName || '物件名不明'}`,
      },
    ],
  };
}

/**
 * liquid-shape — type converters between mockup (3009) and liquid (3002) UI.
 *
 * 3009 ChatThread props → 3002 LineChatPanel props. Lossy in places (8-stage
 * funnel collapses to 5; sender 'system' dropped). The reverse direction is
 * intentionally limited: we keep the original mockup `FunnelStage` value when
 * the user hasn't changed it, so re-saving doesn't widen `proposal_1..4plus`
 * into a generic `proposal`.
 */

import type {
  Conversation as MockupConversation,
  Message as MockupMessage,
  FunnelStage as MockupFunnelStage,
  SalesAgent,
  MessageSender,
} from './types';

// Re-declared liquid shapes — duplicated rather than imported because the
// liquid repo isn't a dependency of mockup (independence rule, see
// sales-ai-liquid Anti-pattern). These must stay in sync with
// sales-ai-liquid/src/data/mock.ts manually.
export type LiquidFunnelStage = '反響/初回' | '提案' | '内見' | '申込' | '成約';
export type LiquidScoreTier = 'high' | 'mid' | 'low';
export type LiquidMessageDirection = 'customer' | 'agent';

export interface LiquidCustomer {
  id: string;
  name: string;
  honorific: string;
  avatarTone: string;
  initial: string;
}

export interface LiquidConversation {
  id: string;
  customer: LiquidCustomer;
  funnelStage: LiquidFunnelStage;
  score: LiquidScoreTier;
  scoreReason: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  slaMinutesRemaining?: number | null;
  source: 'suumo' | 'jds' | 'referral';
  tags: string[];
}

export interface LiquidOgPreview {
  url: string;
  siteName: string;
  title: string;
  description: string;
  tone: string;
  mark: string;
  imageHint?: string;
}

export interface LiquidLineMessage {
  id: string;
  conversationId: string;
  direction: LiquidMessageDirection;
  text: string;
  at: string;
  kind?: 'text' | 'property-link' | 'image';
  og?: LiquidOgPreview;
}

export interface LiquidStaff {
  id: string;
  name: string;
  role: string;
  company: 'RECIKA' | 'ファンテイズ';
  avatarTone: string;
  initial: string;
  assignedConversationIds: string[];
  currentActivity: string;
  lastActive: string;
}

// ---------------------------------------------------------------------------
// Stage mapping (8 → 5)
// ---------------------------------------------------------------------------

const STAGE_8_TO_5: Record<MockupFunnelStage, LiquidFunnelStage> = {
  initial: '反響/初回',
  proposal_1: '提案',
  proposal_2: '提案',
  proposal_3: '提案',
  proposal_4plus: '提案',
  viewing: '内見',
  screening: '申込',
  deal: '成約',
};

export function toLiquidStage(stage: MockupFunnelStage): LiquidFunnelStage {
  return STAGE_8_TO_5[stage];
}

/**
 * Reverse map. Loss-aware:
 *   - If the current mockup stage already maps to the same liquid bucket,
 *     keep the mockup value (so e.g. proposal_2 stays proposal_2 when the
 *     user touches "提案" without intending to demote).
 *   - Otherwise pick the canonical entry of that bucket.
 *
 * `提案` canonicalises to `proposal_1` only when current is outside the
 * proposal bucket.
 */
export function toMockupStage(
  next: LiquidFunnelStage,
  current: MockupFunnelStage,
): MockupFunnelStage {
  if (STAGE_8_TO_5[current] === next) return current;
  switch (next) {
    case '反響/初回':
      return 'initial';
    case '提案':
      return 'proposal_1';
    case '内見':
      return 'viewing';
    case '申込':
      return 'screening';
    case '成約':
      return 'deal';
  }
}

// ---------------------------------------------------------------------------
// Customer name parsing
// ---------------------------------------------------------------------------

const HONORIFIC_RE = /(様|さん|くん|ちゃん|殿)$/u;

export function splitHonorific(displayName: string): { name: string; honorific: string } {
  const m = displayName.match(HONORIFIC_RE);
  if (!m) return { name: displayName, honorific: '' };
  return {
    name: displayName.slice(0, m.index),
    honorific: m[0],
  };
}

// Stable pastel tone derived from the customer id — keeps liquid bubble avatar
// from flashing different colours each render.
const TONE_PALETTE = [
  '#fb923c',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#fbbf24',
  '#22d3ee',
  '#f87171',
];

function toneForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONE_PALETTE[h % TONE_PALETTE.length];
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

function relativeAt(date: Date, now: number = Date.now()): string {
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}時間前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return date.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
}

export function toLiquidConversation(
  conv: MockupConversation,
  opts?: { lineDisplayName?: string; lineAliasName?: string },
): LiquidConversation {
  const display =
    opts?.lineAliasName ||
    opts?.lineDisplayName ||
    conv.lineAliasName ||
    conv.lineDisplayName ||
    conv.customerName;
  const { name, honorific } = splitHonorific(display);
  const initial = name.charAt(0) || '?';

  // mockup has no `source` field on Conversation — infer from lineUserId presence.
  // Real source resolution happens in mockup state, so for now default to 'suumo'.
  const source: LiquidConversation['source'] = 'suumo';

  return {
    id: conv.id,
    customer: {
      id: conv.id,
      name,
      honorific,
      avatarTone: toneForId(conv.id),
      initial,
    },
    funnelStage: toLiquidStage(conv.stage),
    score: conv.score,
    scoreReason: '',
    lastMessagePreview: conv.lastMessage,
    lastMessageAt: relativeAt(conv.lastMessageTime),
    unreadCount: conv.unread ? 1 : 0,
    slaMinutesRemaining: null,
    source,
    tags: [conv.area, conv.propertyType].filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

function directionFor(sender: MessageSender): LiquidMessageDirection | null {
  if (sender === 'customer') return 'customer';
  if (sender === 'agent') return 'agent';
  return null; // system messages dropped — caller filters them out
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function toLiquidMessages(
  messages: MockupMessage[],
  conversationId: string,
): LiquidLineMessage[] {
  const out: LiquidLineMessage[] = [];
  for (const m of messages) {
    const dir = directionFor(m.sender);
    if (!dir) continue;
    const kind: LiquidLineMessage['kind'] =
      m.attachment?.kind === 'image'
        ? 'image'
        : m.isProperty
          ? 'property-link'
          : 'text';
    out.push({
      id: m.id,
      conversationId,
      direction: dir,
      text: m.text,
      at: formatTime(m.timestamp),
      kind,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export function toLiquidStaffList(agents: SalesAgent[]): LiquidStaff[] {
  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    role: '',
    company: 'RECIKA',
    avatarTone: toneForId(a.id),
    initial: a.name.charAt(0) || '?',
    assignedConversationIds: [],
    currentActivity: '',
    lastActive: '',
  }));
}

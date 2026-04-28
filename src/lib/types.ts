export type ScoreTier = 'high' | 'mid' | 'low';

export type RecommendStatus = 'idle' | 'searching' | 'complete' | 'error';

export interface RecommendSearchResult {
  reinsId: string;
  predictedViews: number;
  searchedAt: string;
  rent?: string | null;
  areaSqm?: string | null;
  builtYear?: string | null;
  walkMinutes?: string | null;
  address?: string | null;
  floorPlan?: string | null;
  propertyType?: string | null;
  deposit?: string | null;
  keyMoney?: string | null;
}

export interface RecommendState {
  status: RecommendStatus;
  projectId: string | null;
  results: RecommendSearchResult[];
  error: string | null;
}

export type FunnelStage =
  | 'initial'
  | 'proposal_1'
  | 'proposal_2'
  | 'proposal_3'
  | 'proposal_4plus'
  | 'viewing'
  | 'screening'
  | 'deal';
export type AiMode = 'pounce' | 'suggest' | 'expand' | 'tune' | 'nurture';
export type MessageSender = 'customer' | 'agent' | 'system';
export type ReadStatus = 'sent' | 'delivered' | 'read';
export type ViewMode =
  | 'chat'
  | 'crm'
  | 'calendar'
  | 'inquiries'
  | 'agents'
  // liquid-only modes (3002 set). Classic Header ignores these.
  | 'ad'
  | 'kanban'
  | 'staff';

export interface Conversation {
  id: string;
  customerName: string;
  avatarUrl?: string;
  score: ScoreTier;
  scoreTrend?: 'up' | 'down' | 'stable';
  stage: FunnelStage;
  lastMessage: string;
  lastMessageTime: Date;
  lastMessageSender: MessageSender;
  unread: boolean;
  area: string;
  propertyType: string;
  unansweredSince?: Date;
  nurtureRecommendation?: string;
  // LINE-sourced conversations carry both the raw LINE display name and an optional local alias
  lineUserId?: string;
  lineDisplayName?: string;
  lineAliasName?: string;
  assignedAgentId?: string;
}

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file' | 'sticker';

export interface MessageAttachment {
  kind: AttachmentKind;
  url: string;            // /api/line/content/{messageId} — or external for stickers
  contentType?: string;
  fileName?: string;
  fileSize?: number;
}

export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: Date;
  readStatus?: ReadStatus;
  isProperty?: boolean;
  interpretation?: string;
  attachment?: MessageAttachment;
  // LINE quote/reply plumbing:
  //   quoteToken     — token that *this* message can be quoted by (used when
  //                    the user or staff taps "リプライ" on this bubble).
  //   quotedMessageId — id of the message this one is replying to; the UI
  //                    resolves it against the current thread to render the
  //                    quoted snippet above the bubble.
  quoteToken?: string;
  quotedMessageId?: string;
}

export interface SuggestedProperty {
  id: string;
  name: string;
  rent: string;
  matchScore: number;
}

export interface AiSuggestion {
  id: string;
  mode: AiMode;
  text: string;
  reasoning: string;
  alternatives?: string[];
  isStreaming?: boolean;
  suggestedProperties?: SuggestedProperty[];
}

export interface SmartReply {
  id: string;
  text: string;
}

export interface CustomerProfile {
  name: string;
  lineId: string;
  avatarUrl?: string;
  firstContact: string;
  source: string;
  sourceProperty: string;
  stage: FunnelStage;
  requirements: Requirement[];
  behaviorLog: BehaviorEntry[];
}

export interface Requirement {
  label: string;
  value?: string;
  captured: boolean;
}

export interface BehaviorEntry {
  date: string;
  action: string;
}

export interface Property {
  id: string;
  name: string;
  imageUrl: string;
  type: string;
  rent: string;
  walkMinutes: number;
  station: string;
  matchScore: number;
  suggested?: boolean;
}

export interface PersonalityAnalysis {
  estimatedType: string;
  communicationStyle: string;
  sensitivities: { label: string; level: 'high' | 'mid' | 'low' }[];
  lifeRhythm: { description: string; recommendation: string };
  decisionPattern: string;
}

export interface Inquiry {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  timestamp: Date;
}

export interface SalesAgent {
  id: string;
  name: string;
}

export interface ViewingSlot {
  id: string;
  agentId: string;
  agentName: string;
  customerName: string;
  property: string;
  area: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface SuggestedReaction {
  propertyName: string;
  reaction: 'interested' | 'neutral' | 'rejected';
  comment?: string;
}

// Icons intentionally NOT in this data-only module — see
// `src/components/Icons.tsx` for the `<ScoreIcon tier=... />` component. We
// can't inline Material Symbols here without dragging React into a pure types
// file, and per ~/.claude/rules/no-emoji.md emoji strings are forbidden.
export const SCORE_CONFIG: Record<ScoreTier, { label: string; color: string }> = {
  high: { label: '高', color: 'var(--score-high)' },
  mid: { label: '中', color: 'var(--score-mid)' },
  low: { label: '低', color: 'var(--score-low)' },
};

export const STAGE_CONFIG: Record<FunnelStage, { label: string; labelShort: string }> = {
  initial: { label: '初回接触', labelShort: '初回' },
  proposal_1: { label: '提案1回目', labelShort: '提案①' },
  proposal_2: { label: '提案2回目', labelShort: '提案②' },
  proposal_3: { label: '提案3回目', labelShort: '提案③' },
  proposal_4plus: { label: '提案4回目以降', labelShort: '提案④+' },
  viewing: { label: '内見', labelShort: '内見' },
  screening: { label: '審査', labelShort: '審査' },
  deal: { label: '成約', labelShort: '成約' },
};

// See `AiModeIcon` in `src/components/Icons.tsx` for the glyph per mode.
export const AI_MODE_CONFIG: Record<AiMode, { label: string }> = {
  pounce: { label: '即応' },
  suggest: { label: '提案' },
  expand: { label: '展開' },
  tune: { label: '調整' },
  nurture: { label: '追客' },
};

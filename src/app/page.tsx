'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ViewMode, Conversation, Inquiry, CustomerProfile, Message, RecommendState, SmartReply, Property } from '@/lib/types';
import type { NotionCustomer } from '@/lib/notion';
import { customerToConversation, customerToInquiry, customerToProfile } from '@/lib/notion-map';
import Header from '@/components/Header';
import ConversationList from '@/components/ConversationList';
import ChatThread from '@/components/ChatThread';
import ContextPanel from '@/components/ContextPanel';
import CrmView from '@/components/CrmView';
import InquiryListView from '@/components/InquiryListView';
import ViewingCalendarView from '@/components/ViewingCalendarView';
import AgentListView from '@/components/AgentListView';
import { useAgents } from '@/lib/agent-store';
import ObikaeLauncher, {
  type ObikaeDonePayload,
  type ObikaeSession,
  type ObikaeVacancyInput,
} from '@/components/ObikaeLauncher';
import { OBIKAE_POPUP_FEATURES, buildObikaeEditorUrl } from '@/lib/obikae-launch';
import type { BukkakuResult } from '@/lib/types-bukkaku';
import { salesAgents, viewingSlots } from '@/lib/mock-data';

type MobilePanel = 'list' | 'chat' | 'context';

// NotionCustomer uses ISO strings; after JSON round-trip dates are strings.
type RawCustomer = Omit<NotionCustomer, never>;

// ---- LINE live types -------------------------------------------------------
type LineCustomer = {
  lineUserId: string;
  displayName: string;
  aliasName?: string;
  pictureUrl?: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageDirection?: 'incoming' | 'outgoing';
};

type StoredLineMessage = {
  id: string;
  lineUserId: string;
  direction: 'incoming' | 'outgoing';
  text: string;
  timestamp: string;
};

const LINE_PREFIX = 'line-';
const toLineConvId = (lineUserId: string) => `${LINE_PREFIX}${lineUserId}`;
const fromLineConvId = (id: string) =>
  id.startsWith(LINE_PREFIX) ? id.slice(LINE_PREFIX.length) : null;

function lineCustomerToConversation(c: LineCustomer): Conversation {
  const isUnanswered = c.lastMessageDirection === 'incoming';
  return {
    id: toLineConvId(c.lineUserId),
    customerName: c.aliasName || c.displayName || 'LINE User',
    avatarUrl: c.pictureUrl,
    score: 'mid',
    scoreTrend: 'stable',
    stage: 'initial',
    lastMessage: c.lastMessagePreview || '（メッセージなし）',
    lastMessageTime: new Date(c.lastMessageAt),
    lastMessageSender: isUnanswered ? 'customer' : 'agent',
    unread: isUnanswered,
    area: 'LINE',
    propertyType: 'live',
    unansweredSince: isUnanswered ? new Date(c.lastMessageAt) : undefined,
    lineUserId: c.lineUserId,
    lineDisplayName: c.displayName,
    lineAliasName: c.aliasName,
  };
}

function lineMessageToMessage(m: StoredLineMessage): Message {
  return {
    id: m.id,
    sender: m.direction === 'incoming' ? 'customer' : 'agent',
    text: m.text,
    timestamp: new Date(m.timestamp),
    readStatus: m.direction === 'outgoing' ? 'sent' : undefined,
  };
}

export default function Home() {
  const [customers, setCustomers] = useState<RawCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [lineCustomers, setLineCustomers] = useState<LineCustomer[]>([]);
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');
  const [showContextPanel, setShowContextPanel] = useState(false);

  const [recommendations, setRecommendations] = useState<Record<string, RecommendState>>({});
  const recommendPollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  // Obikae (帯替え) popup-window session. Includes `startedAt` so the
  // launcher only opens the popup once per click.
  const [obikaeSession, setObikaeSession] = useState<
    (ObikaeSession & { conversationId: string }) | null
  >(null);

  // Chat composer prefill (used to auto-insert proposal text after 帯替え)
  const [chatPrefill, setChatPrefill] = useState<{
    conversationId: string;
    text: string;
    nonce: number;
  } | null>(null);

  const {
    agents,
    addAgent,
    removeAgent,
    renameAgent,
    reorderAgents,
    assignAgent,
    getAssignedAgentId,
  } = useAgents();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/customers');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { customers: RawCustomer[] };
        if (cancelled) return;
        setCustomers(data.customers);
        if (data.customers.length > 0) {
          setSelectedConversationId(data.customers[0].id);
        }
      } catch (err) {
        if (!cancelled) setLoadError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll LINE live conversations every 3 seconds
  useEffect(() => {
    let cancelled = false;
    const fetchLine = async () => {
      try {
        const res = await fetch('/api/line/conversations', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { customers: LineCustomer[] };
        if (!cancelled) setLineCustomers(data.customers);
      } catch {
        /* silent — webhook not yet configured is OK */
      }
    };
    fetchLine();
    const t = setInterval(fetchLine, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Poll LINE messages for selected conversation every 2 seconds
  const selectedLineUserId = selectedConversationId
    ? fromLineConvId(selectedConversationId)
    : null;

  useEffect(() => {
    if (!selectedLineUserId) {
      setLiveMessages([]);
      return;
    }
    let cancelled = false;
    const userId = selectedLineUserId;
    const fetchMsgs = async () => {
      try {
        const res = await fetch(`/api/line/messages/${encodeURIComponent(userId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages: StoredLineMessage[] };
        if (!cancelled) setLiveMessages(data.messages.map(lineMessageToMessage));
      } catch {
        /* silent */
      }
    };
    fetchMsgs();
    const t = setInterval(fetchMsgs, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [selectedLineUserId]);

  const sendLineMessage = useCallback(
    async (text: string) => {
      if (!selectedLineUserId) return;
      setSendError(null);
      const res = await fetch(
        `/api/line/messages/${encodeURIComponent(selectedLineUserId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSendError(body.error || `HTTP ${res.status}`);
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      // Optimistic refresh
      try {
        const r = await fetch(
          `/api/line/messages/${encodeURIComponent(selectedLineUserId)}`,
          { cache: 'no-store' },
        );
        if (r.ok) {
          const data = (await r.json()) as { messages: StoredLineMessage[] };
          setLiveMessages(data.messages.map(lineMessageToMessage));
        }
      } catch {
        /* silent */
      }
    },
    [selectedLineUserId],
  );

  const conversations = useMemo<Conversation[]>(
    () => lineCustomers.map(lineCustomerToConversation),
    [lineCustomers],
  );

  const inquiries = useMemo<Inquiry[]>(
    () => customers.map(customerToInquiry),
    [customers],
  );

  const customerProfiles = useMemo<Record<string, CustomerProfile>>(() => {
    const map: Record<string, CustomerProfile> = {};
    for (const c of customers) map[c.id] = customerToProfile(c);
    return map;
  }, [customers]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? conversations[0] ?? null,
    [conversations, selectedConversationId],
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedConversationId) ?? null,
    [customers, selectedConversationId],
  );

  const selectedLineCustomer = useMemo(
    () =>
      selectedLineUserId
        ? (lineCustomers.find((c) => c.lineUserId === selectedLineUserId) ?? null)
        : null,
    [lineCustomers, selectedLineUserId],
  );

  const isLiveLine = !!selectedLineUserId;
  const messages: Message[] = isLiveLine ? liveMessages : [];
  const aiSuggestion = null;
  const smartReplies: SmartReply[] = [];
  const properties: Property[] = [];
  const personality = undefined;
  const suggestedReactions = undefined;

  const liveLineProfile = useMemo<CustomerProfile | null>(() => {
    if (!selectedLineCustomer) return null;
    const firstContact = new Date(selectedLineCustomer.createdAt).toLocaleDateString('ja-JP');
    return {
      name: selectedLineCustomer.displayName || 'LINE User',
      lineId: selectedLineCustomer.lineUserId,
      firstContact,
      source: 'LINE',
      sourceProperty: '（未取得）',
      stage: 'initial',
      requirements: [],
      behaviorLog: [
        { date: firstContact, action: 'LINE友だち追加' },
      ],
    };
  }, [selectedLineCustomer]);

  const customerProfile = isLiveLine
    ? liveLineProfile
    : selectedConversationId
      ? (customerProfiles[selectedConversationId] ?? null)
      : null;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMobilePanel('chat');
  }, []);

  const handleCrmSelect = useCallback((id: string) => {
    setSelectedConversationId(id);
    setViewMode('chat');
    setMobilePanel('chat');
  }, []);

  const handleInquiryChat = useCallback(
    (customerName: string) => {
      const conv = conversations.find((c) => c.customerName === customerName);
      if (conv) {
        setSelectedConversationId(conv.id);
        setViewMode('chat');
        setMobilePanel('chat');
      } else {
        console.log('LINE誘導:', customerName);
      }
    },
    [conversations],
  );

  const handleShowContext = useCallback(() => {
    setMobilePanel('context');
    setShowContextPanel((v) => !v);
  }, []);

  const handleStartObikae = useCallback(
    (vacancies: BukkakuResult[]) => {
      if (!selectedConversation) return;
      const customerName =
        selectedConversation.customerName?.trim() || 'お客様';

      const payload: ObikaeVacancyInput[] = vacancies
        .map((r): ObikaeVacancyInput | null => {
          const reinsId = r.property?.reins_id;
          if (!reinsId) return null;
          return {
            reinsId,
            // Already fetched by the bukkaku pipeline — hand it through so the
            // popup can skip re-fetching from REINS.
            maisokuUrl: r.property?.maisoku_url ?? null,
            propertyName: r.property?.property_name ?? undefined,
            roomNumber: r.property?.room_number ?? undefined,
            address: r.property?.address ?? undefined,
            rent: r.property?.rent ?? null,
            managementCompany: r.property?.management_company ?? undefined,
            platformId: r.platformId ?? undefined,
          };
        })
        .filter((v): v is ObikaeVacancyInput => v !== null);

      if (payload.length === 0) return;

      // Open the popup synchronously inside the user-gesture handler so the
      // browser's popup blocker allows it.
      const url = buildObikaeEditorUrl(
        customerName,
        payload,
        window.location.origin,
      );
      const popup = url
        ? window.open(url, 'fango-obikae', OBIKAE_POPUP_FEATURES)
        : null;

      setObikaeSession({
        conversationId: selectedConversation.id,
        customerName,
        vacancies: payload,
        startedAt: Date.now(),
        popup,
      });
    },
    [selectedConversation],
  );

  const handleObikaeComplete = useCallback(
    (payload: ObikaeDonePayload) => {
      const activeConversationId =
        obikaeSession?.conversationId ?? selectedConversationId;
      if (activeConversationId) {
        const customerName = payload.customerName?.trim() || 'お客様';
        const text =
          `${customerName}様\n` +
          `\n` +
          `お待たせいたしました。本日時点でご案内可能な物件をまとめました。\n` +
          `下記リンクからスワイプで順番にご覧いただけます。\n` +
          `\n` +
          `▼ 物件をみる\n` +
          `${payload.proposeUrl}\n` +
          `\n` +
          `ご不明点があればこのトークにお返事ください。`;

        setChatPrefill({
          conversationId: activeConversationId,
          text,
          nonce: Date.now(),
        });
      }
      // Clear the session so the banner disappears.
      setObikaeSession(null);
    },
    [obikaeSession?.conversationId, selectedConversationId],
  );

  const handleObikaeDismiss = useCallback(() => {
    setObikaeSession(null);
  }, []);

  const handleObikaeReopen = useCallback(() => {
    setObikaeSession((prev) => {
      if (!prev) return prev;
      const url = buildObikaeEditorUrl(
        prev.customerName,
        prev.vacancies,
        window.location.origin,
      );
      const popup = url
        ? window.open(url, 'fango-obikae', OBIKAE_POPUP_FEATURES)
        : null;
      return { ...prev, popup, startedAt: Date.now() };
    });
  }, []);

  const handleCloseContext = useCallback(() => {
    setMobilePanel('chat');
    setShowContextPanel(false);
  }, []);

  const renameLineCustomer = useCallback(
    async (lineUserId: string, aliasName: string | null) => {
      const res = await fetch(
        `/api/line/customers/${encodeURIComponent(lineUserId)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aliasName }),
        },
      );
      if (!res.ok) throw new Error(`rename failed: HTTP ${res.status}`);
      const { customer } = (await res.json()) as { customer: LineCustomer };
      setLineCustomers((prev) =>
        prev.map((c) => (c.lineUserId === lineUserId ? customer : c)),
      );
    },
    [],
  );

  const handleCustomerUpdate = useCallback(async (id: string, patch: Partial<Pick<NotionCustomer, 'email' | 'phone' | 'name'>>) => {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`PATCH failed: HTTP ${res.status}`);
    const { customer } = (await res.json()) as { customer: RawCustomer };
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
  }, []);

  const searchRecommendations = useCallback(
    async (conversationId: string, conversationName: string, msgs: Message[]) => {
      // Call memo is persisted by useCallMemo under `call-memo:{conversationId}`.
      // Include it at the top of the requirements so Fango Recommend's
      // extractor weights agent-written context (area, must-haves) over raw
      // chat noise.
      let memoText = '';
      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem(`call-memo:${conversationId}`);
          if (raw) {
            const parsed = JSON.parse(raw) as { text?: unknown };
            if (typeof parsed.text === 'string') memoText = parsed.text.trim();
          }
        } catch {
          /* ignore malformed memo */
        }
      }

      const chatLines = msgs.map((m) => {
        const time = m.timestamp.toLocaleString('ja-JP');
        const who = m.sender === 'customer' ? conversationName : '営業担当';
        return `[${time}] ${who}: ${m.text}`;
      });
      const chatBlock = chatLines.length > 0 ? chatLines.join('\n') : '（チャット履歴なし）';

      const requirements = memoText
        ? `【電話メモ (営業担当の記録 / 優先条件)】\n${memoText}\n\n【LINEチャット履歴】\n${chatBlock}`
        : chatLines.length > 0
          ? chatBlock
          : '条件未指定';

      setRecommendations((prev) => ({
        ...prev,
        [conversationId]: { status: 'searching', projectId: null, results: [], error: null },
      }));

      try {
        const res = await fetch('/api/recommend/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerName: conversationName, requirements }),
        });
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = (await res.json()) as { projectId: string };
        const projectId = data.projectId;

        setRecommendations((prev) => ({
          ...prev,
          [conversationId]: { ...prev[conversationId], projectId },
        }));

        const existing = recommendPollingRef.current[conversationId];
        if (existing) clearInterval(existing);

        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/recommend/status/${projectId}`);
            if (!statusRes.ok) return;
            const statusData = (await statusRes.json()) as {
              status: string;
              results: import('@/lib/types').RecommendSearchResult[];
            };
            if (statusData.status === 'complete' && statusData.results.length > 0) {
              setRecommendations((prev) => ({
                ...prev,
                [conversationId]: {
                  status: 'complete',
                  projectId,
                  results: statusData.results,
                  error: null,
                },
              }));
              clearInterval(pollInterval);
              delete recommendPollingRef.current[conversationId];
            }
          } catch {
            /* keep polling on transient errors */
          }
        }, 5000);

        recommendPollingRef.current[conversationId] = pollInterval;

        setTimeout(() => {
          if (recommendPollingRef.current[conversationId]) {
            clearInterval(recommendPollingRef.current[conversationId]);
            delete recommendPollingRef.current[conversationId];
            setRecommendations((prev) => {
              if (prev[conversationId]?.status === 'searching') {
                return {
                  ...prev,
                  [conversationId]: {
                    ...prev[conversationId],
                    status: 'error',
                    error: '検索がタイムアウトしました',
                  },
                };
              }
              return prev;
            });
          }
        }, 180_000);
      } catch (err) {
        setRecommendations((prev) => ({
          ...prev,
          [conversationId]: {
            status: 'error',
            projectId: null,
            results: [],
            error: err instanceof Error ? err.message : '検索に失敗しました',
          },
        }));
      }
    },
    [],
  );

  useEffect(() => {
    const polls = recommendPollingRef.current;
    return () => {
      for (const t of Object.values(polls)) clearInterval(t);
    };
  }, []);

  const listCls = [mobilePanel === 'list' ? 'flex' : 'hidden', 'md:flex'].join(' ');
  const chatCls = [mobilePanel === 'chat' ? 'flex' : 'hidden', 'md:flex'].join(' ');
  const contextCls = [
    mobilePanel === 'context' ? 'flex' : 'hidden',
    showContextPanel ? 'md:flex' : 'md:hidden',
    'xl:flex',
  ].join(' ');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
        Notion から顧客データを読み込み中…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 text-sm p-8">
        Notion 読み込み失敗: {loadError}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />

      {viewMode === 'crm' && (
        <CrmView
          conversations={conversations}
          onSelectConversation={handleCrmSelect}
          onRenameLine={renameLineCustomer}
        />
      )}

      {viewMode === 'calendar' && (
        <ViewingCalendarView agents={salesAgents} viewingSlots={viewingSlots} />
      )}

      {viewMode === 'inquiries' && (
        <InquiryListView inquiries={inquiries} onOpenChat={handleInquiryChat} />
      )}

      {viewMode === 'agents' && (
        <AgentListView
          agents={agents}
          onAdd={addAgent}
          onRemove={removeAgent}
          onRename={renameAgent}
          onReorder={reorderAgents}
        />
      )}

      {viewMode === 'chat' && (
        <div className="flex flex-1 min-h-0">
          <div className={`${listCls} w-full md:w-[300px] shrink-0 border-r border-border overflow-y-auto`}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId ?? ''}
              onSelect={handleSelectConversation}
              agents={agents}
              getAssignedAgentId={getAssignedAgentId}
              onAssignAgent={assignAgent}
            />
          </div>

          <div className={`${chatCls} flex-1 min-w-0 overflow-hidden border-r border-border`}>
            {selectedConversation ? (
              <ChatThread
                conversation={selectedConversation}
                messages={messages}
                aiSuggestion={aiSuggestion}
                smartReplies={smartReplies}
                onBack={() => setMobilePanel('list')}
                onShowContext={handleShowContext}
                onSend={isLiveLine ? sendLineMessage : undefined}
                sendError={isLiveLine ? sendError : null}
                lineDisplayName={selectedLineCustomer?.displayName}
                lineAliasName={selectedLineCustomer?.aliasName}
                onRename={
                  selectedLineUserId
                    ? (alias) => renameLineCustomer(selectedLineUserId, alias)
                    : undefined
                }
                prefillText={
                  chatPrefill && chatPrefill.conversationId === selectedConversation.id
                    ? chatPrefill.text
                    : undefined
                }
                prefillNonce={
                  chatPrefill && chatPrefill.conversationId === selectedConversation.id
                    ? chatPrefill.nonce
                    : undefined
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                会話がありません
              </div>
            )}
          </div>

          <div className={`${contextCls} w-full md:w-[400px] xl:w-[460px] 2xl:w-[500px] shrink-0 overflow-y-auto`}>
            {selectedConversation && customerProfile ? (
              <ContextPanel
                conversation={selectedConversation}
                customerProfile={customerProfile}
                properties={properties}
                personality={personality}
                suggestedReactions={suggestedReactions}
                onClose={handleCloseContext}
                editableCustomer={
                  selectedCustomer
                    ? {
                        id: selectedCustomer.id,
                        email: selectedCustomer.email,
                        phone: selectedCustomer.phone,
                      }
                    : undefined
                }
                onSaveContact={handleCustomerUpdate}
                recommend={recommendations[selectedConversation.id]}
                hasMessages={messages.length > 0}
                onSearchRecommend={() =>
                  searchRecommendations(selectedConversation.id, selectedConversation.customerName, messages)
                }
                onStartObikae={handleStartObikae}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                会話を選択してください
              </div>
            )}
          </div>
        </div>
      )}

      <ObikaeLauncher
        session={obikaeSession}
        onComplete={handleObikaeComplete}
        onDismiss={handleObikaeDismiss}
        onReopenPopup={handleObikaeReopen}
      />
    </div>
  );
}

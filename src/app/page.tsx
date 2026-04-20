'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ViewMode } from '@/lib/types';
import Header from '@/components/Header';
import ConversationList from '@/components/ConversationList';
import ChatThread from '@/components/ChatThread';
import ContextPanel from '@/components/ContextPanel';
import CrmView from '@/components/CrmView';
import InquiryListView from '@/components/InquiryListView';
import ViewingCalendarView from '@/components/ViewingCalendarView';
import {
  conversations,
  messagesForConv1,
  aiSuggestionForConv1,
  smartRepliesForConv1,
  customerProfileForConv1,
  propertiesForConv1,
  personalityForConv1,
  suggestedReactionsForConv1,
  inquiries,
  salesAgents,
  viewingSlots,
} from '@/lib/mock-data';

type MobilePanel = 'list' | 'chat' | 'context';

export default function Home() {
  const [selectedConversationId, setSelectedConversationId] = useState('1');
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('list');
  const [showContextPanel, setShowContextPanel] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? conversations[0],
    [selectedConversationId],
  );

  const isConv1 = selectedConversationId === '1';
  const messages = isConv1 ? messagesForConv1 : [];
  const aiSuggestion = isConv1 ? aiSuggestionForConv1 : null;
  const smartReplies = isConv1 ? smartRepliesForConv1 : [];
  const customerProfile = isConv1 ? customerProfileForConv1 : null;
  const properties = isConv1 ? propertiesForConv1 : [];
  const personality = isConv1 ? personalityForConv1 : undefined;
  const suggestedReactions = isConv1 ? suggestedReactionsForConv1 : undefined;

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    setMobilePanel('chat');
  }, []);

  const handleCrmSelect = useCallback((id: string) => {
    setSelectedConversationId(id);
    setViewMode('chat');
    setMobilePanel('chat');
  }, []);

  const handleInquiryChat = useCallback((customerName: string) => {
    const conv = conversations.find((c) => c.customerName === customerName);
    if (conv) {
      setSelectedConversationId(conv.id);
      setViewMode('chat');
      setMobilePanel('chat');
    } else {
      console.log('LINE誘導:', customerName);
    }
  }, []);

  const handleShowContext = useCallback(() => {
    setMobilePanel('context');
    setShowContextPanel((v) => !v);
  }, []);

  const handleCloseContext = useCallback(() => {
    setMobilePanel('chat');
    setShowContextPanel(false);
  }, []);

  // Responsive class builders for chat view panels
  // Mobile (<md): controlled by mobilePanel state
  // Tablet (md-xl): list+chat always visible, context toggled by showContextPanel
  // Desktop (xl+): all three always visible
  const listCls = [
    mobilePanel === 'list' ? 'flex' : 'hidden',
    'md:flex',
  ].join(' ');

  const chatCls = [
    mobilePanel === 'chat' ? 'flex' : 'hidden',
    'md:flex',
  ].join(' ');

  const contextCls = [
    mobilePanel === 'context' ? 'flex' : 'hidden',
    showContextPanel ? 'md:flex' : 'md:hidden',
    'xl:flex',
  ].join(' ');

  return (
    <div className="flex flex-col h-full">
      <Header viewMode={viewMode} onViewModeChange={setViewMode} />

      {viewMode === 'crm' && (
        <CrmView
          conversations={conversations}
          onSelectConversation={handleCrmSelect}
        />
      )}

      {viewMode === 'calendar' && (
        <ViewingCalendarView
          agents={salesAgents}
          viewingSlots={viewingSlots}
        />
      )}

      {viewMode === 'inquiries' && (
        <InquiryListView
          inquiries={inquiries}
          onOpenChat={handleInquiryChat}
        />
      )}

      {viewMode === 'chat' && (
        <div className="flex flex-1 min-h-0">
          {/* Conversation List */}
          <div className={`${listCls} w-full md:w-[260px] shrink-0 border-r border-border overflow-y-auto`}>
            <ConversationList
              conversations={conversations}
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
            />
          </div>

          {/* Chat Thread */}
          <div className={`${chatCls} flex-1 min-w-0 overflow-hidden border-r border-border`}>
            <ChatThread
              conversation={selectedConversation}
              messages={messages}
              aiSuggestion={aiSuggestion}
              smartReplies={smartReplies}
              onBack={() => setMobilePanel('list')}
              onShowContext={handleShowContext}
            />
          </div>

          {/* Context Panel */}
          <div className={`${contextCls} w-full md:w-[320px] xl:w-[340px] shrink-0 overflow-y-auto`}>
            {customerProfile ? (
              <ContextPanel
                conversation={selectedConversation}
                customerProfile={customerProfile}
                properties={properties}
                personality={personality}
                suggestedReactions={suggestedReactions}
                onClose={handleCloseContext}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                会話を選択してください
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

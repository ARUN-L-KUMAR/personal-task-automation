import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { chatbotService } from '@/services/chatbot.service';
import { chatHistoryService } from '@/services/chatHistory.service';
import { ChatThreadSummary, ChatbotMessage } from '@/types/chatbot';

function makeMessage(role: 'user' | 'assistant', content: string): ChatbotMessage {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function buildThreadTitle(messages: ChatbotMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')?.content || 'New Chat';
  const trimmed = firstUser.trim();
  if (!trimmed) {
    return 'New Chat';
  }
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}...` : trimmed;
}

export function ChatbotScreen() {
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPrompts = useMemo(
    () => ['What is my next meeting?', 'Show urgent tasks', 'Summarize my day', 'What should I prioritize now?'],
    []
  );

  const loadThreads = useCallback(async () => {
    setIsLoadingThreads(true);
    try {
      const items = await chatHistoryService.listThreads();
      setThreads(items);

      if (items.length === 0) {
        setActiveSessionId(null);
        setMessages([]);
      } else if (!activeSessionId) {
        const latest = items[0];
        const full = await chatHistoryService.getThread(latest.id);
        setActiveSessionId(full.id);
        setMessages(full.messages || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load chat threads');
    } finally {
      setIsLoadingThreads(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const openThread = async (sessionId: string) => {
    try {
      const thread = await chatHistoryService.getThread(sessionId);
      setActiveSessionId(thread.id);
      setMessages(thread.messages || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load thread');
    }
  };

  const startNewThread = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  };

  const persistMessages = useCallback(
    async (nextMessages: ChatbotMessage[]) => {
      const saved = await chatHistoryService.saveThread({
        sessionId: activeSessionId || undefined,
        title: buildThreadTitle(nextMessages),
        messages: nextMessages,
      });

      setActiveSessionId(saved.id);
      const list = await chatHistoryService.listThreads();
      setThreads(list);
    },
    [activeSessionId]
  );

  const deleteActiveThread = async () => {
    if (!activeSessionId) {
      startNewThread();
      return;
    }

    try {
      await chatHistoryService.deleteThread(activeSessionId);
      const list = await chatHistoryService.listThreads();
      setThreads(list);

      if (list.length > 0) {
        await openThread(list[0].id);
      } else {
        startNewThread();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete thread');
    }
  };

  const confirmDeleteThread = () => {
    if (!activeSessionId) {
      startNewThread();
      return;
    }

    Alert.alert('Delete chat', 'This conversation will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteActiveThread();
        },
      },
    ]);
  };

  const onSend = async () => {
    const message = input.trim();
    if (!message || isSending) {
      return;
    }

    const userMessage = makeMessage('user', message);
    const nextMessages: ChatbotMessage[] = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      const response = await chatbotService.ask({
        message,
        history: nextMessages,
      });

      const assistantReply = (response.response || response.reply || '').trim() || 'No response from assistant.';
      const assistantMessage = makeMessage('assistant', assistantReply);
      const fullMessages = [...nextMessages, assistantMessage];

      setMessages(fullMessages);
      await persistMessages(fullMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
    } finally {
      setIsSending(false);
    }
  };

  const onQuickPrompt = (value: string) => {
    setInput(value);
  };

  const threadTitle = useMemo(() => {
    if (activeSessionId) {
      const found = threads.find((t) => t.id === activeSessionId);
      if (found?.title) {
        return found.title;
      }
    }
    return messages.length ? buildThreadTitle(messages) : 'New Chat';
  }, [activeSessionId, threads, messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ═══ Header Section ═══ */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>G-One Assistant</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>AI Active</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={startNewThread}>
              <Text style={styles.headerButtonText}>New</Text>
            </Pressable>
            <Pressable style={[styles.headerButton, styles.headerButtonDanger]} onPress={confirmDeleteThread}>
              <Text style={[styles.headerButtonText, styles.headerButtonTextDanger]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ═══ Chat Content ═══ */}
      <View style={styles.chatContent}>
        {/* Thread History Chips */}
        <View style={styles.historyContainer}>
          <FlatList
            horizontal
            data={threads}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.historyChip, item.id === activeSessionId ? styles.historyChipActive : null]}
                onPress={() => void openThread(item.id)}
              >
                <Text style={[styles.historyChipLabel, item.id === activeSessionId ? styles.historyChipLabelActive : null]}>
                  {item.title}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyHistoryText}>
                {isLoadingThreads ? 'Syncing sessions...' : 'No past sessions'}
              </Text>
            }
          />
        </View>

        {/* Message List */}
        <FlatList
          data={messages}
          keyExtractor={(item, index) => item.id || `msg_${index}`}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
              <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.aiText]}>
                  {normalizeResponseText(item.content)}
                </Text>
                <Text style={[styles.metaText, item.role === 'user' ? styles.userMetaText : styles.aiMetaText]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          )}
          ListHeaderComponent={
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Syncing with your workspace</Text>
              <Text style={styles.bannerSubtitle}>Your secure gateway to tasks, calendar, and emails.</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <View style={styles.emptyIcon} />
              </View>
              <Text style={styles.emptyTitle}>How can I help you today?</Text>
              <Text style={styles.emptySubtitle}>I'm connected to your Google workspace. Ask me to plan your day, summarize meetings, or find urgent tasks.</Text>
              
              <View style={styles.quickPromptsContainer}>
                {quickPrompts.map((prompt) => (
                  <Pressable key={prompt} style={styles.quickPromptButton} onPress={() => onQuickPrompt(prompt)}>
                    <Text style={styles.quickPromptText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
        />
      </View>

      {/* ═══ Footer / Composer ═══ */}
      <View style={styles.footer}>
        {isSending && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingPulse} />
            <Text style={styles.loadingText}>G-One is thinking...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.composerContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message G-One..."
              placeholderTextColor="#94A3B8"
              style={styles.input}
              multiline
              maxHeight={120}
            />
          </View>
          <Pressable
            style={[styles.sendButton, !input.trim() || isSending ? styles.sendButtonDisabled : null]}
            onPress={onSend}
            disabled={!input.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>{isSending ? '...' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function normalizeResponseText(content: string): string {
  // Keep chat readable even when model replies in markdown-like formatting.
  return content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\s{3,}/g, '  ').trim();
}

function formatTime(timestamp?: string): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonDanger: {
    backgroundColor: '#FFF1F2',
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  headerButtonTextDanger: {
    color: '#E11D48',
  },
  chatContent: {
    flex: 1,
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  historyChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  historyChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  historyChipLabelActive: {
    color: '#4F46E5',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  messageRow: {
    marginVertical: 6,
    width: '100%',
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  aiText: {
    color: '#1E293B',
  },
  metaText: {
    fontSize: 10,
    marginTop: 6,
  },
  userMetaText: {
    color: '#C7D2FE',
    textAlign: 'right',
  },
  aiMetaText: {
    color: '#94A3B8',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    width: 32,
    height: 32,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  quickPromptsContainer: {
    width: '100%',
    gap: 12,
  },
  quickPromptButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  quickPromptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  loadingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginRight: 8,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  errorContainer: {
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#E11D48',
    fontSize: 13,
    fontWeight: '500',
  },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    fontSize: 15,
    color: '#1E293B',
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    minWidth: 76,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

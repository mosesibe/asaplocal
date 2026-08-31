import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Send, RotateCcw, Wrench, ListOrdered, Mail, Check } from 'lucide-react-native';
import { Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/auth-guard';
import { ApiError } from '@asaplocal/api-client';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolkit?: string[] | null;
  steps?: string[] | null;
  needsPro?: boolean;
}

const STORAGE_KEY = 'asaplocal:aiBuddyChat';
const MAX_SENT_MESSAGES = 20;
const INTRO: DisplayMessage = {
  role: 'assistant',
  content: "Hi, I'm AI Buddy 👋 Describe what's going wrong and I'll help you figure out if it's a quick DIY fix or you need a pro.",
};

// Ports apps/web/components/ai-buddy.tsx — embedded directly in Home when
// the "Ask AI Buddy" pill is active (matching web's homepage-ai-section.tsx,
// where this is inline content, not a separate page). Bounded-height
// message list (web: max-h-96) with its own scroll, sitting inline in
// Home's outer ScrollView — same shape as the web card. Non-streaming,
// single-turn request/response against the fully anonymous
// POST /api/ai-buddy/chat. Chat history persists locally (AsyncStorage here,
// vs localStorage on web) rather than server-side.
export function AiBuddyCard() {
  const router = useRouter();
  const requireAuth = useRequireAuth();
  const { colors, radius, spacing } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setMessages(JSON.parse(raw));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setSending(true);
    try {
      const payload = next.slice(-MAX_SENT_MESSAGES).map((m) => ({ role: m.role, content: m.content }));
      const res = await api.request<{ reply: string; needsPro: boolean; toolkit: string[] | null; steps: string[] | null }>(
        '/api/ai-buddy/chat',
        { method: 'POST', body: JSON.stringify({ messages: payload }) }
      );
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply, toolkit: res.toolkit, steps: res.steps, needsPro: res.needsPro }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong — please try again in a moment.');
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [input, messages, sending]);

  async function startOver() {
    setMessages([]);
    setError(null);
    setInput('');
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  async function handleNeedsPro() {
    const summary = [
      'Customer used AI Buddy to troubleshoot this issue before requesting a pro.',
      ...messages.filter((m) => m.role === 'user').map((m) => `- ${m.content}`),
    ].join('\n');

    setHandoffLoading(true);
    try {
      const suggestion = await api.request<{ categoryId: string; title: string; description: string }>('/api/jobs/suggest', {
        method: 'POST',
        body: JSON.stringify({ description: summary }),
      });
      requireAuth('/jobs/new', () =>
        router.push({ pathname: '/jobs/new', params: { categoryId: suggestion.categoryId, title: suggestion.title, description: suggestion.description } })
      );
    } catch {
      requireAuth('/jobs/new', () => router.push({ pathname: '/jobs/new', params: { description: summary } }));
    } finally {
      setHandoffLoading(false);
    }
  }

  return (
    <Card style={[styles.card, { borderRadius: radius.xl }]}>
      <View style={styles.subtitleRow}>
        <Text variant="small" color="muted" style={styles.flexShrink}>
          Not sure if it's a DIY job? Describe it and I'll help you figure it out — free.
        </Text>
        {messages.length > 0 && (
          <Pressable style={styles.startOver} onPress={startOver}>
            <RotateCcw size={14} color={colors.mutedForeground} />
            <Text variant="small" color="muted">
              Start over
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messageBox}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <Bubble message={INTRO} />
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {sending && (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          </View>
        )}
      </ScrollView>

      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}

      {lastAssistant?.needsPro && (
        <Button onPress={handleNeedsPro} loading={handoffLoading} style={styles.ctaButton}>
          This needs a pro — request one, I'll pass along what we discussed
        </Button>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="e.g. My bathroom sink drains really slowly"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.muted, borderRadius: radius.full }]}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable
          onPress={send}
          disabled={sending || input.trim().length === 0}
          style={[styles.sendButton, { backgroundColor: colors.brand[600], opacity: sending || input.trim().length === 0 ? 0.5 : 1 }]}
        >
          <Send size={18} color="#fff" />
        </Pressable>
      </View>
    </Card>
  );
}

function Bubble({ message }: { message: DisplayMessage }) {
  const { colors, radius } = useAppTheme();
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, { borderRadius: radius.lg, backgroundColor: isUser ? colors.brand[600] : colors.muted, maxWidth: '85%' }]}>
        <Text variant="small" style={{ color: isUser ? '#fff' : colors.foreground }}>
          {message.content}
        </Text>
      </View>
      {(message.toolkit?.length || message.steps?.length) && (
        <Card style={[styles.detailCard, { borderRadius: radius.lg }]}>
          {!!message.toolkit?.length && (
            <View style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <Wrench size={14} color={colors.mutedForeground} />
                <Text variant="smallMedium" color="muted">
                  Toolkit
                </Text>
              </View>
              {message.toolkit.map((t, i) => (
                <Text key={i} variant="small" style={styles.detailItem}>
                  • {t}
                </Text>
              ))}
            </View>
          )}
          {!!message.steps?.length && (
            <View style={styles.detailSection}>
              <View style={styles.detailHeader}>
                <ListOrdered size={14} color={colors.mutedForeground} />
                <Text variant="smallMedium" color="muted">
                  Steps
                </Text>
              </View>
              {message.steps.map((s, i) => (
                <Text key={i} variant="small" style={styles.detailItem}>
                  {i + 1}. {s}
                </Text>
              ))}
            </View>
          )}
          <EmailGuide message={message} />
        </Card>
      )}
    </View>
  );
}

function EmailGuide({ message }: { message: DisplayMessage }) {
  const { user } = useSession();
  const { colors, radius } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sent) {
    return (
      <View style={styles.emailSentRow}>
        <Check size={14} color={colors.brand[600]} />
        <Text variant="small" color="muted">
          Sent to {email} — check your inbox.
        </Text>
      </View>
    );
  }

  if (!expanded) {
    return (
      <Pressable style={styles.emailToggle} onPress={() => setExpanded(true)}>
        <Mail size={14} color={colors.brand[600]} />
        <Text variant="small" color="brand">
          Email me this fix
        </Text>
      </Pressable>
    );
  }

  async function handleSend() {
    setSending(true);
    setErr(null);
    try {
      await api.request('/api/ai-buddy/email', {
        method: 'POST',
        body: JSON.stringify({ email, summary: message.content, toolkit: message.toolkit ?? [], steps: message.steps ?? [] }),
      });
      setSent(true);
    } catch {
      setErr("Couldn't send that — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.emailForm}>
      <Text variant="smallMedium" color="muted">
        Email this guide
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.emailInput, { borderColor: colors.border, borderRadius: radius.md, color: colors.foreground }]}
      />
      {err && (
        <Text variant="small" style={styles.error}>
          {err}
        </Text>
      )}
      <Button size="sm" onPress={handleSend} loading={sending} disabled={!email.includes('@')}>
        Send
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  subtitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  flexShrink: { flex: 1 },
  startOver: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  messageBox: { maxHeight: 320 },
  list: { gap: 12, paddingVertical: 4 },
  bubbleRow: { gap: 8 },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubble: { padding: 12 },
  detailCard: { gap: 12, padding: 14 },
  detailSection: { gap: 4 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailItem: { marginLeft: 4 },
  emailToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emailSentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emailForm: { gap: 8 },
  emailInput: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  typingRow: { alignItems: 'flex-start', paddingVertical: 4 },
  error: { color: '#dc2626' },
  ctaButton: {},
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

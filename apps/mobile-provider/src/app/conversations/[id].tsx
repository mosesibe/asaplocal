import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Card, Screen, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

interface ConversationMeta {
  customerName: string;
  leadId: string | null;
  jobRequest: {
    title: string;
    city: string;
    budgetMinPence: number | null;
    budgetMaxPence: number | null;
    categoryName: string | null;
  } | null;
}

function formatPence(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '')).toUpperCase();
}

// Polls rather than subscribing to Pusher (which the web app uses) — keeps
// the mobile client simpler for now at the cost of a few seconds' latency.
// Revisit with pusher-js if that lag turns out to matter in practice.
const POLL_INTERVAL_MS = 5000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ messages: Message[] }>(`/api/conversations/${id}/messages`);
      setMessages(res.messages);
    } catch {
      // best-effort poll — leaves the last known messages in place
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Job-context metadata is fetched once — unlike message polling, it isn't
  // expected to change while the thread is open.
  useEffect(() => {
    api
      .request<ConversationMeta>(`/api/conversations/${id}`)
      .then(setMeta)
      .catch(() => {
        // best-effort — the thread still works without the header
      });
  }, [id]);

  const handleSuggestReply = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await api.request<{ reply: string }>('/api/ai/suggest-reply', {
        method: 'POST',
        body: JSON.stringify({ conversationId: id }),
      });
      setDraft(res.reply);
    } catch {
      // best-effort — leave the draft untouched
    } finally {
      setSuggesting(false);
    }
  }, [id]);

  const handleSend = useCallback(async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setSending(true);
    try {
      await api.request(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      await load();
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      setDraft(body); // restore the draft so the message isn't lost
    } finally {
      setSending(false);
    }
  }, [draft, id, load]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen>
        {meta && (
          <Card style={[styles.metaCard, { marginHorizontal: spacing.four, marginTop: spacing.four }]}>
            <View style={styles.metaHeaderRow}>
              <View style={[styles.avatar, { backgroundColor: colors.brand[100] }]}>
                <Text variant="smallMedium" style={{ color: colors.brand[800] }}>
                  {initials(meta.customerName) || '?'}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.metaName} numberOfLines={1}>
                {meta.customerName}
              </Text>
              {meta.leadId && (
                <Pressable onPress={() => router.push(`/leads/${meta.leadId}`)}>
                  <Text variant="smallMedium" color="brand">
                    View lead →
                  </Text>
                </Pressable>
              )}
            </View>
            {meta.jobRequest && (
              <View style={styles.metaJobRow}>
                <Text variant="small" color="muted" style={styles.metaJobText} numberOfLines={1}>
                  {meta.jobRequest.title} · {meta.jobRequest.city}
                  {meta.jobRequest.budgetMinPence
                    ? ` · Budget ${formatPence(meta.jobRequest.budgetMinPence)}–${
                        meta.jobRequest.budgetMaxPence ? formatPence(meta.jobRequest.budgetMaxPence) : '?'
                      }`
                    : ''}
                </Text>
                {meta.jobRequest.categoryName && <Badge variant="outline">{meta.jobRequest.categoryName}</Badge>}
              </View>
            )}
          </Card>
        )}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { padding: spacing.four }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View
                  style={[
                    styles.bubble,
                    { borderRadius: radius.lg, backgroundColor: mine ? colors.brand[600] : colors.muted },
                  ]}
                >
                  <Text variant="small" color={mine ? 'inverse' : 'foreground'}>
                    {item.body}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text variant="small" color="muted" style={styles.empty}>
              No messages yet — say hello.
            </Text>
          }
        />
        <View style={[styles.inputRow, { borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.suggestButton, { borderRadius: radius.lg, borderColor: colors.border }]}
            onPress={handleSuggestReply}
            disabled={suggesting}
          >
            {suggesting ? (
              <ActivityIndicator size="small" color={colors.brand[600]} />
            ) : (
              <Text variant="smallMedium">✨</Text>
            )}
          </Pressable>
          <TextField style={styles.input} placeholder="Message" value={draft} onChangeText={setDraft} multiline />
          <Pressable
            style={[styles.sendButton, { borderRadius: radius.lg, backgroundColor: colors.brand[600] }]}
            onPress={handleSend}
            disabled={sending || !draft.trim()}
          >
            <Text variant="smallMedium" color="inverse">
              Send
            </Text>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  list: { gap: 8 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 4,
  },
  empty: { textAlign: 'center', marginTop: 64 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  suggestButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaCard: {
    gap: 8,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaName: {
    flex: 1,
  },
  metaJobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaJobText: {
    flex: 1,
  },
});

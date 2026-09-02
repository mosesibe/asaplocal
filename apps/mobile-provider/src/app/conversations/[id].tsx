import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, Sparkles } from 'lucide-react-native';
import { Badge, Card, Screen, Text, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
  const bottomInset = useBottomNavInset();
  const safeAreaInsets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList>(null);

  // bottomInset clears the floating tab bar's height — needed at rest, but
  // once the keyboard is up (and FloatingBottomNav has hidden itself) it's
  // just dead space between the composer and the keyboard, not WhatsApp's
  // input-bar-flush-above-the-keyboard look. Swap to the plain safe-area
  // inset while typing.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
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
        <View style={[styles.inputRow, { paddingBottom: keyboardVisible ? safeAreaInsets.bottom : bottomInset }]}>
          <View style={[styles.pill, { backgroundColor: colors.muted, borderRadius: radius.full }]}>
            <Pressable onPress={handleSuggestReply} disabled={suggesting} style={styles.pillIcon} hitSlop={4}>
              {suggesting ? <ActivityIndicator size="small" color={colors.brand[600]} /> : <Sparkles size={17} color={colors.mutedForeground} />}
            </Pressable>
            <TextField
              style={[styles.pillInput, { backgroundColor: 'transparent', borderWidth: 0 }]}
              placeholder="Message"
              value={draft}
              onChangeText={setDraft}
              multiline
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            style={[styles.sendCircle, { backgroundColor: colors.brand[600], opacity: draft.trim() ? 1 : 0.4 }]}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <ArrowUp size={18} color="#fff" />}
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingLeft: 4,
    paddingRight: 6,
  },
  pillIcon: {
    width: 28,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInput: {
    flex: 1,
    minHeight: 20,
    maxHeight: 90,
    paddingVertical: 7,
    paddingHorizontal: 2,
    fontSize: 15,
  },
  sendCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
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

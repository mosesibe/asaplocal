import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// Polls rather than subscribing to Pusher (which the web app uses) — keeps
// the mobile client simpler for now at the cost of a few seconds' latency.
// Revisit with pusher-js if that lag turns out to matter in practice.
const POLL_INTERVAL_MS = 5000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { colors, radius, spacing } = useAppTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
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
});

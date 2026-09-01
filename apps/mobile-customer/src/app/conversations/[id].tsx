import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Paperclip, X } from 'lucide-react-native';
import { Card, Screen, Text, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { uploadImage } from '@/lib/upload';

interface Message {
  id: string;
  senderId: string;
  body: string;
  attachments: string[];
  createdAt: string;
}
interface MessagesResponse {
  recipientName: string;
  jobRequestId: string | null;
  jobTitle: string | null;
  jobCity: string | null;
  messages: Message[];
}

// Polls rather than subscribing to Pusher (which the web app uses) — keeps
// the mobile client simpler for now at the cost of a few seconds' latency.
// Revisit with pusher-js if that lag turns out to matter in practice.
const POLL_INTERVAL_MS = 5000;

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [messages, setMessages] = useState<Message[]>([]);
  const [header, setHeader] = useState<{ recipientName: string; jobRequestId: string | null; jobTitle: string | null; jobCity: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<MessagesResponse>(`/api/conversations/${id}/messages`);
      setMessages(res.messages);
      setHeader({ recipientName: res.recipientName, jobRequestId: res.jobRequestId, jobTitle: res.jobTitle, jobCity: res.jobCity });
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
    const pendingAttachments = attachments;
    setAttachments([]);
    setSending(true);
    try {
      await api.request(`/api/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, attachments: pendingAttachments }),
      });
      await load();
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      setDraft(body); // restore the draft so the message isn't lost
      setAttachments(pendingAttachments);
    } finally {
      setSending(false);
    }
  }, [draft, attachments, id, load]);

  async function addAttachment() {
    if (attachments.length >= 5) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 5 - attachments.length });
    if (result.canceled) return;
    setUploading(true);
    try {
      const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setAttachments((prev) => [...prev, ...urls].slice(0, 5));
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((a) => a !== url));
  }

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
        {header && <Stack.Screen options={{ title: header.recipientName }} />}
        {header && (header.jobRequestId || header.jobTitle) && (
          <Card style={[styles.headerCard, { margin: spacing.four, marginBottom: 0 }]}>
            <View style={styles.headerRow}>
              <Text variant="bodyMedium" style={styles.flexShrink}>
                {header.recipientName}
              </Text>
              {header.jobRequestId && (
                <Pressable onPress={() => router.push(`/jobs/${header.jobRequestId}`)}>
                  <Text variant="smallMedium" color="brand">
                    View job
                  </Text>
                </Pressable>
              )}
            </View>
            {header.jobTitle && (
              <Text variant="small" color="muted" numberOfLines={1}>
                {header.jobTitle}
                {header.jobCity ? ` · ${header.jobCity}` : ''}
              </Text>
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
                  {item.attachments.length > 0 && (
                    <View style={styles.bubbleAttachments}>
                      {item.attachments.map((url: string) => (
                        <Image key={url} source={{ uri: url }} style={styles.bubbleAttachment} />
                      ))}
                    </View>
                  )}
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
        {attachments.length > 0 && (
          <View style={[styles.pendingRow, { borderTopColor: colors.border }]}>
            {attachments.map((url) => (
              <View key={url} style={styles.pendingThumbWrap}>
                <Image source={{ uri: url }} style={styles.pendingThumb} />
                <Pressable style={styles.pendingRemove} onPress={() => removeAttachment(url)}>
                  <X size={10} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        <View style={[styles.inputRow, { borderTopColor: colors.border, paddingBottom: 16 + bottomInset }]}>
          <Pressable onPress={addAttachment} disabled={uploading} style={styles.attachButton} hitSlop={8}>
            {uploading ? <ActivityIndicator size="small" color={colors.mutedForeground} /> : <Paperclip size={20} color={colors.mutedForeground} />}
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
  headerCard: { gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flexShrink: { flexShrink: 1 },
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
  bubbleAttachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  bubbleAttachment: { width: 96, height: 96, borderRadius: 8 },
  pendingRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  pendingThumbWrap: { position: 'relative' },
  pendingThumb: { width: 48, height: 48, borderRadius: 8 },
  pendingRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachButton: { paddingBottom: 10 },
  input: {
    flex: 1,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});

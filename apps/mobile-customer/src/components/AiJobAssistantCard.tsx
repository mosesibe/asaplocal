import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, ArrowUp } from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

interface SuggestResponse {
  categoryId: string;
  categorySlug: string | null;
  categoryName: string;
  title: string;
  description: string;
  confidence: number;
}

// Matches apps/web/components/ai-job-request.tsx's "describe" step: a
// textarea-in-a-well with a circular submit button, backed by the open
// (no-auth-required, IP-rate-limited) POST /api/jobs/suggest endpoint. On
// success, hands off to the manual job form (already built) pre-filled with
// the AI's category/title/description guess — same two-step shape as web.
export function AiJobAssistantCard({ prefillText }: { prefillText?: string }) {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const [description, setDescription] = useState(prefillText ?? '');
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    if (description.trim().length < 10) {
      setError('Tell us a bit more so we can find the right pro.');
      return;
    }
    setError(null);
    setSuggesting(true);
    try {
      const suggestion = await api.request<SuggestResponse>('/api/jobs/suggest', {
        method: 'POST',
        body: JSON.stringify({ description: description.trim() }),
      });
      router.push({
        pathname: '/jobs/new',
        params: {
          categoryId: suggestion.categoryId,
          title: suggestion.title,
          description: suggestion.description,
        },
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not process that — please try again.');
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <Card style={[styles.card, { borderRadius: radius.xl }]}>
      <View style={[styles.badgeRow, { paddingHorizontal: spacing.two }]}>
        <Sparkles size={16} color={colors.brand[600]} />
        <Text variant="smallMedium" color="brand">
          AI job assistant
        </Text>
      </View>

      <View style={[styles.inputWell, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.xl }]}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder='Describe the work you need done — e.g. "My kitchen tap has been leaking for two days and I need it fixed this week"'
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[styles.input, { color: colors.foreground }]}
        />
        <Pressable
          onPress={handleSuggest}
          disabled={suggesting || description.trim().length === 0}
          style={[
            styles.submitButton,
            { backgroundColor: colors.brand[600], opacity: suggesting || description.trim().length === 0 ? 0.5 : 1 },
          ]}
        >
          {suggesting ? <ActivityIndicator color="#fff" size="small" /> : <ArrowUp size={18} color="#fff" />}
        </Pressable>
      </View>

      {error && (
        <Text variant="small" style={[styles.error, { paddingHorizontal: spacing.two }]}>
          {error}
        </Text>
      )}

      <Text variant="caption" color="muted" style={[styles.helper, { paddingHorizontal: spacing.two }]}>
        Press the arrow to get matched with local pros.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 6, gap: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8 },
  inputWell: { borderWidth: StyleSheet.hairlineWidth },
  input: { minHeight: 84, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 48, fontSize: 16, textAlignVertical: 'top' },
  submitButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#dc2626', marginTop: 2 },
  helper: { marginTop: 2, marginBottom: 6 },
});

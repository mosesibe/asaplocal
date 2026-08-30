import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

// Prefill comes from three sources, all landing on this same confirm-step
// form (matching apps/web/components/ai-job-request.tsx's shared "confirm"
// step for its job-suggest/AI-Buddy-handoff/studio-prefill paths):
// AiJobAssistantCard (categoryId/title/description from /api/jobs/suggest),
// ai-buddy.tsx's "needs a pro" handoff, and studio.tsx's chosen concept
// (adds photos/designRenderUrl/designSessionId/budget).
export default function NewJobScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const prefill = useLocalSearchParams<{
    categoryId?: string;
    title?: string;
    description?: string;
    budgetMinPence?: string;
    budgetMaxPence?: string;
    photos?: string;
    designRenderUrl?: string;
    designSessionId?: string;
  }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(prefill.categoryId ?? null);
  const [title, setTitle] = useState(prefill.title ?? '');
  const [description, setDescription] = useState(prefill.description ?? '');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [budgetMin, setBudgetMin] = useState(prefill.budgetMinPence ? String(Number(prefill.budgetMinPence) / 100) : '');
  const [budgetMax, setBudgetMax] = useState(prefill.budgetMaxPence ? String(Number(prefill.budgetMaxPence) / 100) : '');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .request<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories.filter((c) => c.parentId !== null)))
      .catch(() => setError('Could not load categories.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!categoryId) return setError('Choose a category.');
    if (title.trim().length < 8) return setError('Title needs to be at least 8 characters.');
    if (description.trim().length < 20) return setError('Description needs to be at least 20 characters.');
    if (!city.trim()) return setError('Enter a city.');

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId,
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        locationSource: 'new',
      };
      if (postcode.trim()) body.postcode = postcode.trim();
      if (budgetMin.trim()) body.budgetMinPence = Math.round(Number(budgetMin) * 100);
      if (budgetMax.trim()) body.budgetMaxPence = Math.round(Number(budgetMax) * 100);
      if (prefill.photos) body.photos = JSON.parse(prefill.photos);
      if (prefill.designRenderUrl) body.designRenderUrl = prefill.designRenderUrl;
      if (prefill.designSessionId) body.designSessionId = prefill.designSessionId;

      const res = await api.request<{ id: string }>('/api/jobs', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/jobs/${res.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post this job.');
    } finally {
      setSubmitting(false);
    }
  }, [categoryId, title, description, city, postcode, budgetMin, budgetMax, prefill, router]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="bodyMedium">Category</Text>
        <View style={styles.chipRow}>
          {categories.map((c) => {
            const selected = categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[
                  styles.chip,
                  {
                    borderRadius: radius.full,
                    borderColor: selected ? colors.brand[600] : colors.border,
                    backgroundColor: selected ? colors.brand[600] : 'transparent',
                  },
                ]}
              >
                <Text variant="small" color={selected ? 'inverse' : 'muted'}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="bodyMedium" style={styles.label}>
          Title
        </Text>
        <TextField placeholder="e.g. Leaking kitchen tap needs urgent repair" value={title} onChangeText={setTitle} />

        <Text variant="bodyMedium" style={styles.label}>
          Description
        </Text>
        <TextField placeholder="Describe what you need done" multiline value={description} onChangeText={setDescription} />

        <Text variant="bodyMedium" style={styles.label}>
          Location
        </Text>
        <TextField placeholder="City" value={city} onChangeText={setCity} />
        <TextField style={styles.spacedInput} placeholder="Postcode (optional)" value={postcode} onChangeText={setPostcode} />

        <Text variant="bodyMedium" style={styles.label}>
          Budget (optional)
        </Text>
        <View style={styles.row}>
          <TextField style={styles.halfInput} placeholder="Min £" keyboardType="decimal-pad" value={budgetMin} onChangeText={setBudgetMin} />
          <TextField style={styles.halfInput} placeholder="Max £" keyboardType="decimal-pad" value={budgetMax} onChangeText={setBudgetMax} />
        </View>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <Button onPress={handleSubmit} loading={submitting} style={styles.submitButton}>
          Post job
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  label: { marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spacedInput: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  submitButton: { marginTop: 24 },
  error: { color: '#dc2626', marginTop: 8 },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';
import { LocationPicker, type LocationValue } from '@/components/LocationPicker';
import { PreferredDatePicker, toPreferredDateTime, type PreferredDateValue } from '@/components/PreferredDatePicker';

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
    businessId?: string;
    businessName?: string;
  }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(prefill.categoryId ?? null);
  const [title, setTitle] = useState(prefill.title ?? '');
  const [description, setDescription] = useState(prefill.description ?? '');
  const [location, setLocation] = useState<LocationValue>({ addressLine: '', city: '' });
  const [preferredDate, setPreferredDate] = useState<PreferredDateValue | null>(null);
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
    if (!location.city.trim()) return setError('Enter a location.');

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId,
        title: title.trim(),
        description: description.trim(),
        city: location.city.trim(),
        locationSource: 'new',
      };
      if (location.addressLine.trim()) body.addressLine = location.addressLine.trim();
      if (location.postcode?.trim()) body.postcode = location.postcode.trim();
      if (location.lat != null) body.lat = location.lat;
      if (location.lng != null) body.lng = location.lng;
      body.preferredDate = preferredDate ? toPreferredDateTime(preferredDate) : undefined;
      body.flexibleDate = preferredDate ? preferredDate.time === null : true;
      if (budgetMin.trim()) body.budgetMinPence = Math.round(Number(budgetMin) * 100);
      if (budgetMax.trim()) body.budgetMaxPence = Math.round(Number(budgetMax) * 100);
      if (prefill.photos) body.photos = JSON.parse(prefill.photos);
      if (prefill.designRenderUrl) body.designRenderUrl = prefill.designRenderUrl;
      if (prefill.designSessionId) body.designSessionId = prefill.designSessionId;
      if (prefill.businessId) body.targetBusinessId = prefill.businessId;

      const res = await api.request<{ id: string }>('/api/jobs', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/jobs/${res.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post this job.');
    } finally {
      setSubmitting(false);
    }
  }, [categoryId, title, description, location, preferredDate, budgetMin, budgetMax, prefill, router]);

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
        {prefill.businessName ? (
          <>
            <Text variant="title" style={styles.heading}>
              Request a quote from {prefill.businessName}
            </Text>
            <Text variant="small" color="muted">
              Tell them what you need and they'll be notified immediately.
            </Text>
          </>
        ) : null}

        <Text variant="bodyMedium" style={styles.label}>
          Category
        </Text>
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
          Budget (optional)
        </Text>
        <View style={styles.row}>
          <TextField style={styles.halfInput} placeholder="Min £" keyboardType="decimal-pad" value={budgetMin} onChangeText={setBudgetMin} />
          <TextField style={styles.halfInput} placeholder="Max £" keyboardType="decimal-pad" value={budgetMax} onChangeText={setBudgetMax} />
        </View>

        <Text variant="bodyMedium" style={styles.label}>
          Preferred date & arrival time (optional)
        </Text>
        <PreferredDatePicker value={preferredDate} onChange={setPreferredDate} />

        <Text variant="bodyMedium" style={styles.label}>
          Service location
        </Text>
        <LocationPicker value={location} onChange={setLocation} />

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <Button onPress={handleSubmit} loading={submitting} style={styles.submitButton}>
          {prefill.businessId ? 'Send request' : 'Post job & get quotes'}
        </Button>
        <Text variant="caption" color="muted" style={styles.footerNote}>
          Posting is free. Providers pay to access your request — you'll never be charged for quotes.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  heading: { fontSize: 20, lineHeight: 26, marginBottom: 4 },
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
  footerNote: { textAlign: 'center', marginTop: 10 },
  error: { color: '#dc2626', marginTop: 8 },
});

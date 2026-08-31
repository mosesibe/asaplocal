import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
interface JobDetail {
  job: {
    id: string;
    title: string;
    description: string;
    categoryId: string;
    categoryName: string;
    addressLine: string | null;
    city: string;
    postcode: string | null;
    status: string;
    budgetMinPence: number | null;
    budgetMaxPence: number | null;
    preferredDate: string | null;
    flexibleDate: boolean;
  };
}

// Ports apps/web/app/jobs/[id]/edit/page.tsx. PATCH /api/jobs/[id] was
// already bearer-ready (mobile had only ever used GET on this route before).
export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationValue>({ addressLine: '', city: '' });
  const [preferredDate, setPreferredDate] = useState<PreferredDateValue | null>(null);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.request<{ categories: Category[] }>('/api/categories'),
      api.request<JobDetail>(`/api/jobs/${id}`),
    ])
      .then(([catRes, jobRes]) => {
        setCategories(catRes.categories.filter((c) => c.parentId !== null));
        const { job } = jobRes;
        setCategoryId(job.categoryId);
        setTitle(job.title);
        setDescription(job.description);
        setLocation({ addressLine: job.addressLine ?? '', city: job.city, postcode: job.postcode ?? undefined });
        if (job.preferredDate) {
          const d = new Date(job.preferredDate);
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const time = job.flexibleDate ? null : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
          setPreferredDate({ date: iso, time });
        }
        if (job.budgetMinPence) setBudgetMin(String(job.budgetMinPence / 100));
        if (job.budgetMaxPence) setBudgetMax(String(job.budgetMaxPence / 100));
      })
      .catch(() => setError('Could not load this job.'))
      .finally(() => setLoading(false));
  }, [id]);

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
      };
      if (location.addressLine.trim()) body.addressLine = location.addressLine.trim();
      if (location.postcode?.trim()) body.postcode = location.postcode.trim();
      if (location.lat != null) body.lat = location.lat;
      if (location.lng != null) body.lng = location.lng;
      body.preferredDate = preferredDate ? toPreferredDateTime(preferredDate) : undefined;
      body.flexibleDate = preferredDate ? preferredDate.time === null : true;
      body.budgetMinPence = budgetMin.trim() ? Math.round(Number(budgetMin) * 100) : undefined;
      body.budgetMaxPence = budgetMax.trim() ? Math.round(Number(budgetMax) * 100) : undefined;

      await api.request(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      router.replace(`/jobs/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'This job can no longer be edited.');
    } finally {
      setSubmitting(false);
    }
  }, [categoryId, title, description, location, preferredDate, budgetMin, budgetMax, id, router]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <Text variant="small" color="muted">
          You can edit this job until a provider is booked.
        </Text>

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
        <TextField value={title} onChangeText={setTitle} />

        <Text variant="bodyMedium" style={styles.label}>
          Description
        </Text>
        <TextField multiline value={description} onChangeText={setDescription} />

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
          Save changes
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
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 8 },
  halfInput: { flex: 1 },
  submitButton: { marginTop: 24 },
  error: { color: '#dc2626', marginTop: 8 },
});

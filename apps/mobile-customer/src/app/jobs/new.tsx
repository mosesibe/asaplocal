import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export default function NewJobScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
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

      const res = await api.request<{ id: string }>('/api/jobs', { method: 'POST', body: JSON.stringify(body) });
      router.replace(`/jobs/${res.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post this job.');
    } finally {
      setSubmitting(false);
    }
  }, [categoryId, title, description, city, postcode, budgetMin, budgetMax, router]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="smallBold">Category</ThemedText>
        <View style={styles.chipRow}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, categoryId === c.id && styles.chipSelected]}>
              <ThemedText type="small" themeColor={categoryId === c.id ? undefined : 'textSecondary'}>
                {c.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="smallBold" style={styles.label}>
          Title
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="e.g. Leaking kitchen tap needs urgent repair"
          value={title}
          onChangeText={setTitle}
        />

        <ThemedText type="smallBold" style={styles.label}>
          Description
        </ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what you need done"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <ThemedText type="smallBold" style={styles.label}>
          Location
        </ThemedText>
        <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
        <TextInput style={[styles.input, styles.spacedInput]} placeholder="Postcode (optional)" value={postcode} onChangeText={setPostcode} />

        <ThemedText type="smallBold" style={styles.label}>
          Budget (optional)
        </ThemedText>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Min £"
            keyboardType="decimal-pad"
            value={budgetMin}
            onChangeText={setBudgetMin}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Max £"
            keyboardType="decimal-pad"
            value={budgetMax}
            onChangeText={setBudgetMax}
          />
        </View>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Post job</ThemedText>}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.two },
  label: { marginTop: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
  },
  chipSelected: { backgroundColor: '#002059', borderColor: '#002059' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  spacedInput: { marginTop: Spacing.two },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: Spacing.two },
  halfInput: { flex: 1 },
  button: {
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  error: { color: '#dc2626', marginTop: Spacing.two },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, X } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
//
// Layout/copy ports apps/web/app/jobs/new/{page,job-request-form}.tsx 1:1
// (heading, field labels/placeholders, one enclosing card, category select).
export default function NewJobScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
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
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
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
      .then((res) => setCategories(res.categories))
      .catch(() => setError('Could not load categories.'))
      .finally(() => setLoading(false));
  }, []);

  const parentCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      map.set(c.parentId, [...(map.get(c.parentId) ?? []), c]);
    }
    return map;
  }, [categories]);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedCategoryLabel = selectedCategory
    ? selectedCategory.parentId
      ? selectedCategory.name
      : `${selectedCategory.name} (general)`
    : null;

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!categoryId) return setError('Choose a category.');
    if (title.trim().length < 8) return setError('Title needs to be at least 8 characters.');
    if (description.trim().length < 20) return setError('Description needs to be at least 20 characters.');
    if (!location.city.trim()) return setError('Please choose a service location.');

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        categoryId,
        title: title.trim(),
        description: description.trim(),
        city: location.city.trim(),
        locationSource: location.source ?? 'new',
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
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <Text variant="title" style={styles.heading}>
          {prefill.businessName ? `Request a quote from ${prefill.businessName}` : "Post a job — no provider to choose, we'll bring them to you"}
        </Text>
        <Text variant="small" color="muted" style={styles.subheading}>
          {prefill.businessName
            ? "Tell them what you need and they'll be notified immediately."
            : "Describe what you need done. Vetted local providers in your area will see your request and send you quotes — you pick who to book."}
        </Text>

        <Card style={styles.formCard}>
          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Category
            </Text>
            <Pressable
              onPress={() => setCategoryPickerOpen(true)}
              style={[styles.selectField, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg }]}
            >
              <Text variant="body" color={selectedCategoryLabel ? 'foreground' : 'muted'} style={styles.flex1}>
                {selectedCategoryLabel ?? 'Select a category'}
              </Text>
              <ChevronDown size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Job title
            </Text>
            <TextField placeholder="e.g. Fix leaking kitchen tap" value={title} onChangeText={setTitle} />
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Description
            </Text>
            <TextField
              placeholder="What needs doing? Include any relevant details (access, materials, timing)."
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Budget min (£)
            </Text>
            <TextField keyboardType="decimal-pad" value={budgetMin} onChangeText={setBudgetMin} />
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Budget max (£)
            </Text>
            <TextField keyboardType="decimal-pad" value={budgetMax} onChangeText={setBudgetMax} />
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Preferred date & arrival time (optional)
            </Text>
            <PreferredDatePicker value={preferredDate} onChange={setPreferredDate} />
          </View>

          <View>
            <Text variant="bodyMedium" style={styles.label}>
              Service location
            </Text>
            <LocationPicker value={location} onChange={setLocation} />
          </View>

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
        </Card>
      </ScrollView>

      <Modal visible={categoryPickerOpen} transparent animationType="slide" onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text variant="subtitle">Select a category</Text>
              <Pressable onPress={() => setCategoryPickerOpen(false)} hitSlop={8}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {parentCategories.map((p) => (
                <View key={p.id} style={styles.categoryGroup}>
                  <Text variant="caption" color="muted" style={styles.categoryGroupLabel}>
                    {p.name.toUpperCase()}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setCategoryId(p.id);
                      setCategoryPickerOpen(false);
                    }}
                    style={[styles.categoryRow, { borderColor: colors.border }]}
                  >
                    <Text variant="small">{p.name} (general)</Text>
                  </Pressable>
                  {(childrenByParent.get(p.id) ?? []).map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setCategoryId(c.id);
                        setCategoryPickerOpen(false);
                      }}
                      style={[styles.categoryRow, { borderColor: colors.border }]}
                    >
                      <Text variant="small">{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 4 },
  heading: { fontSize: 22, lineHeight: 28 },
  subheading: { marginTop: 6 },
  formCard: { marginTop: 20, gap: 16 },
  label: { marginBottom: 6 },
  selectField: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  flex1: { flex: 1 },
  submitButton: { marginTop: 8 },
  footerNote: { textAlign: 'center' },
  error: { color: '#dc2626' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '75%', paddingTop: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  modalList: { paddingHorizontal: 20 },
  modalListContent: { paddingBottom: 24 },
  categoryGroup: { marginTop: 12 },
  categoryGroupLabel: { marginBottom: 4, letterSpacing: 0.5 },
  categoryRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Pause, Play, Plus, Sparkles, Trash2, X } from 'lucide-react-native';
import { Screen, Card, Text, Button, Badge, TextField, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface ServiceRow {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  durationMins: number | null;
  aiSuggestedDurationMins: number | null;
  priceType: string;
  priceMinPence: number | null;
  priceMaxPence: number | null;
}

const PRICE_TYPES: { value: string; label: string }[] = [
  { value: 'QUOTE_ONLY', label: 'Quote on request' },
  { value: 'FIXED', label: 'Fixed price' },
  { value: 'HOURLY', label: 'Hourly rate' },
];

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function formatPrice(s: ServiceRow): string {
  if (s.priceType === 'QUOTE_ONLY') return 'Quote on request';
  const min = s.priceMinPence != null ? `£${(s.priceMinPence / 100).toFixed(0)}` : '—';
  const max = s.priceMaxPence != null ? ` – £${(s.priceMaxPence / 100).toFixed(0)}` : '';
  return `${min}${max}${s.priceType === 'HOURLY' ? ' / hr' : ''}`;
}

// Ports apps/provider/app/services/{page,services-manager}.tsx. The
// "Add more services" flow reuses onboarding.tsx's parent/child category
// checkbox-tree toggle logic, shown as a modal instead of an inline card.
export default function ServicesScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        api.request<{ services: ServiceRow[] }>('/api/services'),
        api.request<{ categories: Category[] }>('/api/categories'),
      ]);
      setServices(servicesRes.services);
      setCategories(categoriesRes.categories);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load your services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePause = useCallback(async (s: ServiceRow) => {
    setBusyId(s.id);
    setError(null);
    try {
      await api.request(`/api/services/${s.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: !x.isActive } : x)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }, []);

  const remove = useCallback(async (s: ServiceRow) => {
    setBusyId(s.id);
    setError(null);
    try {
      await api.request(`/api/services/${s.id}`, { method: 'DELETE' });
      setServices((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }, []);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={styles.centered}>
        <Text variant="small" style={styles.error}>
          {loadError}
        </Text>
      </Screen>
    );
  }

  const activeCount = services.filter((s) => s.isActive).length;
  const selectedCategoryIds = services.map((s) => s.categoryId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="small" color="muted">
          <Text variant="smallMedium">{activeCount}</Text> active
          {services.length - activeCount > 0 ? ` · ${services.length - activeCount} paused` : ''}
        </Text>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <Pressable onPress={() => setPicking(true)}>
          <Card style={[styles.addCard, { borderColor: colors.brand[300] }]}>
            <View style={[styles.addIcon, { backgroundColor: colors.brand[100], borderRadius: radius.full }]}>
              <Plus size={20} color={colors.brand[700]} />
            </View>
            <View style={styles.flex1}>
              <Text variant="smallMedium">Add more services</Text>
              <Text variant="caption" color="muted">
                Pick extra categories to appear for in the lead marketplace.
              </Text>
            </View>
          </Card>
        </Pressable>

        {services.length === 0 && (
          <Text variant="small" color="muted" style={styles.emptyText}>
            No services yet — add some above to start receiving leads.
          </Text>
        )}

        {services.map((s) => (
          <Card key={s.id} style={[styles.serviceCard, !s.isActive && styles.paused]}>
            <View style={styles.serviceHeader}>
              <View style={styles.flex1}>
                <Text variant="smallMedium">{s.title}</Text>
                <Text variant="caption" color="muted">
                  {s.categoryName}
                </Text>
              </View>
              <Badge variant={s.isActive ? 'success' : 'outline'}>{s.isActive ? 'Active' : 'Paused'}</Badge>
            </View>

            <View style={styles.detailRow}>
              <Text variant="caption" color="muted">
                Price
              </Text>
              <Text variant="caption">{formatPrice(s)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="caption" color="muted">
                Your duration
              </Text>
              <Text variant="caption">{s.durationMins ? formatDuration(s.durationMins) : 'Not set'}</Text>
            </View>
            {s.aiSuggestedDurationMins != null && (
              <View style={styles.detailRow}>
                <View style={styles.aiLabel}>
                  <Sparkles size={12} color={colors.brand[600]} />
                  <Text variant="caption" color="muted">
                    AI suggests
                  </Text>
                </View>
                <Text variant="caption" color="brand">
                  {formatDuration(s.aiSuggestedDurationMins)}
                </Text>
              </View>
            )}

            {editingId === s.id ? (
              <ServiceEditor
                service={s}
                onClose={() => setEditingId(null)}
                onSaved={(updated) => {
                  setServices((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...updated } : x)));
                  setEditingId(null);
                }}
              />
            ) : (
              <View style={styles.actionRow}>
                <Button size="sm" variant={s.isActive ? 'outline' : 'default'} onPress={() => togglePause(s)} loading={busyId === s.id}>
                  {s.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button size="sm" variant="outline" onPress={() => setEditingId(s.id)}>
                  Edit
                </Button>
                <Pressable style={styles.removeButton} onPress={() => remove(s)} disabled={busyId === s.id}>
                  <Trash2 size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      <CategoryPickerModal
        visible={picking}
        categories={categories}
        alreadySelected={selectedCategoryIds}
        onClose={() => setPicking(false)}
        onDone={() => {
          setPicking(false);
          load();
        }}
      />
    </Screen>
  );
}

function ServiceEditor({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceRow;
  onClose: () => void;
  onSaved: (updated: Partial<ServiceRow>) => void;
}) {
  const { colors, radius } = useAppTheme();
  const [title, setTitle] = useState(service.title);
  const [priceType, setPriceType] = useState(service.priceType);
  const [priceMin, setPriceMin] = useState(service.priceMinPence != null ? String(service.priceMinPence / 100) : '');
  const [priceMax, setPriceMax] = useState(service.priceMaxPence != null ? String(service.priceMaxPence / 100) : '');
  const [durationMins, setDurationMins] = useState(service.durationMins != null ? String(service.durationMins) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const priceMinPence = priceMin ? Math.round(Number(priceMin) * 100) : null;
      const priceMaxPence = priceMax ? Math.round(Number(priceMax) * 100) : null;
      const durationMinsValue = durationMins ? Number(durationMins) : null;
      await api.request(`/api/services/${service.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title, priceType, priceMinPence, priceMaxPence, durationMins: durationMinsValue }),
      });
      onSaved({ title, priceType, priceMinPence, priceMaxPence, durationMins: durationMinsValue });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }, [service.id, title, priceType, priceMin, priceMax, durationMins, onSaved]);

  return (
    <View style={styles.editor}>
      <TextField value={title} onChangeText={setTitle} placeholder="Service name" />
      <View style={styles.chipRow}>
        {PRICE_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setPriceType(t.value)}
            style={[
              styles.chip,
              { borderColor: colors.border, borderRadius: radius.full },
              priceType === t.value && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] },
            ]}
          >
            <Text variant="caption" style={priceType === t.value ? styles.chipTextActive : undefined} color={priceType === t.value ? undefined : 'muted'}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {priceType !== 'QUOTE_ONLY' && (
        <View style={styles.priceRow}>
          <TextField style={styles.flex1} placeholder="From £" keyboardType="decimal-pad" value={priceMin} onChangeText={setPriceMin} />
          <TextField style={styles.flex1} placeholder="To £ (optional)" keyboardType="decimal-pad" value={priceMax} onChangeText={setPriceMax} />
        </View>
      )}
      <TextField placeholder="Typical duration (minutes)" keyboardType="number-pad" value={durationMins} onChangeText={setDurationMins} />
      {service.aiSuggestedDurationMins != null && (
        <Pressable onPress={() => setDurationMins(String(service.aiSuggestedDurationMins))}>
          <View style={styles.aiSuggestRow}>
            <Sparkles size={12} color={colors.brand[600]} />
            <Text variant="caption" color="brand">
              Use AI suggestion ({formatDuration(service.aiSuggestedDurationMins)})
            </Text>
          </View>
        </Pressable>
      )}
      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.editorButtons}>
        <Button size="sm" variant="outline" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
        <Button size="sm" onPress={save} loading={saving} style={styles.flex1}>
          Save
        </Button>
      </View>
    </View>
  );
}

function CategoryPickerModal({
  visible,
  categories,
  alreadySelected,
  onClose,
  onDone,
}: {
  visible: boolean;
  categories: Category[];
  alreadySelected: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { colors, radius } = useAppTheme();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSlugs([]);
      setError(null);
    }
  }, [visible]);

  const taken = new Set(alreadySelected);
  const parents = categories.filter((c) => !c.parentId);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenByParent.set(c.parentId, [...(childrenByParent.get(c.parentId) ?? []), c]);
  }

  function toggle(slug: string) {
    setSlugs((prev) => {
      const selecting = !prev.includes(slug);
      const category = categories.find((c) => c.slug === slug);
      if (category && !category.parentId) {
        const childSlugs = (childrenByParent.get(category.id) ?? []).filter((c) => !taken.has(c.id)).map((c) => c.slug);
        const without = prev.filter((s) => s !== slug && !childSlugs.includes(s));
        return selecting ? [...without, slug, ...childSlugs] : without;
      }
      return selecting ? [...prev, slug] : prev.filter((s) => s !== slug);
    });
  }

  async function save() {
    if (slugs.length === 0) return onClose();
    setSaving(true);
    setError(null);
    try {
      await api.request('/api/services', { method: 'POST', body: JSON.stringify({ categorySlugs: slugs }) });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add those services.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHeader}>
            <Text variant="smallMedium">Add services</Text>
            <Pressable onPress={onClose}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView style={[styles.categoryBox, { borderColor: colors.border, borderRadius: radius.lg }]}>
            {parents.map((parent) => {
              const children = (childrenByParent.get(parent.id) ?? []).filter((c) => !taken.has(c.id));
              const parentTaken = taken.has(parent.id);
              if (parentTaken && children.length === 0) return null;
              return (
                <View key={parent.id} style={styles.categoryGroup}>
                  {!parentTaken ? (
                    <Pressable style={styles.checkboxRow} onPress={() => toggle(parent.slug)}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border, backgroundColor: slugs.includes(parent.slug) ? colors.brand[600] : 'transparent' },
                        ]}
                      />
                      <Text variant="smallMedium">{parent.name}</Text>
                    </Pressable>
                  ) : (
                    <Text variant="smallMedium" color="muted">
                      {parent.name} (added)
                    </Text>
                  )}
                  {children.map((child) => (
                    <Pressable key={child.id} style={[styles.checkboxRow, styles.childRow]} onPress={() => toggle(child.slug)}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: colors.border, backgroundColor: slugs.includes(child.slug) ? colors.brand[600] : 'transparent' },
                        ]}
                      />
                      <Text variant="small" color="muted">
                        {child.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </ScrollView>
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <View style={styles.editorButtons}>
            <Button variant="outline" onPress={onClose} style={styles.flex1}>
              Cancel
            </Button>
            <Button onPress={save} loading={saving} disabled={slugs.length === 0} style={styles.flex1}>
              {`Add ${slugs.length || ''}`.trim()}
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  error: { color: '#dc2626' },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed' },
  addIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { paddingVertical: 8 },
  serviceCard: { gap: 6 },
  paused: { opacity: 0.7 },
  serviceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  removeButton: { padding: 8 },
  editor: { gap: 8, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth },
  chipTextActive: { color: '#fff' },
  priceRow: { flexDirection: 'row', gap: 8 },
  aiSuggestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editorButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flex1: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBox: { borderWidth: StyleSheet.hairlineWidth, padding: 10, maxHeight: 320 },
  categoryGroup: { gap: 2, marginBottom: 6 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  childRow: { marginLeft: 20 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
});

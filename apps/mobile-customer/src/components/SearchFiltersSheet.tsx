import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

export interface SearchFilterValues {
  category?: string;
  city?: string;
  minRating?: string;
  minPrice?: string;
  maxPrice?: string;
  radius: string;
}

const RATING_OPTIONS = ['3', '3.5', '4', '4.5'];
const RADIUS_OPTIONS = ['5', '10', '25', '50'];

// Ports apps/web/app/search/search-filters.tsx as a modal sheet — the web
// version's <input type="range"> distance slider becomes preset chips here
// (5/10/25/50mi) to avoid pulling in a native slider dependency for one
// control; everything else maps directly onto the same /api/search params.
export function SearchFiltersSheet({
  visible,
  onClose,
  categories,
  values,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  categories: { slug: string; name: string }[];
  values: SearchFilterValues;
  onApply: (v: SearchFilterValues) => void;
}) {
  const { colors, radius, spacing } = useAppTheme();
  const [draft, setDraft] = useState(values);

  function apply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface, padding: spacing.four }]}>
          <Text variant="subtitle" style={styles.title}>
            Filters
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text variant="smallMedium" style={styles.label}>
              Category
            </Text>
            <View style={styles.chipRow}>
              <FilterChip label="All categories" active={!draft.category} onPress={() => setDraft((d) => ({ ...d, category: undefined }))} />
              {categories.map((c) => (
                <FilterChip key={c.slug} label={c.name} active={draft.category === c.slug} onPress={() => setDraft((d) => ({ ...d, category: c.slug }))} />
              ))}
            </View>

            <Text variant="smallMedium" style={styles.label}>
              City
            </Text>
            <TextField placeholder="e.g. Manchester" value={draft.city ?? ''} onChangeText={(city) => setDraft((d) => ({ ...d, city }))} />

            <Text variant="smallMedium" style={styles.label}>
              Minimum rating
            </Text>
            <View style={styles.chipRow}>
              <FilterChip label="Any" active={!draft.minRating} onPress={() => setDraft((d) => ({ ...d, minRating: undefined }))} />
              {RATING_OPTIONS.map((r) => (
                <FilterChip key={r} label={`${r}+ stars`} active={draft.minRating === r} onPress={() => setDraft((d) => ({ ...d, minRating: r }))} />
              ))}
            </View>

            <Text variant="smallMedium" style={styles.label}>
              Price range (£/hr)
            </Text>
            <View style={styles.row}>
              <TextField
                style={styles.half}
                placeholder="Min"
                keyboardType="number-pad"
                value={draft.minPrice ?? ''}
                onChangeText={(minPrice) => setDraft((d) => ({ ...d, minPrice }))}
              />
              <TextField
                style={styles.half}
                placeholder="Max"
                keyboardType="number-pad"
                value={draft.maxPrice ?? ''}
                onChangeText={(maxPrice) => setDraft((d) => ({ ...d, maxPrice }))}
              />
            </View>

            <Text variant="smallMedium" style={styles.label}>
              Distance
            </Text>
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((r) => (
                <FilterChip key={r} label={`${r} miles`} active={draft.radius === r} onPress={() => setDraft((d) => ({ ...d, radius: r }))} />
              ))}
            </View>
          </ScrollView>

          <Button onPress={apply} style={styles.applyButton}>
            Apply filters
          </Button>
        </Card>
      </View>
    </Modal>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, radius } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderRadius: radius.full, borderColor: active ? colors.brand[600] : colors.border, backgroundColor: active ? colors.brand[600] : 'transparent' }]}
    >
      <Text variant="small" color={active ? 'inverse' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 0, maxHeight: '85%' },
  title: { marginBottom: 12 },
  label: { marginTop: 16, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  applyButton: { marginTop: 16 },
});

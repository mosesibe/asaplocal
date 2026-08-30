import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { CATEGORY_ACCENTS, CATEGORY_ICONS } from '@/constants/categories';

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// Matches apps/web/components/popular-categories.tsx: 2-column grid,
// gradient-tinted card, circular icon badge colored by icon name (not slug).
export function PopularCategories({ categories }: { categories: CategorySummary[] }) {
  const router = useRouter();
  const { colors, radius } = useAppTheme();

  return (
    <View style={styles.grid}>
      {categories.map((c) => {
        const Icon = c.icon ? CATEGORY_ICONS[c.icon] : undefined;
        const accent = (c.icon && CATEGORY_ACCENTS[c.icon]) || { bg: colors.muted, fg: colors.mutedForeground };
        return (
          <Pressable key={c.id} style={styles.item} onPress={() => router.push(`/search?category=${c.slug}`)}>
            <Card style={[styles.card, { borderRadius: radius.xl }]}>
              <View style={[styles.iconBadge, { backgroundColor: accent.bg }]}>
                {Icon ? <Icon size={22} strokeWidth={2} color={accent.fg} /> : null}
              </View>
              <Text variant="smallMedium" numberOfLines={1} style={styles.label}>
                {c.name}
              </Text>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  item: { width: '50%', padding: 6 },
  card: { alignItems: 'center', padding: 16, gap: 0 },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  label: { textAlign: 'center' },
});

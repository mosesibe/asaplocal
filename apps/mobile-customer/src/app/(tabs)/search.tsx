import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BadgeCheck, Star } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface Business {
  slug: string;
  name: string;
  logoUrl: string | null;
  city: string;
  avgRating: number;
  reviewCount: number;
  completedJobsCount: number;
  isFeatured: boolean;
  verificationStatus: string;
  categoryName?: string;
  fromPricePence?: number | null;
}

function formatPence(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString('en-GB')}`;
}

// Matches apps/web/app/search/page.tsx: category filter + provider grid.
// Also serves as the destination for "Browse providers directly" and every
// category tap on the Home screen (?category=<slug>).
export default function SearchScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const router = useRouter();
  const bottomInset = useBottomNavInset();
  const params = useLocalSearchParams<{ category?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(params.category);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .request<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories.filter((c) => c.parentId === null)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setActiveCategory(params.category);
  }, [params.category]);

  const load = useCallback(async () => {
    try {
      const qs = activeCategory ? `?category=${activeCategory}` : '';
      const res = await api.request<{ businesses: Business[] }>(`/api/search${qs}`);
      setBusinesses(res.businesses);
    } catch {
      // best-effort
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text variant="title" style={[styles.heading, { paddingHorizontal: spacing.four, fontSize: 28, lineHeight: 34 }]}>
          Services
        </Text>

        <FlatList
          horizontal
          style={styles.chipList}
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.four, paddingBottom: 12 }}
          renderItem={({ item }) => {
            const selected = activeCategory === item.slug;
            return (
              <Pressable
                onPress={() => setActiveCategory(selected ? undefined : item.slug)}
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
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />

        <FlatList
          style={styles.list}
          data={businesses}
          keyExtractor={(b) => b.slug}
          contentContainerStyle={{ paddingHorizontal: spacing.four, paddingBottom: bottomInset, gap: 12 }}
          ListEmptyComponent={
            !loading ? (
              <Text variant="small" color="muted" style={styles.empty}>
                No providers match yet — try a different category.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/providers/${item.slug}`)}>
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.logo, { backgroundColor: colors.muted }]}>
                  {item.logoUrl && <Image source={{ uri: item.logoUrl }} style={styles.logoImg} />}
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
                      {item.name}
                    </Text>
                    {item.verificationStatus === 'VERIFIED' && <BadgeCheck size={16} color={colors.brand[600]} />}
                  </View>
                  <Text variant="small" color="muted">
                    {item.categoryName ?? ''} · {item.city}
                  </Text>
                </View>
                {item.isFeatured && <Badge variant="warning">Featured</Badge>}
              </View>
              <View style={styles.ratingRow}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text variant="small">{item.avgRating.toFixed(1)}</Text>
                <Text variant="small" color="muted">
                  ({item.reviewCount})
                </Text>
              </View>
              <View style={styles.footerRow}>
                <Text variant="small" color="muted">
                  {item.completedJobsCount} jobs completed
                </Text>
                {item.fromPricePence != null && <Text variant="smallMedium">from {formatPence(item.fromPricePence)}</Text>}
              </View>
            </Card>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  heading: { paddingTop: 12, paddingBottom: 8 },
  list: { flex: 1 },
  chipList: { flexGrow: 0 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  cardInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 64 },
});

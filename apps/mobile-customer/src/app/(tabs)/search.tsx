import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { BadgeCheck, SlidersHorizontal, Star } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { SearchFiltersSheet, type SearchFilterValues } from '@/components/SearchFiltersSheet';

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

// Matches apps/web/app/search/page.tsx: a Filters sheet (category, city,
// rating, price, distance) rather than an always-visible category row —
// also the destination for "Browse providers directly" and every category
// tap on Home (?category=<slug>).
export default function SearchScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const router = useRouter();
  const bottomInset = useBottomNavInset();
  const params = useLocalSearchParams<{ category?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<SearchFilterValues>({ category: params.category, radius: '25' });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .request<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories.filter((c) => c.parentId === null)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setFilters((f) => ({ ...f, category: params.category }));
  }, [params.category]);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (filters.category) qs.set('category', filters.category);
      if (filters.city) qs.set('city', filters.city);
      if (filters.minRating) qs.set('minRating', filters.minRating);
      if (filters.minPrice) qs.set('minPrice', filters.minPrice);
      if (filters.maxPrice) qs.set('maxPrice', filters.maxPrice);
      if (coords) {
        qs.set('lat', String(coords.lat));
        qs.set('lng', String(coords.lng));
        qs.set('radius', filters.radius);
      }
      const res = await api.request<{ businesses: Business[] }>(`/api/search?${qs.toString()}`);
      setBusinesses(res.businesses);
    } catch {
      // best-effort
    }
  }, [filters, coords]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function useNearMe() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return;
    const position = await Location.getCurrentPositionAsync({});
    setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
  }

  const activeCount = [filters.category, filters.city, filters.minRating, filters.minPrice, filters.maxPrice, coords ? filters.radius : undefined].filter(
    Boolean
  ).length;
  const categoryName = filters.category ? categories.find((c) => c.slug === filters.category)?.name : undefined;
  const title = [categoryName ?? 'All providers', filters.city ? `in ${filters.city}` : coords ? `within ${filters.radius} miles` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <Screen>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Text variant="title" style={[styles.heading, { paddingHorizontal: spacing.four, fontSize: 22, lineHeight: 28 }]}>
          {title}
        </Text>

        <View style={[styles.filterRow, { paddingHorizontal: spacing.four }]}>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={[styles.filterButton, { borderColor: colors.border, borderRadius: radius.full }]}
          >
            <SlidersHorizontal size={16} color={colors.foreground} />
            <Text variant="smallMedium">Filters</Text>
            {activeCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.brand[600] }]}>
                <Text variant="caption" style={styles.filterBadgeText}>
                  {activeCount}
                </Text>
              </View>
            )}
          </Pressable>
          {!coords && (
            <Pressable onPress={useNearMe}>
              <Text variant="small" color="brand">
                Near me
              </Text>
            </Pressable>
          )}
        </View>

        <Text variant="small" color="muted" style={[styles.resultCount, { paddingHorizontal: spacing.four }]}>
          {loading ? ' ' : `${businesses.length} provider${businesses.length === 1 ? '' : 's'} found`}
        </Text>

        <FlatList
          style={styles.list}
          data={businesses}
          keyExtractor={(b) => b.slug}
          contentContainerStyle={{ paddingHorizontal: spacing.four, paddingBottom: bottomInset, gap: 12 }}
          ListEmptyComponent={
            !loading ? (
              <Text variant="small" color="muted" style={styles.empty}>
                No providers match your filters yet.
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

      <SearchFiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        values={filters}
        onApply={setFilters}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  heading: { paddingTop: 12, paddingBottom: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 },
  filterBadge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 11 },
  resultCount: { paddingBottom: 8 },
  list: { flex: 1 },
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

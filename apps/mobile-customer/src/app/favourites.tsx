import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { BadgeCheck, Star } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

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

// Ports apps/web/app/favourites/page.tsx.
export default function FavouritesScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ businesses: Business[] }>('/api/favourites');
      setBusinesses(res.businesses);
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Screen>
      <FlatList
        style={styles.flatList}
        data={businesses}
        keyExtractor={(b) => b.slug}
        contentContainerStyle={{ padding: spacing.four, gap: 12 }}
        ListEmptyComponent={
          !loading ? (
            <Text variant="small" color="muted" style={styles.empty}>
              You haven't saved any providers yet.
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
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

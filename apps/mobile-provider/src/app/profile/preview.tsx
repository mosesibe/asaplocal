import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { MapPin, Briefcase, Clock } from 'lucide-react-native';
import { Screen, Card, Text, Button, Badge, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

interface PreviewService {
  id: string;
  title: string;
  categoryName: string;
  priceType: string;
  priceMinPence: number | null;
  priceMaxPence: number | null;
}

interface PreviewResponse {
  name: string;
  slug: string;
  city: string;
  baseRadiusMiles: number;
  logoUrl: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  description: string;
  avgRating: number;
  reviewCount: number;
  completedJobsCount: number;
  avgResponseMins: number | null;
  responseRatePct: number;
  yearsInBusiness: number | null;
  badges: { key: string; label: string }[];
  services: PreviewService[];
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

function formatPrice(s: PreviewService): string {
  if (s.priceType === 'QUOTE_ONLY') return 'Quote on request';
  const min = formatPence(s.priceMinPence ?? 0);
  const max = s.priceMaxPence ? ` – ${formatPence(s.priceMaxPence)}` : '';
  return `${min}${max}${s.priceType === 'HOURLY' ? ' / hr' : ''}`;
}

// Ports apps/provider/app/profile/preview/page.tsx — a read-only
// approximation of the public listing, with a button to open the exact
// customer-facing page in an in-app browser.
export default function ProfilePreviewScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<PreviewResponse>('/api/business/preview');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your preview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen style={styles.centered}>
        <Text variant="small" style={styles.error}>
          {error ?? 'Preview unavailable.'}
        </Text>
      </Screen>
    );
  }

  const liveUrl = `${WEB_URL}/providers/${data.slug}?preview=1`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="small" color="muted">
          A rough approximation of your public profile — open the live version for the exact customer view.
        </Text>
        <Button variant="outline" onPress={() => WebBrowser.openBrowserAsync(liveUrl)} style={styles.liveButton}>
          Open live preview
        </Button>

        <Card style={styles.card}>
          {!!data.coverImageUrl && <Image source={{ uri: data.coverImageUrl }} style={[styles.cover, { borderRadius: radius.lg }]} />}
          <View style={styles.headerRow}>
            {!!data.logoUrl && <Image source={{ uri: data.logoUrl }} style={[styles.logo, { borderRadius: radius.lg }]} />}
            <View style={styles.flex1}>
              <View style={styles.nameRow}>
                <Text variant="subtitle">{data.name}</Text>
                {data.isFeatured && <Badge variant="warning">Featured</Badge>}
              </View>
              <View style={styles.metaRow}>
                <MapPin size={13} color={colors.mutedForeground} />
                <Text variant="caption" color="muted">
                  {data.city} · serves {data.baseRadiusMiles} mile radius
                </Text>
              </View>
              <Text variant="caption" color="muted">
                {data.avgRating.toFixed(1)} ★ ({data.reviewCount} reviews)
              </Text>
            </View>
          </View>

          {data.badges.length > 0 && (
            <View style={styles.badgeRow}>
              {data.badges.map((b) => (
                <Badge key={b.key} variant="success">
                  {b.label}
                </Badge>
              ))}
            </View>
          )}

          <View style={styles.statGrid}>
            <StatTile icon={Briefcase} value={String(data.completedJobsCount)} label="Jobs completed" />
            <StatTile icon={Clock} value={data.avgResponseMins != null ? `${data.avgResponseMins}m` : '—'} label="Avg. response" />
            <StatTile value={`${data.responseRatePct}%`} label="Response rate" />
            <StatTile value={data.yearsInBusiness != null ? String(data.yearsInBusiness) : '—'} label="Years trading" />
          </View>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            About
          </Text>
          <Text variant="small" color="muted">
            {data.description}
          </Text>

          <Text variant="smallMedium" style={styles.sectionLabel}>
            Services &amp; pricing
          </Text>
          {data.services.length === 0 ? (
            <Text variant="small" color="muted">
              No services listed yet.
            </Text>
          ) : (
            data.services.map((s) => (
              <View key={s.id} style={[styles.serviceRow, { borderColor: colors.border }]}>
                <View style={styles.serviceHeader}>
                  <Text variant="small" style={styles.flex1}>
                    {s.title}
                  </Text>
                  <Badge variant="outline">{s.categoryName}</Badge>
                </View>
                <Text variant="smallMedium">{formatPrice(s)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function StatTile({ icon: Icon, value, label }: { icon?: typeof Briefcase; value: string; label: string }) {
  const { colors, radius } = useAppTheme();
  return (
    <View style={[styles.statTile, { borderColor: colors.border, borderRadius: radius.md }]}>
      {Icon && <Icon size={15} color={colors.brand[600]} style={styles.statIcon} />}
      <Text variant="smallMedium">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  liveButton: { alignSelf: 'flex-start' },
  card: { gap: 8 },
  cover: { width: '100%', height: 140 },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  logo: { width: 56, height: 56 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statTile: { width: '47%', borderWidth: StyleSheet.hairlineWidth, padding: 10, alignItems: 'center', gap: 2 },
  statIcon: { marginBottom: 2 },
  sectionLabel: { marginTop: 12 },
  serviceRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10, marginTop: 6, gap: 4 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  flex1: { flex: 1 },
  error: { color: '#dc2626' },
});

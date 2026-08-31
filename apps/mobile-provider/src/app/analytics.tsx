import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Screen, Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface AnalyticsData {
  total: number;
  conversionRate: number;
  totalSpendPence: number;
  roi: number | null;
  byStatus: Record<string, number>;
  avgTimeToContactMins: number | null;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

const CHART_HEIGHT = 140;
const BAR_WIDTH = 32;
const BAR_GAP = 20;

// Ports apps/provider/app/analytics/page.tsx. The web page renders its funnel
// with recharts; there's no charting library on native, so this hand-rolls a
// simple SVG bar chart (one Rect per byStatus bucket) instead of adding one.
export default function AnalyticsScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<AnalyticsData>('/api/analytics');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.');
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
          {error ?? 'Could not load analytics.'}
        </Text>
      </Screen>
    );
  }

  const statuses = Object.entries(data.byStatus);
  const maxCount = Math.max(1, ...statuses.map(([, count]) => count));
  const chartWidth = statuses.length * (BAR_WIDTH + BAR_GAP);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four }}>
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <View style={styles.statGrid}>
          <StatCard label="Total leads acquired" value={String(data.total)} />
          <StatCard label="Conversion rate" value={`${Math.round(data.conversionRate * 100)}%`} />
          <StatCard label="Total spend" value={formatPence(data.totalSpendPence)} />
          <StatCard label="Est. ROI" value={data.roi !== null ? `${Math.round(data.roi * 100)}%` : '—'} />
        </View>

        <Text variant="subtitle" style={styles.sectionHeading}>
          Funnel
        </Text>
        <Card style={styles.chartCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={Math.max(chartWidth, 1)} height={CHART_HEIGHT + 24}>
              {statuses.map(([status, count], i) => {
                const barHeight = (count / maxCount) * CHART_HEIGHT;
                const x = i * (BAR_WIDTH + BAR_GAP) + BAR_GAP / 2;
                return (
                  <Rect
                    key={status}
                    x={x}
                    y={CHART_HEIGHT - barHeight}
                    width={BAR_WIDTH}
                    height={Math.max(barHeight, 2)}
                    rx={6}
                    fill={colors.brand[600]}
                  />
                );
              })}
            </Svg>
          </ScrollView>
          <View style={[styles.chartLabels, { width: chartWidth }]}>
            {statuses.map(([status, count]) => (
              <View key={status} style={styles.chartLabel}>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {status}
                </Text>
                <Text variant="caption">{count}</Text>
              </View>
            ))}
          </View>
        </Card>

        {data.avgTimeToContactMins !== null && (
          <Text variant="small" color="muted" style={styles.footnote}>
            Average time to first contact: {data.avgTimeToContactMins} minutes
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const { radius } = useAppTheme();
  return (
    <Card style={[styles.statCard, { borderRadius: radius.lg }]}>
      <Text variant="bodyMedium">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%', gap: 2 },
  sectionHeading: { marginTop: 24, marginBottom: 12 },
  chartCard: { alignItems: 'center' },
  chartLabels: { flexDirection: 'row', marginTop: 4 },
  chartLabel: { width: BAR_WIDTH + BAR_GAP, alignItems: 'center' },
  footnote: { marginTop: 16, textAlign: 'center' },
});

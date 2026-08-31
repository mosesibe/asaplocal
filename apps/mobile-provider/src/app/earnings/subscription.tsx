import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Badge, Button, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface SubscriptionData {
  plan: 'FREE' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  monthlyLeadAllowance: number;
  leadAllowanceUsed: number;
  hasStripeSubscription: boolean;
}

const PLANS = [
  { key: 'FREE', name: 'Free', price: '£0', features: ['Basic listing', 'Pay-per-lead only'] },
  { key: 'PRO', name: 'Pro', price: '£29/mo', features: ['15 leads/month included', 'Analytics dashboard', 'Better search ranking'] },
  {
    key: 'PREMIUM',
    name: 'Premium',
    price: '£79/mo',
    features: ['40 leads/month included', 'Featured placement', 'Priority leads', 'Advanced analytics'],
  },
  { key: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', features: ['Unlimited leads', 'Dedicated account manager', 'Custom integrations'] },
] as const;

const RANK: Record<string, number> = { FREE: 0, PRO: 1, PREMIUM: 2, ENTERPRISE: 3 };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Ports apps/provider/app/earnings/subscription/page.tsx + plan-actions.tsx.
export default function SubscriptionScreen() {
  const { colors, spacing, radius } = useAppTheme();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<SubscriptionData>('/api/earnings/subscription');
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load subscription.');
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const patchSubscription = useCallback(
    async (body: { action: 'change_plan'; plan: 'PRO' | 'PREMIUM' } | { action: 'cancel' } | { action: 'resume' }, key: string) => {
      setBusyKey(key);
      setError(null);
      try {
        await api.request('/api/billing/subscription', { method: 'PATCH', body: JSON.stringify(body) });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't update your plan.");
      } finally {
        setBusyKey(null);
      }
    },
    [load]
  );

  const startCheckout = useCallback(async (kind: 'SUBSCRIPTION_PRO' | 'SUBSCRIPTION_PREMIUM', key: string) => {
    setBusyKey(key);
    setError(null);
    try {
      const { url } = await api.request<{ url: string }>('/api/billing/checkout', { method: 'POST', body: JSON.stringify({ kind }) });
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
    } finally {
      setBusyKey(null);
    }
  }, []);

  const confirmAndRun = useCallback((message: string | undefined, run: () => void) => {
    if (!message) {
      run();
      return;
    }
    Alert.alert('Are you sure?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', style: 'destructive', onPress: run },
    ]);
  }, []);

  if (loading || !data) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  const { plan, monthlyLeadAllowance: allowance, leadAllowanceUsed: used } = data;
  // Mirrors web's PATCH .../billing/subscription gating: an existing Stripe
  // subscription is modified in place (proration); with none yet, a FREE
  // business goes through Checkout instead.
  const canPatchInPlace = data.hasStripeSubscription;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: spacing.four }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <Card style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <View>
              <Text variant="caption" color="muted">
                Current plan
              </Text>
              <Text variant="title" style={styles.planName}>
                {plan}
              </Text>
            </View>
            <View style={styles.currentHeaderRight}>
              <Badge variant={data.status === 'ACTIVE' ? 'success' : data.status ? 'warning' : 'outline'}>
                {data.status ?? 'No subscription'}
              </Badge>
              {data.currentPeriodEnd && (
                <Text variant="caption" color="muted" style={styles.periodEnd}>
                  {data.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(data.currentPeriodEnd)}
                </Text>
              )}
            </View>
          </View>

          {allowance > 0 && (
            <View style={styles.allowanceBlock}>
              <View style={styles.row}>
                <Text variant="small" color="muted">
                  Lead allowance
                </Text>
                <Text variant="small">
                  {Math.max(0, allowance - used)} of {allowance} left
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.brand[100] }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.brand[600], width: `${Math.min(100, (used / allowance) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {data.cancelAtPeriodEnd && (
            <View style={[styles.warningBanner, { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }]}>
              <Text variant="smallMedium">Your plan is set to end</Text>
              <Text variant="small" color="muted">
                You'll keep {plan} benefits until the date above, then drop to Free.
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => patchSubscription({ action: 'resume' }, 'resume')}
                loading={busyKey === 'resume'}
                style={styles.resumeButton}
              >
                Keep my plan
              </Button>
            </View>
          )}
        </Card>

        <Text variant="subtitle" style={styles.sectionHeading}>
          Plans
        </Text>
        {PLANS.map((p) => {
          const isCurrent = p.key === plan;
          const direction = RANK[p.key]! > RANK[plan]! ? 'up' : 'down';
          const busy = busyKey === p.key;

          return (
            <Card key={p.key} style={[styles.planCard, isCurrent && { borderColor: colors.brand[600] }]}>
              <View style={styles.planCardHeader}>
                <Text variant="bodyMedium">{p.name}</Text>
                {isCurrent && <Badge variant="secondary">Current</Badge>}
              </View>
              <Text variant="title" style={styles.planPrice}>
                {p.price}
              </Text>
              <View style={styles.featureList}>
                {p.features.map((f) => (
                  <Text key={f} variant="small" color="muted">
                    • {f}
                  </Text>
                ))}
              </View>

              <View style={styles.planAction}>
                {isCurrent ? (
                  <Button variant="outline" size="sm" disabled style={styles.fullWidthButton}>
                    Current plan
                  </Button>
                ) : p.key === 'ENTERPRISE' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => Linking.openURL('mailto:sales@asaplocal.pro')}
                    style={styles.fullWidthButton}
                  >
                    Contact sales
                  </Button>
                ) : p.key === 'FREE' ? (
                  canPatchInPlace ? (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={busy}
                      onPress={() =>
                        confirmAndRun(
                          'Your plan will stay active until the end of the current billing period, then drop to Free. Continue?',
                          () => patchSubscription({ action: 'cancel' }, p.key)
                        )
                      }
                      style={styles.fullWidthButton}
                    >
                      Downgrade to Free
                    </Button>
                  ) : (
                    <Text variant="small" color="muted" style={styles.centeredNote}>
                      Default plan
                    </Text>
                  )
                ) : canPatchInPlace ? (
                  <Button
                    variant={direction === 'up' ? 'default' : 'outline'}
                    size="sm"
                    loading={busy}
                    onPress={() =>
                      confirmAndRun(
                        direction === 'up'
                          ? undefined
                          : `Switching to ${p.name} reduces your monthly lead allowance. The difference is credited to your account. Continue?`,
                        () => patchSubscription({ action: 'change_plan', plan: p.key as 'PRO' | 'PREMIUM' }, p.key)
                      )
                    }
                    style={styles.fullWidthButton}
                  >
                    {direction === 'up' ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={busy}
                    onPress={() => startCheckout(p.key === 'PRO' ? 'SUBSCRIPTION_PRO' : 'SUBSCRIPTION_PREMIUM', p.key)}
                    style={styles.fullWidthButton}
                  >
                    Upgrade
                  </Button>
                )}
              </View>
            </Card>
          );
        })}

        <Text variant="caption" color="muted" style={styles.footnote}>
          Plan changes take effect immediately and are prorated — you're only charged for what you use. Cancelling keeps your benefits
          until the end of the period you've already paid for.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', marginBottom: 8 },
  currentCard: { gap: 4 },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  currentHeaderRight: { alignItems: 'flex-end', gap: 4 },
  planName: { fontSize: 26, lineHeight: 32 },
  periodEnd: { marginTop: 2 },
  allowanceBlock: { marginTop: 12, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  warningBanner: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 4 },
  resumeButton: { marginTop: 6, maxWidth: 200 },
  sectionHeading: { marginTop: 24, marginBottom: 8 },
  planCard: { gap: 4, marginBottom: 12 },
  planCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planPrice: { fontSize: 22, lineHeight: 28 },
  featureList: { marginTop: 4, gap: 3 },
  planAction: { marginTop: 12 },
  fullWidthButton: { width: '100%' },
  centeredNote: { textAlign: 'center' },
  footnote: { marginTop: 16, lineHeight: 16 },
});

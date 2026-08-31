import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy } from 'lucide-react-native';
import { Screen, Card, Text, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface ReferralSummary {
  code: string;
  link: string;
  providerLink: string;
  rewardPence: number;
  creditBalancePence: number;
  referralCount: number;
  completedCount: number;
  pendingCount: number;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function CopyLinkCard({ title, hint, link }: { title: string; hint: string; link: string }) {
  const { colors, radius } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [link]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (
    <Card style={styles.linkCard}>
      <Text variant="smallMedium">{title}</Text>
      <Text variant="small" color="muted">
        {hint}
      </Text>
      <View style={[styles.linkRow, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.lg }]}>
        <Text variant="caption" color="muted" numberOfLines={1} style={styles.linkText}>
          {link}
        </Text>
      </View>
      <Button size="sm" variant="outline" onPress={copy} style={styles.copyButton}>
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </Card>
  );
}

// Ports apps/provider/app/referrals/page.tsx + copy-link.tsx. Fully covered
// server-side already — GET /api/account/referral returns getReferralSummary.
export default function ReferralsScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<ReferralSummary>('/api/account/referral');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load referrals.');
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
        <Text variant="small" style={styles.errorText}>
          {error ?? 'Could not load referrals.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.four }}>
        <Text variant="title">Referrals</Text>
        <Text variant="small" color="muted" style={styles.intro}>
          Invite another tradesperson to AsapLocal. When they make their first payment, you both get{' '}
          {formatPence(data.rewardPence)} in credit.
        </Text>

        {error && (
          <Text variant="small" style={styles.errorText}>
            {error}
          </Text>
        )}

        <View style={styles.statGrid}>
          <StatCard label="Credit earned" value={formatPence(data.creditBalancePence)} />
          <StatCard label="Signed up" value={String(data.referralCount)} />
          <StatCard label="Rewarded" value={String(data.completedCount)} />
          <StatCard label="Pending" value={String(data.pendingCount)} />
        </View>

        <CopyLinkCard
          title="Invite a tradesperson"
          hint="They'll land on business signup. Best for people you work alongside."
          link={data.providerLink}
        />
        <CopyLinkCard
          title="Invite a customer"
          hint="They'll land on the customer app to post their first job."
          link={data.link}
        />

        <Card style={styles.codeCard}>
          <Text variant="smallMedium">Your code</Text>
          <Text variant="bodyMedium" style={styles.code}>
            {data.code}
          </Text>
          <Text variant="small" color="muted">
            Rewards are credited automatically once the person you invited completes their first payment.
          </Text>
        </Card>
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
  errorText: { color: '#dc2626', marginTop: 8 },
  intro: { marginTop: 4 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  statCard: { width: '48%', gap: 2 },
  linkCard: { marginTop: 16, gap: 4, alignItems: 'flex-start' },
  linkRow: { width: '100%', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  linkText: { fontFamily: 'monospace' },
  copyButton: { marginTop: 8, alignSelf: 'flex-start' },
  codeCard: { marginTop: 16, gap: 4 },
  code: { letterSpacing: 1 },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Fingerprint, Building2, GraduationCap, ShieldCheck, Landmark, User, Images, ClipboardCheck, ChevronRight } from 'lucide-react-native';
import { Screen, Card, Text, Badge, useAppTheme, type BadgeVariant } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

interface Section {
  key: string;
  href: string;
  label: string;
  status: string | null;
}

interface VerificationSummary {
  trustTier: string;
  sections: Section[];
}

const ICONS: Record<string, typeof Fingerprint> = {
  identity: Fingerprint,
  business: Building2,
  qualifications: GraduationCap,
  insurance: ShieldCheck,
  banking: Landmark,
  profile: User,
  portfolio: Images,
  references: ClipboardCheck,
};

// Matches apps/provider/lib/verification-badge.tsx's VerificationStatusBadge
// status -> Badge-variant mapping (no shared package between web and native
// UI kits, so this is re-derived locally).
function statusBadge(status: string | null): { variant: BadgeVariant; label: string } {
  if (!status || status === 'UNVERIFIED') return { variant: 'outline', label: 'Not verified' };
  if (status === 'VERIFIED') return { variant: 'success', label: 'Verified' };
  if (status === 'REJECTED') return { variant: 'destructive', label: 'Rejected' };
  if (status === 'PENDING') return { variant: 'warning', label: 'Pending review' };
  if (status === 'MORE_INFO_REQUESTED') return { variant: 'warning', label: 'More info needed' };
  return { variant: 'outline', label: status };
}

// Ports apps/provider/app/verification/page.tsx as a pushed Stack screen —
// trust-tier banner plus the 8 section rows, each navigating to its own
// sub-screen (identity/banking built by another agent in parallel;
// profile/portfolio/references already exist or are being built elsewhere).
export default function VerificationCenterScreen() {
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const [data, setData] = useState<VerificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<VerificationSummary>('/api/verification');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on focus so a status change made on a sub-screen (e.g. just
  // uploaded a document) shows up immediately when navigating back.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
        <Text>{error ?? 'Verification status not found.'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Card style={styles.banner}>
          <Text variant="small" color="muted">
            Current trust tier
          </Text>
          <Text variant="title" style={styles.tierValue}>
            {data.trustTier}
          </Text>
          <Text variant="small" color="muted">
            Complete more sections below to unlock higher tiers.
          </Text>
        </Card>

        <View style={styles.list}>
          {data.sections.map((s) => {
            const Icon = ICONS[s.key] ?? ShieldCheck;
            const badge = statusBadge(s.status);
            return (
              <Pressable key={s.key} onPress={() => router.push(s.href as Href)}>
                <Card style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.brand[100], borderRadius: radius.full }]}>
                      <Icon size={18} color={colors.brand[600]} />
                    </View>
                    <Text variant="bodyMedium">{s.label}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <ChevronRight size={18} color={colors.mutedForeground} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  banner: { gap: 2 },
  tierValue: { marginVertical: 2 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});

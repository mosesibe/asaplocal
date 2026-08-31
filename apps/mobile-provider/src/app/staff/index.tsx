import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, Button, useAppTheme, type BadgeVariant } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

type ApprovalStatus = 'VERIFIED' | 'PENDING' | 'MORE_INFO_REQUESTED' | 'REJECTED' | 'UNVERIFIED';

interface StaffListItem {
  id: string;
  fullName: string;
  jobTitle: string | null;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  profilePhotoUrl: string;
}

interface StaffListResponse {
  canHaveStaff: boolean;
  staff: StaffListItem[];
}

const STATUS_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  MORE_INFO_REQUESTED: 'warning',
  REJECTED: 'destructive',
  UNVERIFIED: 'outline',
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// No shared Avatar component exists in @asaplocal/ui-native yet — a plain
// circular image-or-initials view, local to this screen only.
function StaffAvatar({ uri, name, size = 44 }: { uri: string; name: string; size?: number }) {
  const { colors } = useAppTheme();
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand[100] }]}>
      <Text variant="smallMedium" style={{ color: colors.brand[800] }}>
        {initials(name)}
      </Text>
    </View>
  );
}

// Ports apps/provider/app/staff/page.tsx via the new GET /api/staff route.
export default function StaffListScreen() {
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<StaffListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<StaffListResponse>('/api/staff');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh whenever this screen regains focus — e.g. coming back from
  // staff/new or staff/[staffId] after a change.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
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
        <Text>{error ?? 'Could not load staff.'}</Text>
      </Screen>
    );
  }

  if (!data.canHaveStaff) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
          <Card style={styles.card}>
            <Text variant="small" color="muted">
              Staff management is for limited companies and partnerships that send employees out to jobs. As a sole trader /
              self-employed provider, you complete jobs yourself, so there's no roster to manage here.
            </Text>
          </Card>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="small" color="muted">
          Staff you add here must be approved by our team before you can send them to a job. Once approved, you can assign them to
          a confirmed booking on your calendar — their details, including their company ID, are shown to the customer.
        </Text>

        <Button onPress={() => router.push('/staff/new')}>Add staff member</Button>

        {data.staff.length === 0 && (
          <Text variant="small" color="muted" style={styles.empty}>
            No staff added yet.
          </Text>
        )}

        {data.staff.map((s) => (
          <Pressable key={s.id} onPress={() => router.push(`/staff/${s.id}`)}>
            <Card style={styles.row}>
              <View style={styles.rowLeft}>
                <StaffAvatar uri={s.profilePhotoUrl} name={s.fullName} />
                <View>
                  <Text variant="bodyMedium">{s.fullName}</Text>
                  <Text variant="small" color="muted">
                    {s.jobTitle ?? '—'}
                    {!s.isActive && s.approvalStatus === 'VERIFIED' ? ' · Inactive' : ''}
                  </Text>
                </View>
              </View>
              <Badge variant={STATUS_VARIANT[s.approvalStatus]}>{s.approvalStatus.replace(/_/g, ' ')}</Badge>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 10 },
  card: { gap: 4 },
  empty: { textAlign: 'center', marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
});

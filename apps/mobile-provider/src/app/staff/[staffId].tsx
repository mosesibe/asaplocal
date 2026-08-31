import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, Text, Badge, Button, useAppTheme, type BadgeVariant } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { StaffForm, type StaffFormInitial } from '@/components/StaffForm';

type ApprovalStatus = 'VERIFIED' | 'PENDING' | 'MORE_INFO_REQUESTED' | 'REJECTED' | 'UNVERIFIED';

interface StaffDetail extends StaffFormInitial {
  id: string;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  reviewNote: string | null;
}

const STATUS_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  MORE_INFO_REQUESTED: 'warning',
  REJECTED: 'destructive',
  UNVERIFIED: 'outline',
};

// Ports apps/provider/app/staff/[staffId]/page.tsx via the new GET
// /api/staff/[staffId] route, plus the toggle-active-button.tsx logic inline.
export default function StaffDetailScreen() {
  const { staffId } = useLocalSearchParams<{ staffId: string }>();
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<StaffDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<StaffDetail>(`/api/staff/${staffId}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff member.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = useCallback(async () => {
    setSaved(true);
    await load();
  }, [load]);

  const handleToggleActive = useCallback(async () => {
    if (!data) return;
    setTogglingActive(true);
    setError(null);
    try {
      await api.request(`/api/staff/${staffId}/toggle-active`, {
        method: 'POST',
        body: JSON.stringify({ isActive: !data.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update status.');
    } finally {
      setTogglingActive(false);
    }
  }, [data, staffId, load]);

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
        <Text>{error ?? 'Staff member not found.'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <View style={styles.headerRow}>
          <Text variant="title" style={styles.heading}>
            {data.fullName}
          </Text>
          <Badge variant={STATUS_VARIANT[data.approvalStatus]}>{data.approvalStatus.replace(/_/g, ' ')}</Badge>
        </View>

        {data.reviewNote && (
          <Card style={styles.card}>
            <Text variant="smallMedium">Reviewer note</Text>
            <Text variant="small" color="muted">
              {data.reviewNote}
            </Text>
          </Card>
        )}

        {data.approvalStatus === 'VERIFIED' && (
          <Card style={[styles.card, styles.toggleRow]}>
            <View>
              <Text variant="smallMedium">{data.isActive ? 'Active' : 'Inactive'}</Text>
              <Text variant="small" color="muted">
                Inactive staff can't be assigned to bookings.
              </Text>
            </View>
            <Button size="sm" variant={data.isActive ? 'outline' : 'default'} onPress={handleToggleActive} loading={togglingActive}>
              {data.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Card>
        )}

        {saved && (
          <Text variant="small" style={styles.success}>
            Changes saved.
          </Text>
        )}
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <StaffForm
          staffId={data.id}
          initial={{
            fullName: data.fullName,
            jobTitle: data.jobTitle,
            phone: data.phone,
            email: data.email,
            profilePhotoUrl: data.profilePhotoUrl,
            idFrontImageUrl: data.idFrontImageUrl,
            idBackImageUrl: data.idBackImageUrl,
          }}
          onSaved={handleSaved}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { fontSize: 22, lineHeight: 28, flexShrink: 1 },
  card: { gap: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { color: '#dc2626' },
  success: { color: '#16a34a' },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Screen, Card, Text, Badge, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

const EDITABLE_STATUSES = ['OPEN', 'MATCHING', 'QUOTED'];

interface JobDetail {
  job: {
    id: string;
    title: string;
    description: string;
    categoryName: string;
    city: string;
    status: string;
    budgetMinPence: number | null;
    budgetMaxPence: number | null;
  };
  quotes: { id: string; businessName: string; amountPence: number; message: string | null; status: string }[];
  booking: { id: string; status: string } | null;
}

const STATUS_COPY: Record<string, string> = {
  OPEN: "We're matching your job with local providers…",
  MATCHING: 'Providers in your area have been notified.',
  QUOTED: "You've received quotes — compare and book below.",
  ASSIGNED: "You've booked a provider for this job.",
  IN_PROGRESS: 'Your job is in progress.',
  COMPLETED: 'This job is complete.',
  CANCELLED: 'This job was cancelled.',
  EXPIRED: 'This job request has expired.',
};

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<JobDetail>(`/api/jobs/${id}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load job.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAccept = useCallback(
    async (quoteId: string) => {
      setAcceptingId(quoteId);
      setError(null);
      try {
        // Matches web's AcceptQuoteButton: jump straight to the new booking
        // rather than staying on this screen — the customer just committed
        // to a provider, the next thing they need is the booking/deposit.
        const { bookingId } = await api.request<{ bookingId: string }>(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
        router.push(`/bookings/${bookingId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not accept this quote.');
      } finally {
        setAcceptingId(null);
      }
    },
    [router]
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.request(`/api/jobs/${id}`, { method: 'DELETE' });
      router.replace('/activity');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [id, router]);

  const handleOpenBooking = useCallback(
    (bookingId: string) => {
      // The booking's own status/actions (accept completion, dispute,
      // variations, review) are all native now — only the actual Stripe
      // payment step still hands off to the web checkout page (see
      // bookings/[id].tsx's openCheckout), since that stays web-only for now.
      router.push(`/bookings/${bookingId}`);
    },
    [router]
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
        <Text>{error ?? 'Job not found.'}</Text>
      </Screen>
    );
  }

  const { job, quotes, booking } = data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <View style={styles.statusRow}>
          <Badge variant="outline">{job.status.replace(/_/g, ' ')}</Badge>
          {EDITABLE_STATUSES.includes(job.status) && (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push(`/jobs/${id}/edit`)}>
                <Text variant="smallMedium" color="brand">
                  Edit
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowDeleteConfirm(true)} hitSlop={8}>
                <Trash2 size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
        </View>
        <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
          {job.title}
        </Text>
        <Text variant="small" color="muted">
          {STATUS_COPY[job.status] ?? ''}
        </Text>

        <Card style={styles.card}>
          <Text variant="small" color="muted">
            {job.categoryName} · {job.city}
          </Text>
          <Text style={styles.description}>{job.description}</Text>
          <Text variant="small" color="muted">
            Budget: {job.budgetMinPence ? formatPence(job.budgetMinPence) : '?'}–{job.budgetMaxPence ? formatPence(job.budgetMaxPence) : '?'}
          </Text>
        </Card>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        {booking && (
          <Pressable onPress={() => handleOpenBooking(booking.id)}>
            <Card style={styles.card}>
              <Text variant="bodyMedium">Booking: {booking.status.replace(/_/g, ' ')}</Text>
              <Text variant="link" color="brand">
                {booking.status === 'PENDING' ? 'Complete deposit payment →' : 'View booking on web →'}
              </Text>
            </Card>
          </Pressable>
        )}

        <Text variant="bodyMedium" style={styles.sectionHeading}>
          Quotes ({quotes.length})
        </Text>
        {quotes.length === 0 && (
          <Text variant="small" color="muted">
            No quotes yet — providers typically respond within a few hours.
          </Text>
        )}
        {quotes.map((q) => (
          <Card key={q.id} style={styles.card}>
            <View style={styles.quoteHeader}>
              <Text variant="bodyMedium" style={styles.quoteBusiness}>
                {q.businessName}
              </Text>
              <Text variant="bodyMedium">{formatPence(q.amountPence)}</Text>
            </View>
            {q.message && (
              <Text variant="small" color="muted">
                {q.message}
              </Text>
            )}
            {job.status !== 'ASSIGNED' && q.status === 'SENT' ? (
              <Button onPress={() => handleAccept(q.id)} loading={acceptingId === q.id} style={styles.acceptButton}>
                Accept quote
              </Button>
            ) : (
              <Text variant="small" color="muted">
                {q.status}
              </Text>
            )}
          </Card>
        ))}
      </ScrollView>

      <Modal visible={showDeleteConfirm} animationType="fade" transparent onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.dialogOverlay}>
          <Card style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <Text variant="subtitle">Delete this job?</Text>
            <Text variant="small" color="muted" style={styles.dialogBody}>
              This withdraws your job request and declines any quotes you've received. This can't be undone.
            </Text>
            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <View style={styles.dialogActions}>
              <Button variant="outline" onPress={() => setShowDeleteConfirm(false)} style={styles.flex1}>
                Cancel
              </Button>
              <Button variant="destructive" onPress={handleDelete} loading={deleting} style={styles.flex1}>
                Delete job
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  dialog: { width: '100%', maxWidth: 400, gap: 0, padding: 20 },
  dialogBody: { marginTop: 8 },
  dialogActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  flex1: { flex: 1 },
  card: { gap: 4, marginVertical: 4 },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: 24 },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteBusiness: { flexShrink: 1 },
  acceptButton: { marginTop: 4 },
  error: { color: '#dc2626' },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Badge, Button, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

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

  const handleAccept = useCallback(
    async (quoteId: string) => {
      setAcceptingId(quoteId);
      setError(null);
      try {
        await api.request(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not accept this quote.');
      } finally {
        setAcceptingId(null);
      }
    },
    [load]
  );

  const handleOpenBooking = useCallback((bookingId: string) => {
    // Payment (Stripe Checkout) stays web-only for now — opens in an in-app
    // browser rather than the full react-native-stripe SDK. This browser
    // context doesn't share the app's session, so it may prompt to log in
    // again; a magic-link bridge would fix that but is out of scope here.
    WebBrowser.openBrowserAsync(`${API_URL}/bookings/${bookingId}/checkout`);
  }, []);

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
        <Badge variant="outline">{job.status.replace(/_/g, ' ')}</Badge>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  card: { gap: 4, marginVertical: 4 },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: 24 },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteBusiness: { flexShrink: 1 },
  acceptButton: { marginTop: 4 },
  error: { color: '#dc2626' },
});

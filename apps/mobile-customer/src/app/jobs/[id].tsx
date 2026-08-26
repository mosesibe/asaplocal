import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? 'Job not found.'}</ThemedText>
      </ThemedView>
    );
  }

  const { job, quotes, booking } = data;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="small" themeColor="textSecondary">
          {job.status.replace(/_/g, ' ')}
        </ThemedText>
        <ThemedText type="subtitle">{job.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {STATUS_COPY[job.status] ?? ''}
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            {job.categoryName} · {job.city}
          </ThemedText>
          <ThemedText style={styles.description}>{job.description}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Budget: {job.budgetMinPence ? formatPence(job.budgetMinPence) : '?'}–{job.budgetMaxPence ? formatPence(job.budgetMaxPence) : '?'}
          </ThemedText>
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        {booking && (
          <Pressable onPress={() => handleOpenBooking(booking.id)}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">Booking: {booking.status.replace(/_/g, ' ')}</ThemedText>
              <ThemedText type="linkPrimary">
                {booking.status === 'PENDING' ? 'Complete deposit payment →' : 'View booking on web →'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}

        <ThemedText type="smallBold" style={styles.sectionHeading}>
          Quotes ({quotes.length})
        </ThemedText>
        {quotes.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No quotes yet — providers typically respond within a few hours.
          </ThemedText>
        )}
        {quotes.map((q) => (
          <ThemedView key={q.id} type="backgroundElement" style={styles.card}>
            <View style={styles.quoteHeader}>
              <ThemedText type="smallBold" style={styles.quoteBusiness}>
                {q.businessName}
              </ThemedText>
              <ThemedText type="smallBold">{formatPence(q.amountPence)}</ThemedText>
            </View>
            {q.message && (
              <ThemedText type="small" themeColor="textSecondary">
                {q.message}
              </ThemedText>
            )}
            {job.status !== 'ASSIGNED' && q.status === 'SENT' ? (
              <Pressable style={styles.acceptButton} onPress={() => handleAccept(q.id)} disabled={acceptingId === q.id}>
                <ThemedText style={styles.acceptButtonText}>{acceptingId === q.id ? 'Accepting…' : 'Accept quote'}</ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {q.status}
              </ThemedText>
            )}
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.two },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: Spacing.four },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteBusiness: { flexShrink: 1 },
  acceptButton: {
    marginTop: Spacing.one,
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  acceptButtonText: { color: '#ffffff', fontWeight: '600' },
  error: { color: '#dc2626' },
});

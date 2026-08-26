import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { api } from '@/lib/api';

interface LeadDetail {
  lead: {
    id: string;
    jobRequestId: string;
    title: string;
    description: string;
    categoryName: string;
    city: string;
    addressLine: string | null;
    postcode: string | null;
    budgetMinPence: number | null;
    budgetMaxPence: number | null;
  };
  access: { id: string; status: string; refundRequestStatus: string | null };
  customer: { name: string; phone: string | null };
  dispatchNote: string | null;
  existingQuote: { amountPence: number; message: string | null; status: string } | null;
  ownBooking: { id: string; status: string } | null;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<LeadDetail>(`/api/leads/${id}`);
      setData(res);
      if (res.existingQuote) {
        setAmount(String(res.existingQuote.amountPence / 100));
        setMessage(res.existingQuote.message ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lead.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSendQuote = useCallback(async () => {
    if (!data) return;
    const amountPence = Math.round(Number(amount) * 100);
    if (!amountPence || amountPence <= 0) {
      setError('Enter a valid quote amount.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.request('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ jobRequestId: data.lead.jobRequestId, amountPence, message: message.trim() || undefined }),
      });
      setSent(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send quote.');
    } finally {
      setSubmitting(false);
    }
  }, [amount, message, data, load]);

  const handleMessageCustomer = useCallback(async () => {
    setMessaging(true);
    setError(null);
    try {
      const res = await api.request<{ conversationId: string }>(`/api/leads/${id}/start-conversation`, { method: 'POST' });
      router.push(`/conversations/${res.conversationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start a conversation.');
    } finally {
      setMessaging(false);
    }
  }, [id, router]);

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
        <ThemedText>{error ?? 'Lead not found.'}</ThemedText>
      </ThemedView>
    );
  }

  const { lead, access, customer, dispatchNote, existingQuote, ownBooking } = data;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="small" themeColor="textSecondary">
          {lead.categoryName} · {access.status}
        </ThemedText>
        <ThemedText type="subtitle">{lead.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {lead.city} · Budget {lead.budgetMinPence ? formatPence(lead.budgetMinPence) : '?'}–{lead.budgetMaxPence ? formatPence(lead.budgetMaxPence) : '?'}
        </ThemedText>

        {dispatchNote && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Note from dispatch
            </ThemedText>
            <ThemedText type="small">{dispatchNote}</ThemedText>
          </ThemedView>
        )}

        <View style={[styles.row, styles.customerRow]}>
          <ThemedText type="small">Customer: {customer.name}</ThemedText>
          <Pressable onPress={handleMessageCustomer} disabled={messaging}>
            <ThemedText type="linkPrimary">{messaging ? 'Opening…' : 'Message'}</ThemedText>
          </Pressable>
        </View>

        {access.status === 'WON' && (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Contact details
            </ThemedText>
            <ThemedText type="small">
              {lead.addressLine ? `${lead.addressLine}, ` : ''}
              {lead.city}
              {lead.postcode ? `, ${lead.postcode}` : ''}
            </ThemedText>
            <ThemedText type="small">{customer.phone ?? 'No phone number on file'}</ThemedText>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText style={styles.description}>{lead.description}</ThemedText>
        </ThemedView>

        {ownBooking && (
          <Pressable onPress={() => router.push(`/bookings/${ownBooking.id}`)}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="smallBold">You won this job</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Booking status: {ownBooking.status.replace(/_/g, ' ')}
              </ThemedText>
              <ThemedText type="linkPrimary">
                {ownBooking.status === 'IN_PROGRESS' ? 'Open job sheet →' : 'Open booking →'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}

        <ThemedText type="smallBold" style={styles.sectionHeading}>
          {existingQuote ? 'Your quote' : 'Send a quote'}
        </ThemedText>
        {sent && (
          <ThemedText type="small" style={styles.success}>
            Quote sent!
          </ThemedText>
        )}
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
        <TextInput
          style={styles.input}
          placeholder="Amount (£)"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Message to the customer (optional)"
          multiline
          numberOfLines={4}
          value={message}
          onChangeText={setMessage}
        />
        <Pressable style={styles.button} onPress={handleSendQuote} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>{existingQuote ? 'Update quote' : 'Send quote'}</ThemedText>
          )}
        </Pressable>

        {existingQuote && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.quoteStatus}>
            Status: {existingQuote.status}
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.two },
  row: { marginVertical: Spacing.one },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginVertical: Spacing.one,
  },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: Spacing.four },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  error: { color: '#dc2626' },
  success: { color: '#16a34a' },
  quoteStatus: { textAlign: 'center' },
});

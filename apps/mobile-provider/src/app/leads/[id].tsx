import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, Text, Badge, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

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
  const { colors, spacing } = useAppTheme();
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
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen style={styles.centered}>
        <Text>{error ?? 'Lead not found.'}</Text>
      </Screen>
    );
  }

  const { lead, access, customer, dispatchNote, existingQuote, ownBooking } = data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <View style={styles.metaRow}>
          <Badge variant="outline">{lead.categoryName}</Badge>
          <Badge>{access.status}</Badge>
        </View>
        <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
          {lead.title}
        </Text>
        <Text variant="small" color="muted">
          {lead.city} · Budget {lead.budgetMinPence ? formatPence(lead.budgetMinPence) : '?'}–{lead.budgetMaxPence ? formatPence(lead.budgetMaxPence) : '?'}
        </Text>

        {dispatchNote && (
          <Card style={styles.card}>
            <Text variant="small" color="muted">
              Note from dispatch
            </Text>
            <Text variant="small">{dispatchNote}</Text>
          </Card>
        )}

        <View style={styles.customerRow}>
          <Text variant="small">Customer: {customer.name}</Text>
          <Pressable onPress={handleMessageCustomer} disabled={messaging}>
            <Text variant="link" color="brand">
              {messaging ? 'Opening…' : 'Message'}
            </Text>
          </Pressable>
        </View>

        {access.status === 'WON' && (
          <Card style={styles.card}>
            <Text variant="small" color="muted">
              Contact details
            </Text>
            <Text variant="small">
              {lead.addressLine ? `${lead.addressLine}, ` : ''}
              {lead.city}
              {lead.postcode ? `, ${lead.postcode}` : ''}
            </Text>
            <Text variant="small">{customer.phone ?? 'No phone number on file'}</Text>
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.description}>{lead.description}</Text>
        </Card>

        {ownBooking && (
          <Pressable onPress={() => router.push(`/bookings/${ownBooking.id}`)}>
            <Card style={styles.card}>
              <Text variant="bodyMedium">You won this job</Text>
              <Text variant="small" color="muted">
                Booking status: {ownBooking.status.replace(/_/g, ' ')}
              </Text>
              <Text variant="link" color="brand">
                {ownBooking.status === 'IN_PROGRESS' ? 'Open job sheet →' : 'Open booking →'}
              </Text>
            </Card>
          </Pressable>
        )}

        <Text variant="bodyMedium" style={styles.sectionHeading}>
          {existingQuote ? 'Your quote' : 'Send a quote'}
        </Text>
        {sent && (
          <Text variant="small" style={styles.success}>
            Quote sent!
          </Text>
        )}
        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}
        <TextField placeholder="Amount (£)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <TextField placeholder="Message to the customer (optional)" multiline value={message} onChangeText={setMessage} style={styles.spacedInput} />
        <Button onPress={handleSendQuote} loading={submitting} style={styles.submitButton}>
          {existingQuote ? 'Update quote' : 'Send quote'}
        </Button>

        {existingQuote && (
          <Text variant="small" color="muted" style={styles.quoteStatus}>
            Status: {existingQuote.status}
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  metaRow: { flexDirection: 'row', gap: 8 },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  card: { gap: 4, marginVertical: 4 },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: 24 },
  spacedInput: { marginTop: 8 },
  submitButton: { marginTop: 4 },
  error: { color: '#dc2626' },
  success: { color: '#16a34a' },
  quoteStatus: { textAlign: 'center' },
});

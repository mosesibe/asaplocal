import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, X } from 'lucide-react-native';
import { Screen, Card, Text, Badge, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

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
  assignedByDispatch: boolean;
  dispatchNote: string | null;
  existingQuote: { amountPence: number; message: string | null; status: string } | null;
  aiSuggestion: { message: string; suggestedAmountPence: number | null } | null;
  ownBooking: { id: string; status: string } | null;
}

const PIPELINE_STAGES = ['CONTACTED', 'QUOTED', 'WON', 'LOST'] as const;

const REFUND_REASONS: { value: string; label: string }[] = [
  { value: 'OUT_OF_SERVICE_AREA', label: 'Out of my service area' },
  { value: 'DUPLICATE_LEAD', label: 'Duplicate lead' },
  { value: 'SPAM_OR_FAKE', label: 'Spam / fake request' },
  { value: 'UNRESPONSIVE_CUSTOMER', label: 'Customer unresponsive' },
  { value: 'WRONG_CATEGORY', label: 'Wrong category' },
  { value: 'OTHER', label: 'Other' },
];

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(0)}`;
}

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);

  // Pipeline status
  const [pipelineBusy, setPipelineBusy] = useState<string | null>(null);
  const [lostReasonOpen, setLostReasonOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  // Refund request
  const [refundReason, setRefundReason] = useState(REFUND_REASONS[0].value);
  const [refundReasonPickerOpen, setRefundReasonPickerOpen] = useState(false);
  const [refundDetails, setRefundDetails] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundSent, setRefundSent] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<LeadDetail>(`/api/leads/${id}`);
      setData(res);
      if (res.existingQuote) {
        setAmount(String(res.existingQuote.amountPence / 100));
        setMessage(res.existingQuote.message ?? '');
      } else if (res.aiSuggestion && !aiPrefilled) {
        setAiPrefilled(true);
        if (res.aiSuggestion.suggestedAmountPence) setAmount(String(res.aiSuggestion.suggestedAmountPence / 100));
        setMessage(res.aiSuggestion.message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load lead.');
    } finally {
      setLoading(false);
    }
  }, [id, aiPrefilled]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const updatePipelineStatus = useCallback(
    async (status: string, reason?: string) => {
      if (!data) return;
      setPipelineBusy(status);
      try {
        await api.request(`/api/leads/${data.access.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ leadAccessId: data.access.id, status, lostReason: reason }),
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update pipeline status.');
      } finally {
        setPipelineBusy(null);
      }
    },
    [data, load]
  );

  function handlePipelinePress(status: string) {
    if (status === 'LOST') {
      setLostReasonOpen(true);
      return;
    }
    updatePipelineStatus(status);
  }

  async function confirmLost() {
    await updatePipelineStatus('LOST', lostReason.trim() || undefined);
    setLostReasonOpen(false);
    setLostReason('');
  }

  const handleRefundRequest = useCallback(async () => {
    if (!data) return;
    setRefundSubmitting(true);
    setError(null);
    try {
      await api.request(`/api/leads/${data.access.id}/refund-request`, {
        method: 'POST',
        body: JSON.stringify({ leadAccessId: data.access.id, reason: refundReason, details: refundDetails.trim() || undefined }),
      });
      setRefundSent(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit this request.');
    } finally {
      setRefundSubmitting(false);
    }
  }, [data, refundReason, refundDetails, load]);

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

  const { lead, access, customer, assignedByDispatch, dispatchNote, existingQuote, aiSuggestion, ownBooking } = data;
  const refundReasonLabel = REFUND_REASONS.find((r) => r.value === refundReason)?.label ?? REFUND_REASONS[0].label;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <View style={styles.metaRow}>
          <Badge variant="outline">{lead.categoryName}</Badge>
          <Badge>{access.status}</Badge>
          {assignedByDispatch && <Badge variant="secondary">Assigned to you by dispatch</Badge>}
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
          Pipeline status
        </Text>
        <View style={styles.chipRow}>
          {PIPELINE_STAGES.map((s) => {
            const active = access.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => handlePipelinePress(s)}
                disabled={pipelineBusy !== null}
                style={[
                  styles.pipelineChip,
                  { borderRadius: radius.full, borderColor: active ? colors.brand[600] : colors.border, backgroundColor: active ? colors.brand[600] : 'transparent' },
                ]}
              >
                <Text variant="small" color={active ? 'inverse' : 'foreground'}>
                  {pipelineBusy === s ? 'Updating…' : s}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {lostReasonOpen && (
          <Card style={styles.card}>
            <Text variant="smallMedium">Why was this lead lost?</Text>
            <TextField
              placeholder="Optional — helps us improve lead quality"
              multiline
              value={lostReason}
              onChangeText={setLostReason}
              style={styles.spacedInput}
            />
            <View style={styles.actionRow}>
              <Button size="sm" onPress={confirmLost} loading={pipelineBusy === 'LOST'} style={styles.flex1}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" onPress={() => setLostReasonOpen(false)} style={styles.flex1}>
                Cancel
              </Button>
            </View>
          </Card>
        )}

        <Text variant="bodyMedium" style={styles.sectionHeading}>
          {existingQuote ? 'Your quote' : 'Send a quote'}
        </Text>
        {access.status === 'WON' && existingQuote ? (
          // Once a lead is won there's nothing left to negotiate — this
          // becomes a fixed record of what was quoted, not an editable form.
          <Card style={styles.card}>
            <Text variant="bodyMedium" style={{ color: colors.brand[600] }}>
              {formatPence(existingQuote.amountPence)}
            </Text>
            {existingQuote.message && (
              <Text variant="small" color="muted">
                {existingQuote.message}
              </Text>
            )}
            <Text variant="caption" color="muted" style={styles.quoteStatusLabel}>
              {existingQuote.status}
            </Text>
          </Card>
        ) : (
          <>
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
            {!existingQuote && aiSuggestion && (
              <Card style={[styles.aiBanner, { backgroundColor: colors.brand[50], borderRadius: radius.md }]}>
                <Text variant="caption" style={{ color: colors.brand[800] }}>
                  AI-drafted reply pre-filled below — edit before sending.
                </Text>
              </Card>
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
          </>
        )}

        {!access.refundRequestStatus && !refundSent ? (
          <View style={styles.refundSection}>
            <Text variant="bodyMedium" style={styles.sectionHeading}>
              Something wrong with this lead?
            </Text>
            <Card style={styles.card}>
              <Pressable
                onPress={() => setRefundReasonPickerOpen(true)}
                style={[styles.selectField, { borderColor: colors.border, borderRadius: radius.lg }]}
              >
                <Text variant="body" style={styles.flex1}>
                  {refundReasonLabel}
                </Text>
                <ChevronDown size={18} color={colors.mutedForeground} />
              </Pressable>
              <TextField
                placeholder="Add any details that will help us review this quickly"
                multiline
                value={refundDetails}
                onChangeText={setRefundDetails}
                style={styles.spacedInput}
              />
              <Button variant="outline" onPress={handleRefundRequest} loading={refundSubmitting} style={styles.spacedInput}>
                Request refund
              </Button>
            </Card>
          </View>
        ) : (
          <Text variant="small" color="muted" style={styles.refundStatus}>
            Refund request status: {access.refundRequestStatus ?? 'PENDING'}
          </Text>
        )}
      </ScrollView>

      <Modal visible={refundReasonPickerOpen} transparent animationType="slide" onRequestClose={() => setRefundReasonPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setRefundReasonPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
            <View style={styles.modalHeader}>
              <Text variant="subtitle">Reason</Text>
              <Pressable onPress={() => setRefundReasonPickerOpen(false)} hitSlop={8}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {REFUND_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => {
                  setRefundReason(r.value);
                  setRefundReasonPickerOpen(false);
                }}
                style={[styles.modalRow, { borderColor: colors.border }]}
              >
                <Text variant="small">{r.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  card: { gap: 4, marginVertical: 4 },
  description: { lineHeight: 22 },
  sectionHeading: { marginTop: 24 },
  spacedInput: { marginTop: 8 },
  submitButton: { marginTop: 4 },
  error: { color: '#dc2626' },
  success: { color: '#16a34a' },
  quoteStatus: { textAlign: 'center' },
  quoteStatusLabel: { textTransform: 'uppercase', marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pipelineChip: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  flex1: { flex: 1 },
  aiBanner: { padding: 10, marginBottom: 8 },
  refundSection: { marginTop: 8 },
  refundStatus: { textAlign: 'center', marginTop: 24 },
  selectField: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '60%', paddingTop: 16, paddingBottom: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  modalRow: { paddingVertical: 14, paddingHorizontal: 20, borderTopWidth: StyleSheet.hairlineWidth },
});

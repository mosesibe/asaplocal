import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { Star, X } from 'lucide-react-native';
import { Screen, Card, Text, Badge, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { ApiError } from '@asaplocal/api-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Balance {
  basePence: number;
  extrasPence: number;
  totalPence: number;
  paidPence: number;
  outstandingPence: number;
  depositPence: number;
  depositDuePence: number;
}
interface Variation {
  id: string;
  description: string;
  amountPence: number;
  photos: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}
interface Dispute {
  id: string;
  reason: string;
  photos: string[];
  status: 'OPEN' | 'RESOLVED';
  providerResponse: string | null;
  providerPhotos: string[];
  createdAt: string;
}
interface BookingDetail {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  addressLine: string;
  city: string;
  business: { id: string; slug: string; name: string; logoUrl: string | null; phone: string | null };
  balance: Balance;
  assignedStaff: { fullName: string; jobTitle: string | null; profilePhotoUrl: string; idFrontImageUrl: string; idBackImageUrl: string } | null;
  jobSheetEntries: { id: string; description: string; photos: string[]; loggedAt: string }[];
  variations: Variation[];
  disputes: Dispute[];
  review: { id: string; rating: number; comment: string | null } | null;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

// Ports apps/web/app/bookings/[id]/page.tsx (not the /checkout subpage —
// payment itself stays a web-view handoff, decided earlier this session).
// Backed by the new GET /api/bookings/[bookingId] route.
export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<BookingDetail>(`/api/bookings/${id}`);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAcceptCompletion() {
    setBusy(true);
    setError(null);
    try {
      await api.request(`/api/bookings/${id}/accept-completion`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not confirm completion.');
    } finally {
      setBusy(false);
    }
  }

  async function decideVariation(variationId: string, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.request(`/api/bookings/${id}/variations/${variationId}/decide`, { method: 'POST', body: JSON.stringify({ accept }) });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your decision.');
    } finally {
      setBusy(false);
    }
  }

  function openCheckout() {
    WebBrowser.openBrowserAsync(`${API_URL}/bookings/${id}/checkout`);
  }

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
        <Text>{error ?? 'Booking not found.'}</Text>
      </Screen>
    );
  }

  const { balance } = data;
  const openDispute = data.disputes.find((d) => d.status === 'OPEN');
  const latestDispute = data.disputes[data.disputes.length - 1];

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <Badge variant="outline">{data.status.replace(/_/g, ' ')}</Badge>
        <Text variant="title" style={styles.h1}>
          {data.business.name}
        </Text>
        <Text variant="small" color="muted">
          {data.addressLine}, {data.city}
        </Text>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        {data.status === 'PENDING' && balance.depositDuePence > 0 && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Awaiting deposit</Text>
            <Button onPress={openCheckout}>{`Pay deposit — ${formatPence(balance.depositDuePence)}`}</Button>
          </Card>
        )}

        {data.status === 'DISPUTED' && (
          <Card style={styles.card}>
            <Text variant="small">
              You've reported an issue with this job — {data.business.name} has been notified and needs to respond before you can
              confirm.
            </Text>
          </Card>
        )}

        {latestDispute && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Reported issue</Text>
            <Text variant="small" color="muted">
              {latestDispute.reason}
            </Text>
            {latestDispute.status === 'RESOLVED' ? (
              <View style={styles.disputeResponse}>
                <Text variant="caption" color="muted">
                  {data.business.name}'s response
                </Text>
                <Text variant="small">{latestDispute.providerResponse}</Text>
              </View>
            ) : (
              <Text variant="small" color="muted">
                Waiting for {data.business.name} to respond.
              </Text>
            )}
          </Card>
        )}

        {data.assignedStaff && (
          <Card style={styles.card}>
            <View style={styles.staffRow}>
              <Image source={{ uri: data.assignedStaff.profilePhotoUrl }} style={styles.staffPhoto} />
              <View>
                <Text variant="bodyMedium">{data.assignedStaff.fullName}</Text>
                {data.assignedStaff.jobTitle && (
                  <Text variant="small" color="muted">
                    {data.assignedStaff.jobTitle}
                  </Text>
                )}
              </View>
            </View>
            <Text variant="caption" color="muted">
              {data.business.name}'s company ID — so you can confirm who's at your door.
            </Text>
            <View style={styles.idRow}>
              <Image source={{ uri: data.assignedStaff.idFrontImageUrl }} style={styles.idImage} />
              <Image source={{ uri: data.assignedStaff.idBackImageUrl }} style={styles.idImage} />
            </View>
          </Card>
        )}

        {data.jobSheetEntries.length > 0 && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Work log</Text>
            {data.jobSheetEntries.map((e) => (
              <View key={e.id} style={styles.logEntry}>
                <Text variant="small">{e.description}</Text>
                {e.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {e.photos.map((p) => (
                      <Image key={p} source={{ uri: p }} style={styles.logPhoto} />
                    ))}
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        {data.variations.length > 0 && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Extra work</Text>
            {data.variations.map((v) => (
              <View key={v.id} style={styles.variationRow}>
                <Text variant="small">{v.description}</Text>
                <Text variant="smallMedium">+{formatPence(v.amountPence)}</Text>
                {v.status === 'PENDING' ? (
                  <View style={styles.variationActions}>
                    <Button size="sm" onPress={() => decideVariation(v.id, true)} loading={busy} style={styles.flex1}>
                      {`Approve +${formatPence(v.amountPence)}`}
                    </Button>
                    <Button size="sm" variant="outline" onPress={() => decideVariation(v.id, false)} loading={busy} style={styles.flex1}>
                      Decline
                    </Button>
                  </View>
                ) : (
                  <Badge variant={v.status === 'ACCEPTED' ? 'success' : 'outline'}>{v.status}</Badge>
                )}
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.card}>
          <Text variant="bodyMedium">Price</Text>
          <PriceRow label="Agreed price" value={formatPence(balance.basePence)} />
          {balance.extrasPence > 0 && <PriceRow label="Extras" value={`+${formatPence(balance.extrasPence)}`} />}
          <PriceRow label="Total" value={formatPence(balance.totalPence)} bold />
          {balance.paidPence > 0 && <PriceRow label="Paid so far" value={`-${formatPence(balance.paidPence)}`} />}
          {balance.outstandingPence > 0 ? (
            <>
              <PriceRow label={balance.depositDuePence > 0 ? 'Deposit due now' : 'Still to pay'} value={formatPence(balance.outstandingPence)} bold />
              {data.status === 'COMPLETED' && <Button onPress={openCheckout}>Pay balance</Button>}
            </>
          ) : (
            <Text variant="small" color="muted">
              Paid in full
            </Text>
          )}
        </Card>

        {data.status === 'AWAITING_APPROVAL' && !openDispute && (
          <View style={styles.actionRow}>
            <Button onPress={handleAcceptCompletion} loading={busy} style={styles.flex1}>
              Accept completion
            </Button>
            <Button variant="outline" onPress={() => setShowDispute(true)} style={styles.flex1}>
              Report an issue
            </Button>
          </View>
        )}

        {showDispute && (
          <DisputeForm
            bookingId={id}
            onClose={() => setShowDispute(false)}
            onSubmitted={() => {
              setShowDispute(false);
              load();
            }}
          />
        )}

        {data.status === 'COMPLETED' && !data.review && <ReviewForm bookingId={id} onSubmitted={load} />}
        {data.review && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Thanks — your review has been submitted.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text variant={bold ? 'bodyMedium' : 'small'} color={bold ? 'foreground' : 'muted'}>
        {label}
      </Text>
      <Text variant={bold ? 'bodyMedium' : 'small'}>{value}</Text>
    </View>
  );
}

function ReviewForm({ bookingId, onSubmitted }: { bookingId: string; onSubmitted: () => void }) {
  const { colors, radius } = useAppTheme();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.request('/api/reviews', { method: 'POST', body: JSON.stringify({ bookingId, rating, comment, photos: [] }) });
      onSubmitted();
    } catch {
      setError("Couldn't submit your review — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text variant="bodyMedium">Leave a review</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
            <Star size={28} color="#f59e0b" fill={n <= rating ? '#f59e0b' : 'transparent'} />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="How did it go?"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.textarea, { borderColor: colors.border, borderRadius: radius.md, color: colors.foreground }]}
      />
      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <Button onPress={handleSubmit} loading={submitting}>
        Submit review
      </Button>
    </Card>
  );
}

function DisputeForm({ bookingId, onClose, onSubmitted }: { bookingId: string; onClose: () => void; onSubmitted: () => void }) {
  const { colors, radius } = useAppTheme();
  const [reason, setReason] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true });
    if (result.canceled) return;
    setUploading(true);
    try {
      const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      setError('Could not upload one or more photos.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (reason.trim().length < 10) return setError('Tell us a bit more about what went wrong (10+ characters).');
    setSubmitting(true);
    setError(null);
    try {
      await api.request(`/api/bookings/${bookingId}/dispute`, { method: 'POST', body: JSON.stringify({ reason: reason.trim(), photos }) });
      onSubmitted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit this issue.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <Text variant="bodyMedium">What's wrong?</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="e.g. The tap is still leaking, and there's a scratch on the worktop that wasn't there before"
        placeholderTextColor={colors.mutedForeground}
        multiline
        style={[styles.textarea, { borderColor: colors.border, borderRadius: radius.md, color: colors.foreground }]}
      />
      {photos.length > 0 && (
        <View style={styles.photoRow}>
          {photos.map((p) => (
            <Image key={p} source={{ uri: p }} style={styles.logPhoto} />
          ))}
        </View>
      )}
      <Button variant="outline" onPress={addPhotos} loading={uploading}>
        Add photos
      </Button>
      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.actionRow}>
        <Button onPress={handleSubmit} loading={submitting} style={styles.flex1}>
          Submit issue
        </Button>
        <Button variant="ghost" onPress={onClose} style={styles.flex1}>
          Cancel
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  h1: { fontSize: 22, lineHeight: 28 },
  card: { gap: 8, marginTop: 8 },
  error: { color: '#dc2626' },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffPhoto: { width: 48, height: 48, borderRadius: 24 },
  idRow: { flexDirection: 'row', gap: 8 },
  idImage: { flex: 1, aspectRatio: 1.6, borderRadius: 8 },
  logEntry: { gap: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  logPhoto: { width: 64, height: 64, borderRadius: 8 },
  variationRow: { gap: 4, marginTop: 4 },
  variationActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  flex1: { flex: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: 8 },
  starRow: { flexDirection: 'row', gap: 8 },
  textarea: { borderWidth: StyleSheet.hairlineWidth, minHeight: 72, padding: 10, fontSize: 14, textAlignVertical: 'top' },
  disputeResponse: { marginTop: 4, gap: 2 },
});

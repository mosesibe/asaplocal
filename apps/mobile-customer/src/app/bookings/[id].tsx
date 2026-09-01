import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Star } from 'lucide-react-native';
import { Screen, Card, Text, Badge, Button, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';
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
  scheduledDate: string;
  durationMinutes: number | null;
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
// Backed by GET /api/bookings/[bookingId], which mirrors the web page's
// Prisma query + computeBookingBalance 1:1.
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
  const acceptedVariations = data.variations.filter((v) => v.status === 'ACCEPTED');
  const pendingVariations = data.variations.filter((v) => v.status === 'PENDING');
  // A booking sits at PENDING from quote acceptance until the deposit lands.
  const awaitingDeposit = data.status === 'PENDING' && balance.depositDuePence > 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]}>
        <Badge variant={data.status === 'COMPLETED' ? 'success' : data.status === 'DISPUTED' ? 'destructive' : 'secondary'}>
          {data.status.replace(/_/g, ' ')}
        </Badge>
        <Text variant="title" style={styles.h1}>
          Booking with {data.business.name}
        </Text>

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        <Card style={styles.card}>
          <PriceRow label="Scheduled" value={new Date(data.scheduledDate).toLocaleDateString('en-GB')} />
          <PriceRow label="Address" value={`${data.addressLine}, ${data.city}`} />
          <PriceRow label="Agreed price" value={formatPence(balance.basePence)} />
          {acceptedVariations.map((v) => (
            <PriceRow key={v.id} label={`Extra: ${v.description}`} value={`+${formatPence(v.amountPence)}`} muted truncateLabel />
          ))}
          <View style={[styles.divider, { borderTopColor: colors.border }]} />
          <PriceRow label="Total" value={formatPence(balance.totalPence)} boldValue />
          <PriceRow label="Paid so far" value={`−${formatPence(balance.paidPence)}`} muted />
          {awaitingDeposit ? (
            <PriceRow label="Deposit due now" value={formatPence(balance.depositDuePence)} boldRow />
          ) : (
            <PriceRow
              label={balance.outstandingPence > 0 ? 'Still to pay' : 'Paid in full'}
              value={formatPence(balance.outstandingPence)}
              boldRow
            />
          )}
        </Card>

        {awaitingDeposit && (
          <View style={styles.ctaBlock}>
            <Button onPress={openCheckout}>{`Pay deposit — ${formatPence(balance.depositDuePence)}`}</Button>
            <Text variant="caption" color="muted" style={styles.centerText}>
              Confirms the booking with {data.business.name}. The rest is paid when the job is done.
            </Text>
          </View>
        )}

        {balance.outstandingPence > 0 && data.status === 'COMPLETED' && (
          <View style={styles.ctaBlock}>
            <Button onPress={openCheckout}>{`Pay balance — ${formatPence(balance.outstandingPence)}`}</Button>
            {pendingVariations.length > 0 && (
              <Text variant="caption" color="muted" style={styles.centerText}>
                {pendingVariations.length} proposed extra{pendingVariations.length > 1 ? 's' : ''} below — decide on{' '}
                {pendingVariations.length > 1 ? 'them' : 'it'} before paying if you want {pendingVariations.length > 1 ? 'them' : 'it'}{' '}
                included.
              </Text>
            )}
          </View>
        )}

        {data.variations.length > 0 && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Extra work</Text>
            {data.variations.map((v) => (
              <View key={v.id} style={[styles.innerBox, { borderColor: colors.border, borderRadius: radius.md }]}>
                <View style={styles.rowBetween}>
                  <Text variant="small" style={styles.flex1}>
                    {v.description}
                  </Text>
                  <Text variant="smallMedium">+{formatPence(v.amountPence)}</Text>
                </View>
                {v.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {v.photos.map((p) => (
                      <Image key={p} source={{ uri: p }} style={[styles.logPhoto, { borderRadius: radius.sm }]} />
                    ))}
                  </View>
                )}
                {v.status === 'PENDING' ? (
                  <View style={styles.actionRow}>
                    <Button size="sm" onPress={() => decideVariation(v.id, true)} loading={busy} style={styles.flex1}>
                      {`Approve +${formatPence(v.amountPence)}`}
                    </Button>
                    <Button size="sm" variant="outline" onPress={() => decideVariation(v.id, false)} loading={busy} style={styles.flex1}>
                      Decline
                    </Button>
                  </View>
                ) : (
                  <Badge variant={v.status === 'ACCEPTED' ? 'success' : 'outline'} style={styles.mt6}>
                    {v.status === 'ACCEPTED' ? 'Approved' : 'Declined'}
                  </Badge>
                )}
              </View>
            ))}
          </Card>
        )}

        {data.assignedStaff && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Who's coming</Text>
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
              <Image source={{ uri: data.assignedStaff.idFrontImageUrl }} style={[styles.idImage, { borderRadius: radius.md }]} />
              <Image source={{ uri: data.assignedStaff.idBackImageUrl }} style={[styles.idImage, { borderRadius: radius.md }]} />
            </View>
          </Card>
        )}

        {data.jobSheetEntries.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text variant="bodyMedium">Job sheet</Text>
              {data.durationMinutes != null && (
                <Text variant="small" color="muted">
                  {data.durationMinutes} min
                </Text>
              )}
            </View>
            {data.jobSheetEntries.map((e) => (
              <View key={e.id} style={[styles.innerBox, { borderColor: colors.border, borderRadius: radius.md }]}>
                <Text variant="small">{e.description}</Text>
                {e.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {e.photos.map((p) => (
                      <Image key={p} source={{ uri: p }} style={[styles.logPhoto, { borderRadius: radius.sm }]} />
                    ))}
                  </View>
                )}
                <Text variant="caption" color="muted" style={styles.mt6}>
                  {new Date(e.loggedAt).toLocaleString('en-GB')}
                </Text>
              </View>
            ))}

            {data.status === 'AWAITING_APPROVAL' && (
              <View style={styles.jobSheetActions}>
                <Text variant="small" color="muted">
                  {data.business.name} has marked this job as done — review the work above and confirm.
                </Text>
                <View style={styles.actionRow}>
                  <Button onPress={handleAcceptCompletion} loading={busy} style={styles.flex1}>
                    Accept completion
                  </Button>
                  <Button variant="outline" onPress={() => setShowDispute(true)} style={styles.flex1}>
                    Report an issue
                  </Button>
                </View>
              </View>
            )}
            {data.status === 'DISPUTED' && (
              <Text variant="small" color="muted" style={styles.mt6}>
                You've reported an issue with this job — {data.business.name} has been notified and needs to respond before you can
                confirm.
              </Text>
            )}
          </Card>
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

        {data.disputes.length > 0 && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Reported issues</Text>
            {data.disputes.map((d) => (
              <View key={d.id} style={[styles.innerBox, { borderColor: colors.border, borderRadius: radius.md }]}>
                <Text variant="small">{d.reason}</Text>
                {d.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {d.photos.map((p) => (
                      <Image key={p} source={{ uri: p }} style={[styles.logPhoto, { borderRadius: radius.sm }]} />
                    ))}
                  </View>
                )}
                {d.status === 'RESOLVED' ? (
                  <View style={[styles.disputeResponse, { borderTopColor: colors.border }]}>
                    <Text variant="caption" color="muted">
                      {data.business.name}'s response
                    </Text>
                    <Text variant="small">{d.providerResponse}</Text>
                    {d.providerPhotos.length > 0 && (
                      <View style={styles.photoRow}>
                        {d.providerPhotos.map((p) => (
                          <Image key={p} source={{ uri: p }} style={[styles.logPhoto, { borderRadius: radius.sm }]} />
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text variant="caption" color="muted" style={styles.mt6}>
                    Waiting for {data.business.name} to respond.
                  </Text>
                )}
              </View>
            ))}
          </Card>
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

function PriceRow({
  label,
  value,
  muted,
  boldValue,
  boldRow,
  truncateLabel,
}: {
  label: string;
  value: string;
  muted?: boolean;
  boldValue?: boolean;
  boldRow?: boolean;
  truncateLabel?: boolean;
}) {
  const rowVariant = boldRow ? 'bodyMedium' : 'small';
  return (
    <View style={styles.priceRow}>
      <Text
        variant={rowVariant}
        color={muted ? 'muted' : 'foreground'}
        style={styles.flex1}
        numberOfLines={truncateLabel ? 1 : undefined}
        ellipsizeMode={truncateLabel ? 'tail' : undefined}
      >
        {label}
      </Text>
      <Text variant={boldRow ? 'bodyMedium' : boldValue ? 'smallMedium' : rowVariant} color={muted ? 'muted' : 'foreground'}>
        {value}
      </Text>
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
  const { pick, sheet } = usePhotoPicker();

  async function addPhotos() {
    const assets = await pick({ quality: 0.7, allowsMultipleSelection: true });
    if (assets.length === 0) return;
    setUploading(true);
    try {
      const urls = await Promise.all(assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
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
    <>
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
            <Image key={p} source={{ uri: p }} style={[styles.logPhoto, { borderRadius: radius.sm }]} />
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
    {sheet}
    </>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  h1: { fontSize: 22, lineHeight: 28 },
  card: { gap: 8, marginTop: 8 },
  error: { color: '#dc2626' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 2 },
  ctaBlock: { gap: 6, marginTop: 8 },
  centerText: { textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  innerBox: { borderWidth: StyleSheet.hairlineWidth, padding: 10, gap: 4, marginTop: 4 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  staffPhoto: { width: 48, height: 48, borderRadius: 24 },
  idRow: { flexDirection: 'row', gap: 8 },
  idImage: { flex: 1, aspectRatio: 1.6 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  logPhoto: { width: 64, height: 64 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  jobSheetActions: { gap: 8, marginTop: 4 },
  flex1: { flex: 1 },
  mt6: { marginTop: 6 },
  starRow: { flexDirection: 'row', gap: 8 },
  textarea: { borderWidth: StyleSheet.hairlineWidth, minHeight: 72, padding: 10, fontSize: 14, textAlignVertical: 'top' },
  disputeResponse: { marginTop: 4, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
});

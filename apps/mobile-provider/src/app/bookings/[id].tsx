import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Screen, Card, Text, Button, Badge, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';

interface Variation {
  id: string;
  description: string;
  amountPence: number;
  status: string;
  photos: string[];
  createdAt: string;
}

interface Dispute {
  id: string;
  reason: string;
  photos: string[];
  status: string;
  providerResponse: string | null;
  providerPhotos: string[];
  createdAt: string;
}

interface BookingDetail {
  booking: {
    id: string;
    status: string;
    title: string;
    leadId: string | null;
    customerName: string;
    scheduledDate: string;
    addressLine: string;
    city: string;
    durationMinutes: number | null;
    etaMinutes: number | null;
    trackingEnabled: boolean;
    assignedStaff: { id: string; fullName: string } | null;
  };
  jobSheetEntries: { id: string; description: string; photos: string[]; loggedAt: string }[];
  variations: Variation[];
  disputes: Dispute[];
}

interface StaffOption {
  id: string;
  fullName: string;
  jobTitle: string | null;
  approvalStatus: string;
  isActive: boolean;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busy, setBusy] = useState<'start' | 'add' | 'finish' | null>(null);
  const { pick, sheet } = usePhotoPicker();

  // ETA / live-location sharing
  const [etaMinutesInput, setEtaMinutesInput] = useState('15');
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [etaBusy, setEtaBusy] = useState(false);
  const [etaError, setEtaError] = useState<string | null>(null);

  // Extra work / variations
  const [variationDescription, setVariationDescription] = useState('');
  const [variationAmount, setVariationAmount] = useState('');
  const [variationPhotos, setVariationPhotos] = useState<string[]>([]);
  const [variationUploading, setVariationUploading] = useState(false);
  const [variationBusy, setVariationBusy] = useState(false);
  const [variationError, setVariationError] = useState<string | null>(null);
  const [variationFormOpen, setVariationFormOpen] = useState(false);

  // Dispute response
  const [disputeResponse, setDisputeResponse] = useState('');
  const [disputePhotos, setDisputePhotos] = useState<string[]>([]);
  const [disputeUploading, setDisputeUploading] = useState(false);
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Staff assignment
  const [staffAssignable, setStaffAssignable] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

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

  // Seed the ETA form from the booking's current values once per booking —
  // re-running on every load() would stomp whatever the provider is mid-typing.
  useEffect(() => {
    if (!data) return;
    setEtaMinutesInput(String(data.booking.etaMinutes ?? 15));
    setTrackingEnabled(data.booking.trackingEnabled ?? true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.booking.id]);

  // /api/staff already returns a `canHaveStaff` flag mirroring
  // @asaplocal/core's canHaveStaff(businessType) server-side — reusing that
  // instead of duplicating the business-type check here.
  useEffect(() => {
    const status = data?.booking.status;
    if (!status || !['CONFIRMED', 'IN_PROGRESS'].includes(status)) return;
    api
      .request<{ canHaveStaff: boolean; staff: StaffOption[] }>('/api/staff')
      .then((res) => {
        setStaffAssignable(res.canHaveStaff);
        setStaffOptions(res.staff.filter((s) => s.approvalStatus === 'VERIFIED' && s.isActive));
      })
      .catch(() => {});
  }, [data?.booking.status]);

  // Share the provider's live position roughly every 15s while this screen
  // is focused and tracking is turned on — stops the moment the screen
  // blurs/unmounts or tracking is switched off.
  useFocusEffect(
    useCallback(() => {
      if (!trackingActive || !id) return;
      let subscription: Location.LocationSubscription | null = null;
      let cancelled = false;

      (async () => {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 0 },
          (position) => {
            api
              .request(`/api/bookings/${id}/location`, {
                method: 'POST',
                body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
              })
              .catch(() => {});
          }
        );
      })();

      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, [trackingActive, id])
  );

  const handlePickPhoto = useCallback(async () => {
    const assets = await pick({ quality: 0.7, allowsMultipleSelection: true });
    if (assets.length === 0) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const urls = await Promise.all(assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setPhotos((p) => [...p, ...urls]);
    } catch {
      setError('One or more photos failed to upload.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [pick]);

  const handlePickVariationPhoto = useCallback(async () => {
    const assets = await pick({ quality: 0.7, allowsMultipleSelection: true });
    if (assets.length === 0) return;

    setVariationUploading(true);
    setVariationError(null);
    try {
      const urls = await Promise.all(assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setVariationPhotos((p) => [...p, ...urls]);
    } catch {
      setVariationError('One or more photos failed to upload.');
    } finally {
      setVariationUploading(false);
    }
  }, [pick]);

  const handlePickDisputePhoto = useCallback(async () => {
    const assets = await pick({ quality: 0.7, allowsMultipleSelection: true });
    if (assets.length === 0) return;

    setDisputeUploading(true);
    setDisputeError(null);
    try {
      const urls = await Promise.all(assets.map((a) => uploadImage(a.uri, 'dispute-photo', a.mimeType ?? 'image/jpeg')));
      setDisputePhotos((p) => [...p, ...urls]);
    } catch {
      setDisputeError('One or more photos failed to upload.');
    } finally {
      setDisputeUploading(false);
    }
  }, [pick]);

  const handleStart = useCallback(async () => {
    setBusy('start');
    setError(null);
    try {
      await api.request(`/api/bookings/${id}/start`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the job.');
    } finally {
      setBusy(null);
    }
  }, [id, load]);

  const handleAddEntry = useCallback(async () => {
    if (!description.trim()) return;
    setBusy('add');
    setError(null);
    try {
      await api.request(`/api/bookings/${id}/job-sheet`, {
        method: 'POST',
        body: JSON.stringify({ description: description.trim(), photos }),
      });
      setDescription('');
      setPhotos([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the entry.');
    } finally {
      setBusy(null);
    }
  }, [id, description, photos, load]);

  const handleFinish = useCallback(async () => {
    setBusy('finish');
    setError(null);
    try {
      await api.request(`/api/bookings/${id}/finish`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish the job.');
    } finally {
      setBusy(null);
    }
  }, [id, load]);

  const handleSubmitEta = useCallback(async () => {
    const minutes = Number(etaMinutesInput);
    if (!Number.isFinite(minutes) || minutes < 1) {
      setEtaError('Enter a valid ETA in minutes.');
      return;
    }
    setEtaBusy(true);
    setEtaError(null);
    try {
      await api.request(`/api/bookings/${id}/eta`, {
        method: 'POST',
        body: JSON.stringify({ etaMinutes: Math.round(minutes), trackingEnabled }),
      });
      setTrackingActive(trackingEnabled);
    } catch (e) {
      setEtaError(e instanceof Error ? e.message : "Couldn't notify the customer.");
    } finally {
      setEtaBusy(false);
    }
  }, [id, etaMinutesInput, trackingEnabled]);

  const handleSubmitVariation = useCallback(async () => {
    const pounds = Number(variationAmount);
    if (!variationDescription.trim() || !Number.isFinite(pounds) || pounds <= 0) return;
    setVariationBusy(true);
    setVariationError(null);
    try {
      await api.request(`/api/bookings/${id}/variations`, {
        method: 'POST',
        body: JSON.stringify({
          description: variationDescription.trim(),
          amountPence: Math.round(pounds * 100),
          photos: variationPhotos,
        }),
      });
      setVariationDescription('');
      setVariationAmount('');
      setVariationPhotos([]);
      setVariationFormOpen(false);
      await load();
    } catch (e) {
      setVariationError(e instanceof Error ? e.message : "Couldn't propose the extra work.");
    } finally {
      setVariationBusy(false);
    }
  }, [id, variationDescription, variationAmount, variationPhotos, load]);

  const handleSubmitDispute = useCallback(async () => {
    if (disputeResponse.trim().length < 5) return;
    setDisputeBusy(true);
    setDisputeError(null);
    try {
      await api.request(`/api/bookings/${id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ response: disputeResponse.trim(), photos: disputePhotos }),
      });
      setDisputeResponse('');
      setDisputePhotos([]);
      await load();
    } catch (e) {
      setDisputeError(e instanceof Error ? e.message : "Couldn't send your response.");
    } finally {
      setDisputeBusy(false);
    }
  }, [id, disputeResponse, disputePhotos, load]);

  const handleAssignStaff = useCallback(
    async (staffMemberId: string | null) => {
      setStaffBusy(true);
      setStaffError(null);
      try {
        await api.request(`/api/bookings/${id}/assign-staff`, {
          method: 'POST',
          body: JSON.stringify({ staffMemberId }),
        });
        setStaffModalVisible(false);
        await load();
      } catch (e) {
        setStaffError(e instanceof Error ? e.message : "Couldn't update the assignment.");
      } finally {
        setStaffBusy(false);
      }
    },
    [id, load]
  );

  const variationTotals = useMemo(() => {
    if (!data) return { approvedPence: 0, pendingPence: 0, pendingCount: 0 };
    const approved = data.variations.filter((v) => v.status === 'ACCEPTED');
    const pending = data.variations.filter((v) => v.status === 'PENDING');
    return {
      approvedPence: approved.reduce((s, v) => s + v.amountPence, 0),
      pendingPence: pending.reduce((s, v) => s + v.amountPence, 0),
      pendingCount: pending.length,
    };
  }, [data]);

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

  const { booking, jobSheetEntries, variations, disputes } = data;
  const openDispute = disputes.find((d) => d.status === 'OPEN');
  const showVariations = ['CONFIRMED', 'IN_PROGRESS', 'AWAITING_APPROVAL'].includes(booking.status);
  const showStaffAssignment = staffAssignable && ['CONFIRMED', 'IN_PROGRESS'].includes(booking.status);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <Text variant="small" color="muted">
          {booking.status.replace(/_/g, ' ')}
        </Text>
        <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>
          {booking.title}
        </Text>
        <Text variant="small" color="muted">
          {booking.customerName} · {new Date(booking.scheduledDate).toLocaleString()}
        </Text>
        <Text variant="small" color="muted">
          {booking.addressLine}, {booking.city}
        </Text>
        {booking.durationMinutes != null && (
          <Text variant="small" color="muted">
            Duration: {booking.durationMinutes} min
          </Text>
        )}

        {error && (
          <Text variant="small" style={styles.error}>
            {error}
          </Text>
        )}

        {showStaffAssignment && (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Assigned staff</Text>
            <View style={styles.staffRow}>
              <Text variant="small" color="muted">
                {booking.assignedStaff?.fullName ?? 'Unassigned'}
              </Text>
              <Button size="sm" variant="outline" onPress={() => setStaffModalVisible(true)}>
                {booking.assignedStaff ? 'Change' : 'Assign'}
              </Button>
            </View>
            {staffError && (
              <Text variant="small" style={styles.error}>
                {staffError}
              </Text>
            )}
          </Card>
        )}

        <Card style={styles.card}>
          {booking.status === 'PENDING' && (
            <Text variant="small" color="muted">
              Waiting for the customer's deposit — you'll be notified the moment it clears.
            </Text>
          )}

          {booking.status === 'CONFIRMED' && (
            <>
              <Text variant="small" color="muted">
                Ready to head out? Start the job to begin logging your work.
              </Text>
              <Button onPress={handleStart} loading={busy === 'start'} style={styles.spacedTop}>
                Start job
              </Button>
            </>
          )}

          {booking.status === 'IN_PROGRESS' && (
            <>
              <Text variant="small" color="muted">
                Log what you're doing as you go — the customer will see this list.
              </Text>
              <TextField
                placeholder="e.g. Replaced the fuse box wiring"
                multiline
                value={description}
                onChangeText={setDescription}
                style={styles.spacedTop}
              />
              <View style={styles.photoRow}>
                {photos.map((url) => (
                  <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                ))}
                <Pressable
                  style={[styles.addPhotoButton, { borderRadius: radius.md, borderColor: colors.border }]}
                  onPress={handlePickPhoto}
                  disabled={uploadingPhoto}
                >
                  <Text variant="small" color="muted">
                    {uploadingPhoto ? 'Uploading…' : '+ Photo'}
                  </Text>
                </Pressable>
              </View>
              <Button onPress={handleAddEntry} loading={busy === 'add'} disabled={!description.trim()} style={styles.spacedTop}>
                Add entry
              </Button>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Button onPress={handleFinish} loading={busy === 'finish'} disabled={jobSheetEntries.length === 0}>
                Finish job
              </Button>
              {jobSheetEntries.length === 0 && (
                <Text variant="small" color="muted">
                  Add at least one entry before you can finish.
                </Text>
              )}
            </>
          )}

          {booking.status === 'AWAITING_APPROVAL' && (
            <Text variant="small" color="muted">
              Job marked as done — waiting for the customer to confirm completion.
            </Text>
          )}
          {booking.status === 'DISPUTED' && (
            <Text variant="small" color="muted">
              The customer reported an issue with this job.
            </Text>
          )}
          {booking.status === 'COMPLETED' && (
            <Text variant="small" color="muted">
              The customer has confirmed this job as complete.
            </Text>
          )}
          {booking.status === 'CANCELLED' && (
            <Text variant="small" color="muted">
              This booking was cancelled.
            </Text>
          )}
        </Card>

        {booking.status === 'CONFIRMED' && (
          <>
            <Text variant="bodyMedium" style={styles.sectionHeading}>
              On your way?
            </Text>
            <Card style={styles.card}>
              <Text variant="small" color="muted">
                Let the customer know when to expect you. Sharing your location only works while this app stays open in the
                foreground.
              </Text>
              <Text variant="small" style={styles.spacedTop}>
                ETA (minutes)
              </Text>
              <TextField keyboardType="number-pad" value={etaMinutesInput} onChangeText={setEtaMinutesInput} style={styles.etaInput} />
              <View style={styles.switchRow}>
                <Text variant="small">Share my live location with the customer</Text>
                <Switch value={trackingEnabled} onValueChange={setTrackingEnabled} />
              </View>
              {etaError && (
                <Text variant="small" style={styles.error}>
                  {etaError}
                </Text>
              )}
              <Button onPress={handleSubmitEta} loading={etaBusy} style={styles.spacedTop}>
                {trackingActive ? 'Update ETA' : 'Notify customer'}
              </Button>
              {trackingActive && (
                <Text variant="caption" color="muted">
                  Sharing your location every 15 seconds while this screen is open.
                </Text>
              )}
            </Card>
          </>
        )}

        {showVariations && (
          <>
            <Text variant="bodyMedium" style={styles.sectionHeading}>
              Extra work
            </Text>
            <Card style={styles.card}>
              <Text variant="small" color="muted">
                Agreed something beyond the quote? Propose it here — the customer has to approve before it's charged.
              </Text>

              {variations.length > 0 && (
                <View style={styles.spacedTop}>
                  {variations.map((v) => (
                    <View key={v.id} style={[styles.variationRow, { borderColor: colors.border }]}>
                      <View style={styles.variationHeader}>
                        <Text variant="small" style={styles.flexShrink}>
                          {v.description}
                        </Text>
                        <Text variant="smallMedium">{formatPence(v.amountPence)}</Text>
                      </View>
                      {v.photos.length > 0 && (
                        <View style={styles.photoRow}>
                          {v.photos.map((url) => (
                            <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                          ))}
                        </View>
                      )}
                      <Badge variant={v.status === 'ACCEPTED' ? 'success' : v.status === 'DECLINED' ? 'destructive' : 'outline'}>
                        {v.status === 'PENDING' ? 'Awaiting approval' : v.status === 'ACCEPTED' ? 'Approved' : 'Declined'}
                      </Badge>
                    </View>
                  ))}
                  {(variationTotals.approvedPence > 0 || variationTotals.pendingCount > 0) && (
                    <Text variant="small" color="muted" style={styles.spacedTop}>
                      {formatPence(variationTotals.approvedPence)} approved
                      {variationTotals.pendingCount > 0 && ` · ${formatPence(variationTotals.pendingPence)} awaiting approval`}
                    </Text>
                  )}
                </View>
              )}

              {variationFormOpen ? (
                <View style={[styles.spacedTop, styles.formBlock, { borderColor: colors.border }]}>
                  <Text variant="small">What's the extra work?</Text>
                  <TextField
                    placeholder="e.g. Rotten joist found under the decking"
                    multiline
                    value={variationDescription}
                    onChangeText={setVariationDescription}
                    style={styles.spacedTop}
                  />
                  <Text variant="small" style={styles.spacedTop}>
                    Additional cost (£)
                  </Text>
                  <TextField
                    keyboardType="decimal-pad"
                    value={variationAmount}
                    onChangeText={setVariationAmount}
                    style={styles.etaInput}
                  />
                  <View style={styles.photoRow}>
                    {variationPhotos.map((url) => (
                      <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                    ))}
                    <Pressable
                      style={[styles.addPhotoButton, { borderRadius: radius.md, borderColor: colors.border }]}
                      onPress={handlePickVariationPhoto}
                      disabled={variationUploading}
                    >
                      <Text variant="small" color="muted">
                        {variationUploading ? 'Uploading…' : '+ Photo'}
                      </Text>
                    </Pressable>
                  </View>
                  {variationError && (
                    <Text variant="small" style={styles.error}>
                      {variationError}
                    </Text>
                  )}
                  <View style={styles.buttonRow}>
                    <Button
                      onPress={handleSubmitVariation}
                      loading={variationBusy}
                      disabled={!variationDescription.trim() || !variationAmount}
                      style={styles.flexShrink}
                    >
                      Send to customer
                    </Button>
                    <Button variant="ghost" onPress={() => setVariationFormOpen(false)}>
                      Cancel
                    </Button>
                  </View>
                </View>
              ) : (
                <Button variant="outline" size="sm" onPress={() => setVariationFormOpen(true)} style={styles.spacedTop}>
                  Propose extra work
                </Button>
              )}
            </Card>
          </>
        )}

        {disputes.length > 0 && (
          <>
            <Text variant="bodyMedium" style={styles.sectionHeading}>
              Reported issues
            </Text>
            <Card style={styles.card}>
              {disputes.map((dispute) => (
                <View key={dispute.id} style={[styles.variationRow, { borderColor: colors.border }]}>
                  <Text variant="small">{dispute.reason}</Text>
                  {dispute.photos.length > 0 && (
                    <View style={styles.photoRow}>
                      {dispute.photos.map((url) => (
                        <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                      ))}
                    </View>
                  )}
                  {dispute.status === 'RESOLVED' ? (
                    <View style={[styles.formBlock, { borderColor: colors.border }]}>
                      <Text variant="caption" color="muted">
                        Your response
                      </Text>
                      <Text variant="small" style={styles.spacedTop}>
                        {dispute.providerResponse}
                      </Text>
                      {dispute.providerPhotos.length > 0 && (
                        <View style={styles.photoRow}>
                          {dispute.providerPhotos.map((url) => (
                            <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                          ))}
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text variant="caption" color="muted">
                      Waiting on your response
                    </Text>
                  )}
                </View>
              ))}

              {openDispute && (
                <View style={[styles.spacedTop, styles.formBlock, { borderColor: colors.border }]}>
                  <Text variant="small">Your response</Text>
                  <Text variant="caption" color="muted">
                    Explain what you've done (or will do) about it. Marking this resolved sends it back to the customer to
                    reconfirm.
                  </Text>
                  <TextField
                    multiline
                    value={disputeResponse}
                    onChangeText={setDisputeResponse}
                    style={styles.spacedTop}
                  />
                  <View style={styles.photoRow}>
                    {disputePhotos.map((url) => (
                      <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                    ))}
                    <Pressable
                      style={[styles.addPhotoButton, { borderRadius: radius.md, borderColor: colors.border }]}
                      onPress={handlePickDisputePhoto}
                      disabled={disputeUploading}
                    >
                      <Text variant="small" color="muted">
                        {disputeUploading ? 'Uploading…' : '+ Photo'}
                      </Text>
                    </Pressable>
                  </View>
                  {disputeError && (
                    <Text variant="small" style={styles.error}>
                      {disputeError}
                    </Text>
                  )}
                  <Button
                    onPress={handleSubmitDispute}
                    loading={disputeBusy}
                    disabled={disputeResponse.trim().length < 5}
                    style={styles.spacedTop}
                  >
                    Mark resolved
                  </Button>
                </View>
              )}
            </Card>
          </>
        )}

        {jobSheetEntries.length > 0 && (
          <>
            <Text variant="bodyMedium" style={styles.sectionHeading}>
              Job sheet
            </Text>
            {jobSheetEntries.map((entry) => (
              <Card key={entry.id} style={styles.card}>
                <Text variant="small">{entry.description}</Text>
                {entry.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {entry.photos.map((url) => (
                      <Image key={url} source={{ uri: url }} style={[styles.photoThumb, { borderRadius: radius.md }]} />
                    ))}
                  </View>
                )}
                <Text variant="small" color="muted">
                  {new Date(entry.loggedAt).toLocaleString()}
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={staffModalVisible} animationType="slide" transparent onRequestClose={() => setStaffModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStaffModalVisible(false)} />
          <Card style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text variant="bodyMedium" style={styles.modalTitle}>
              Assign staff
            </Text>
            <ScrollView>
              <Pressable
                style={[styles.staffOptionRow, { borderColor: colors.border }]}
                onPress={() => handleAssignStaff(null)}
                disabled={staffBusy}
              >
                <Text variant="small">Unassigned</Text>
              </Pressable>
              {staffOptions.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.staffOptionRow, { borderColor: colors.border }]}
                  onPress={() => handleAssignStaff(s.id)}
                  disabled={staffBusy}
                >
                  <Text variant="small">
                    {s.fullName}
                    {s.jobTitle ? ` — ${s.jobTitle}` : ''}
                  </Text>
                </Pressable>
              ))}
              {staffOptions.length === 0 && (
                <Text variant="small" color="muted" style={styles.staffEmpty}>
                  No verified, active staff available to assign.
                </Text>
              )}
            </ScrollView>
          </Card>
        </View>
      </Modal>
      {sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 8 },
  card: { gap: 8, marginVertical: 4 },
  sectionHeading: { marginTop: 24 },
  spacedTop: { marginTop: 4 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 64, height: 64 },
  addPhotoButton: {
    width: 64,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  error: { color: '#dc2626' },
  etaInput: { width: 96 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  staffRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  variationRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 8, gap: 6 },
  variationHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  flexShrink: { flexShrink: 1 },
  formBlock: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 4 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '70%' },
  modalTitle: { marginBottom: 8 },
  staffOptionRow: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  staffEmpty: { paddingVertical: 16, textAlign: 'center' },
});

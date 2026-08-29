import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

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
  };
  jobSheetEntries: { id: string; description: string; photos: string[]; loggedAt: string }[];
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, radius, spacing } = useAppTheme();
  const [data, setData] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [busy, setBusy] = useState<'start' | 'add' | 'finish' | null>(null);

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

  const handlePickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to attach work photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true });
    if (result.canceled) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, 'job-photo', a.mimeType ?? 'image/jpeg')));
      setPhotos((p) => [...p, ...urls]);
    } catch {
      setError('One or more photos failed to upload.');
    } finally {
      setUploadingPhoto(false);
    }
  }, []);

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

  const { booking, jobSheetEntries } = data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
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
});

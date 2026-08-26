import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{error ?? 'Booking not found.'}</ThemedText>
      </ThemedView>
    );
  }

  const { booking, jobSheetEntries } = data;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="small" themeColor="textSecondary">
          {booking.status.replace(/_/g, ' ')}
        </ThemedText>
        <ThemedText type="subtitle">{booking.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {booking.customerName} · {new Date(booking.scheduledDate).toLocaleString()}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {booking.addressLine}, {booking.city}
        </ThemedText>
        {booking.durationMinutes != null && (
          <ThemedText type="small" themeColor="textSecondary">
            Duration: {booking.durationMinutes} min
          </ThemedText>
        )}

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <ThemedView type="backgroundElement" style={styles.card}>
          {booking.status === 'PENDING' && (
            <ThemedText type="small" themeColor="textSecondary">
              Waiting for the customer's deposit — you'll be notified the moment it clears.
            </ThemedText>
          )}

          {booking.status === 'CONFIRMED' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Ready to head out? Start the job to begin logging your work.
              </ThemedText>
              <Pressable style={styles.button} onPress={handleStart} disabled={busy !== null}>
                <ThemedText style={styles.buttonText}>{busy === 'start' ? 'Starting…' : 'Start job'}</ThemedText>
              </Pressable>
            </>
          )}

          {booking.status === 'IN_PROGRESS' && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Log what you're doing as you go — the customer will see this list.
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Replaced the fuse box wiring"
                multiline
                value={description}
                onChangeText={setDescription}
              />
              <View style={styles.photoRow}>
                {photos.map((url) => (
                  <Image key={url} source={{ uri: url }} style={styles.photoThumb} />
                ))}
                <Pressable style={styles.addPhotoButton} onPress={handlePickPhoto} disabled={uploadingPhoto}>
                  <ThemedText type="small">{uploadingPhoto ? 'Uploading…' : '+ Photo'}</ThemedText>
                </Pressable>
              </View>
              <Pressable style={styles.button} onPress={handleAddEntry} disabled={busy !== null || !description.trim()}>
                <ThemedText style={styles.buttonText}>{busy === 'add' ? 'Adding…' : 'Add entry'}</ThemedText>
              </Pressable>

              <View style={styles.divider} />
              <Pressable
                style={[styles.button, jobSheetEntries.length === 0 && styles.buttonDisabled]}
                onPress={handleFinish}
                disabled={busy !== null || jobSheetEntries.length === 0}>
                <ThemedText style={styles.buttonText}>{busy === 'finish' ? 'Finishing…' : 'Finish job'}</ThemedText>
              </Pressable>
              {jobSheetEntries.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  Add at least one entry before you can finish.
                </ThemedText>
              )}
            </>
          )}

          {booking.status === 'AWAITING_APPROVAL' && (
            <ThemedText type="small" themeColor="textSecondary">
              Job marked as done — waiting for the customer to confirm completion.
            </ThemedText>
          )}
          {booking.status === 'DISPUTED' && (
            <ThemedText type="small" themeColor="textSecondary">
              The customer reported an issue with this job.
            </ThemedText>
          )}
          {booking.status === 'COMPLETED' && (
            <ThemedText type="small" themeColor="textSecondary">
              The customer has confirmed this job as complete.
            </ThemedText>
          )}
          {booking.status === 'CANCELLED' && (
            <ThemedText type="small" themeColor="textSecondary">
              This booking was cancelled.
            </ThemedText>
          )}
        </ThemedView>

        {jobSheetEntries.length > 0 && (
          <>
            <ThemedText type="smallBold" style={styles.sectionHeading}>
              Job sheet
            </ThemedText>
            {jobSheetEntries.map((entry) => (
              <ThemedView key={entry.id} type="backgroundElement" style={styles.card}>
                <ThemedText type="small">{entry.description}</ThemedText>
                {entry.photos.length > 0 && (
                  <View style={styles.photoRow}>
                    {entry.photos.map((url) => (
                      <Image key={url} source={{ uri: url }} style={styles.photoThumb} />
                    ))}
                  </View>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(entry.loggedAt).toLocaleString()}
                </ThemedText>
              </ThemedView>
            ))}
          </>
        )}
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
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  sectionHeading: { marginTop: Spacing.four },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photoThumb: { width: 64, height: 64, borderRadius: Spacing.two },
  addPhotoButton: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#8888',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#002059',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#8888', marginVertical: Spacing.one },
  error: { color: '#dc2626' },
});

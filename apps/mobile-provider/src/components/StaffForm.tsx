import { useCallback, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage, type UploadPurpose } from '@/lib/upload';
import { usePhotoPicker } from '@/lib/photo-picker';

type ImageField = 'profilePhotoUrl' | 'idFrontImageUrl' | 'idBackImageUrl';

export interface StaffFormInitial {
  fullName: string;
  jobTitle: string | null;
  phone: string;
  email: string | null;
  profilePhotoUrl: string;
  idFrontImageUrl: string;
  idBackImageUrl: string;
}

interface StaffFormProps {
  staffId?: string;
  initial?: StaffFormInitial;
  onSaved?: (id: string) => void;
}

const IMAGE_FIELDS: { field: ImageField; label: string; purpose: UploadPurpose }[] = [
  { field: 'profilePhotoUrl', label: 'Profile photo', purpose: 'staff-profile-photo' },
  { field: 'idFrontImageUrl', label: 'Company ID — front', purpose: 'staff-id-front' },
  { field: 'idBackImageUrl', label: 'Company ID — back', purpose: 'staff-id-back' },
];

// Ports apps/provider/app/staff/staff-form.tsx, shared by staff/new.tsx and
// staff/[staffId].tsx. Handles its own submit (POST when staffId is absent,
// PATCH when present) so both screens just render this and react to onSaved.
export function StaffForm({ staffId, initial, onSaved }: StaffFormProps) {
  const { colors, radius } = useAppTheme();
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [images, setImages] = useState<Record<ImageField, string>>({
    profilePhotoUrl: initial?.profilePhotoUrl ?? '',
    idFrontImageUrl: initial?.idFrontImageUrl ?? '',
    idBackImageUrl: initial?.idBackImageUrl ?? '',
  });
  const [uploading, setUploading] = useState<ImageField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pick, sheet } = usePhotoPicker();

  const handlePickImage = useCallback(
    async (field: ImageField, purpose: UploadPurpose) => {
      const assets = await pick({ quality: 0.7 });
      if (assets.length === 0) return;

      const asset = assets[0];
      setUploading(field);
      setError(null);
      try {
        const url = await uploadImage(asset.uri, purpose, asset.mimeType ?? 'image/jpeg');
        setImages((prev) => ({ ...prev, [field]: url }));
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setUploading(null);
      }
    },
    [pick]
  );

  const handleSubmit = useCallback(async () => {
    if (!images.profilePhotoUrl || !images.idFrontImageUrl || !images.idBackImageUrl) {
      setError("Profile photo and both sides of the company ID are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        fullName,
        jobTitle: jobTitle || undefined,
        phone,
        email: email || undefined,
        profilePhotoUrl: images.profilePhotoUrl,
        idFrontImageUrl: images.idFrontImageUrl,
        idBackImageUrl: images.idBackImageUrl,
      };
      const res = await api.request<{ id: string }>(staffId ? `/api/staff/${staffId}` : '/api/staff', {
        method: staffId ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      onSaved?.(res.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }, [fullName, jobTitle, phone, email, images, staffId, onSaved]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <TextField placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextField placeholder="Role / job title (optional)" value={jobTitle} onChangeText={setJobTitle} />
        <TextField placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <TextField placeholder="Email (optional)" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      </Card>

      <Card style={styles.card}>
        <Text variant="small" color="muted">
          This is shown to customers so they know exactly who's attending their job — a clear profile photo and both sides of the
          staff member's company ID are required before an admin can approve them.
        </Text>
        <View style={styles.imageRow}>
          {IMAGE_FIELDS.map(({ field, label, purpose }) => (
            <View key={field} style={styles.imageCell}>
              {images[field] ? (
                <Image source={{ uri: images[field] }} style={[styles.imagePreview, { borderRadius: radius.md }]} />
              ) : (
                <View style={[styles.imagePlaceholder, { borderRadius: radius.md, borderColor: colors.border }]}>
                  <Text variant="caption" color="muted">
                    None
                  </Text>
                </View>
              )}
              <Text variant="caption" color="muted" style={styles.imageLabel}>
                {label}
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => handlePickImage(field, purpose)}
                disabled={uploading === field}
              >
                {uploading === field ? 'Uploading…' : images[field] ? 'Replace' : 'Upload'}
              </Button>
            </View>
          ))}
        </View>
      </Card>

      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <Button onPress={handleSubmit} loading={saving}>
        {staffId ? 'Save changes' : 'Submit for approval'}
      </Button>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: { gap: 10 },
  imageRow: { flexDirection: 'row', gap: 10 },
  imageCell: { flex: 1, alignItems: 'center', gap: 6 },
  imagePreview: { width: 64, height: 64 },
  imagePlaceholder: { width: 64, height: 64, borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  imageLabel: { textAlign: 'center' },
  error: { color: '#dc2626' },
});

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'outline' }> = {
  ACTIVE: { label: 'Active', variant: 'success' },
  PENDING_VERIFICATION: { label: 'Pending verification', variant: 'warning' },
  SUSPENDED: { label: 'Suspended', variant: 'destructive' },
  DEACTIVATED: { label: 'Deactivated', variant: 'outline' },
};

function formatPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

interface Props {
  name: string;
  avatarUrl: string | null;
  contact: string;
  status: string;
  memberSince: string;
  totalSpentPence: number;
  servicesRequested: number;
  onAvatarChanged: (url: string) => void;
}

// Ports apps/web/components/account/profile-card.tsx + avatar-upload.tsx.
export function ProfileCard({ name, avatarUrl, contact, status, memberSince, totalSpentPence, servicesRequested, onAvatarChanged }: Props) {
  const { colors, radius } = useAppTheme();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const statusInfo = STATUS_LABEL[status] ?? { label: status, variant: 'outline' as const };
  const memberSinceLabel = new Date(memberSince).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setUploading(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const publicUrl = await uploadImage(asset.uri, 'user-avatar', asset.mimeType ?? 'image/jpeg');
      const res = await api.request<{ profile: { avatarUrl: string | null } }>('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: publicUrl }),
      });
      if (res.profile.avatarUrl) onAvatarChanged(res.profile.avatarUrl);
    } catch {
      setError('Could not update your photo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card style={[styles.card, { borderRadius: radius.xl }]}>
      <View style={styles.row}>
        <Pressable onPress={pickAvatar} disabled={uploading} style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            {avatarUrl && <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />}
          </View>
          <View style={[styles.cameraBadge, { backgroundColor: colors.brand[600] }]}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={12} color="#fff" />}
          </View>
        </Pressable>
        <View style={styles.info}>
          <Text variant="bodyMedium">{name}</Text>
          <Text variant="small" color="muted">
            {contact}
          </Text>
          <Text variant="caption" color="muted">
            {statusInfo.label} · Member since {memberSinceLabel}
          </Text>
        </View>
      </View>
      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text variant="bodyMedium">{formatPence(totalSpentPence)}</Text>
          <Text variant="caption" color="muted">
            Total spent
          </Text>
        </View>
        <View style={styles.stat}>
          <Text variant="bodyMedium">{servicesRequested}</Text>
          <Text variant="caption" color="muted">
            Services requested
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
  statsRow: { flexDirection: 'row', gap: 24 },
  stat: { gap: 2 },
  error: { color: '#dc2626' },
});

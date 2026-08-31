import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen, Card, Text, Button, TextField, Badge, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface PortfolioItem {
  id: string;
  title: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  videoUrl: string | null;
  photoUrls: string[];
}

// Ports apps/provider/app/portfolio/{page,portfolio-manager}.tsx. There's no
// <Select> in ui-native, so the category dropdown is a Modal-based picker
// list instead (see the onboarding chip row for the alternative pattern —
// a modal reads better here since categories can be a long flat list).
export default function PortfolioScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<'before' | 'after' | 'video' | 'photo' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [portfolioRes, categoriesRes] = await Promise.all([
        api.request<{ items: PortfolioItem[] }>('/api/portfolio'),
        api.request<{ categories: Category[] }>('/api/categories'),
      ]);
      setItems(portfolioRes.items);
      setCategories(categoriesRes.categories);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load your portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pick = useCallback(async (kind: 'before' | 'after' | 'video' | 'photo') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to attach media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'video' ? ['videos'] : ['images'],
      quality: 0.7,
      allowsMultipleSelection: kind === 'photo',
    });
    if (result.canceled) return;

    setUploading(kind);
    setError(null);
    try {
      if (kind === 'photo') {
        const urls = await Promise.all(
          result.assets.map((a) => uploadImage(a.uri, 'portfolio-media', a.mimeType ?? 'image/jpeg'))
        );
        setPhotoUrls((p) => [...p, ...urls]);
      } else {
        const asset = result.assets[0];
        const url = await uploadImage(asset.uri, 'portfolio-media', asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'));
        if (kind === 'before') setBeforeUrl(url);
        else if (kind === 'after') setAfterUrl(url);
        else setVideoUrl(url);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Upload failed.');
    } finally {
      setUploading(null);
    }
  }, []);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setCategoryId('');
    setBeforeUrl('');
    setAfterUrl('');
    setVideoUrl('');
    setPhotoUrls([]);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    if (!beforeUrl && !afterUrl && !videoUrl && photoUrls.length === 0) {
      setError('Add at least one photo or video.');
      return;
    }
    setSubmitting(true);
    try {
      await api.request('/api/portfolio', {
        method: 'POST',
        body: JSON.stringify({
          title: title || undefined,
          description: description || undefined,
          categoryId: categoryId || undefined,
          beforeUrl: beforeUrl || undefined,
          afterUrl: afterUrl || undefined,
          videoUrl: videoUrl || undefined,
          photoUrls,
        }),
      });
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [title, description, categoryId, beforeUrl, afterUrl, videoUrl, photoUrls, resetForm, load]);

  const remove = useCallback(
    async (id: string) => {
      setRemovingId(id);
      setError(null);
      try {
        await api.request('/api/portfolio', { method: 'DELETE', body: JSON.stringify({ id }) });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not remove that item.');
      } finally {
        setRemovingId(null);
      }
    },
    [load]
  );

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="body" color="muted">
          Show off completed projects — before/after photos, videos, and descriptions.
        </Text>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Add a project</Text>
          <TextField placeholder="Title (optional)" value={title} onChangeText={setTitle} />
          <TextField
            placeholder="Description (optional)"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            style={styles.textarea}
          />

          {categories.length > 0 && (
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.pickerRow, { borderColor: colors.border, borderRadius: radius.lg }]}
            >
              <Text variant="small" color={selectedCategory ? 'foreground' : 'muted'}>
                {selectedCategory ? selectedCategory.name : 'No specific category'}
              </Text>
            </Pressable>
          )}

          <View style={styles.uploadGrid}>
            <UploadSlot
              label={beforeUrl ? 'Before ✓' : 'Upload before photo'}
              busy={uploading === 'before'}
              onPress={() => pick('before')}
            />
            <UploadSlot
              label={afterUrl ? 'After ✓' : 'Upload after photo'}
              busy={uploading === 'after'}
              onPress={() => pick('after')}
            />
          </View>
          <Button variant="outline" size="sm" loading={uploading === 'photo'} onPress={() => pick('photo')}>
            {`Add photo (${photoUrls.length})`}
          </Button>
          <Button variant="outline" size="sm" loading={uploading === 'video'} onPress={() => pick('video')}>
            {videoUrl ? 'Video ✓' : 'Upload video (optional)'}
          </Button>
          <Text variant="caption" color="muted">
            Video uploads can take a minute or two on mobile data — up to 200MB.
          </Text>

          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={submit} loading={submitting}>
            Add project
          </Button>
        </Card>

        {items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.itemHeader}>
              <Text variant="bodyMedium" style={styles.flex1}>
                {item.title ?? 'Untitled project'}
              </Text>
              <Pressable onPress={() => remove(item.id)} disabled={removingId === item.id}>
                <Text variant="small" style={styles.remove}>
                  {removingId === item.id ? 'Removing…' : 'Remove'}
                </Text>
              </Pressable>
            </View>
            {item.categoryName && <Badge variant="secondary">{item.categoryName}</Badge>}
            {item.description && (
              <Text variant="small" color="muted">
                {item.description}
              </Text>
            )}
            <View style={styles.mediaRow}>
              {item.beforeUrl && <Image source={{ uri: item.beforeUrl }} style={[styles.thumb, { borderRadius: radius.md }]} />}
              {item.afterUrl && <Image source={{ uri: item.afterUrl }} style={[styles.thumb, { borderRadius: radius.md }]} />}
              {item.photoUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={[styles.thumb, { borderRadius: radius.md }]} />
              ))}
              {item.videoUrl && (
                <View style={[styles.thumb, styles.videoThumb, { borderRadius: radius.md, borderColor: colors.border }]}>
                  <Text variant="caption" color="muted">
                    Video
                  </Text>
                </View>
              )}
            </View>
          </Card>
        ))}

        {items.length === 0 && (
          <Text variant="small" color="muted">
            No portfolio items yet.
          </Text>
        )}
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
            <Pressable
              style={styles.modalRow}
              onPress={() => {
                setCategoryId('');
                setPickerOpen(false);
              }}
            >
              <Text variant="small">No specific category</Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={styles.modalRow}
                onPress={() => {
                  setCategoryId(c.id);
                  setPickerOpen(false);
                }}
              >
                <Text variant="small">{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function UploadSlot({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Button variant="outline" size="sm" style={styles.flex1} loading={busy} onPress={onPress}>
      {label}
    </Button>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  card: { gap: 8 },
  textarea: { minHeight: 80 },
  uploadGrid: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  pickerRow: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12 },
  error: { color: '#dc2626' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remove: { color: '#dc2626' },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 64, height: 64 },
  videoThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '60%', padding: 12, margin: 12, gap: 2 },
  modalRow: { paddingVertical: 12, paddingHorizontal: 8 },
});

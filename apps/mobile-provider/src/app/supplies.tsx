import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Package } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, Badge, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

interface Supply {
  id: string;
  name: string;
  description: string | null;
  pricePence: number | null;
  unit: string | null;
  imageUrl: string | null;
  inStock: boolean;
}

// Ports apps/provider/app/supplies/{page,supplies-manager}.tsx.
export default function SuppliesScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ supplies: Supply[] }>('/api/supplies');
      setSupplies(res.supplies);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load your supplies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to attach a product photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled) return;

    setUploading(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const url = await uploadImage(asset.uri, 'supply-image', asset.mimeType ?? 'image/jpeg');
      setImageUrl(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }, []);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setPrice('');
    setUnit('');
    setImageUrl('');
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError('Give the product a name (2+ characters).');
      return;
    }
    setSubmitting(true);
    try {
      await api.request('/api/supplies', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description || undefined,
          pricePence: price ? Math.round(Number(price) * 100) : null,
          unit: unit || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add that product.");
    } finally {
      setSubmitting(false);
    }
  }, [name, description, price, unit, imageUrl, resetForm, load]);

  const toggleStock = useCallback(
    async (s: Supply) => {
      setBusyId(s.id);
      setError(null);
      try {
        await api.request(`/api/supplies/${s.id}`, { method: 'PATCH', body: JSON.stringify({ inStock: !s.inStock }) });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not update stock status.');
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const remove = useCallback(
    async (s: Supply) => {
      setBusyId(s.id);
      setError(null);
      try {
        await api.request(`/api/supplies/${s.id}`, { method: 'DELETE' });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not remove that product.');
      } finally {
        setBusyId(null);
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="body" color="muted">
          Products you sell alongside your work — parts, materials, consumables. These show on your public listing so
          customers know they can get them from you.
        </Text>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Add a product</Text>
          <TextField placeholder="Product name (e.g. Chrome basin tap)" value={name} onChangeText={setName} />
          <TextField
            placeholder="Short description (optional)"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            style={styles.textarea}
          />
          <View style={styles.row}>
            <TextField
              placeholder="Price £ (optional)"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
              style={styles.flex1}
            />
            <TextField placeholder="Unit (e.g. each)" value={unit} onChangeText={setUnit} style={styles.flex1} />
          </View>
          <View style={styles.imageRow}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={[styles.thumb, { borderRadius: radius.md }]} /> : null}
            <Button variant="outline" size="sm" loading={uploading} onPress={pickImage}>
              {imageUrl ? 'Replace photo' : 'Add photo'}
            </Button>
          </View>

          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={submit} loading={submitting} disabled={name.trim().length < 2}>
            Add product
          </Button>
        </Card>

        {supplies.map((s) => (
          <Card key={s.id} style={[styles.card, !s.inStock && styles.faded]}>
            <View style={styles.supplyRow}>
              {s.imageUrl ? (
                <Image source={{ uri: s.imageUrl }} style={[styles.thumb, { borderRadius: radius.md }]} />
              ) : (
                <View style={[styles.thumb, styles.placeholderThumb, { borderRadius: radius.md, backgroundColor: colors.brand[100] }]}>
                  <Package size={22} color={colors.brand[700]} />
                </View>
              )}
              <View style={styles.flex1}>
                <View style={styles.itemHeader}>
                  <Text variant="bodyMedium" style={styles.flex1}>
                    {s.name}
                  </Text>
                  <Badge variant={s.inStock ? 'success' : 'outline'}>{s.inStock ? 'In stock' : 'Out of stock'}</Badge>
                </View>
                {s.description && (
                  <Text variant="small" color="muted">
                    {s.description}
                  </Text>
                )}
                <Text variant="smallMedium">
                  {s.pricePence != null ? `£${(s.pricePence / 100).toFixed(2)}` : 'Price on request'}
                  {s.unit ? ` · ${s.unit}` : ''}
                </Text>
              </View>
            </View>
            <View style={styles.actionsRow}>
              <Button variant="outline" size="sm" loading={busyId === s.id} onPress={() => toggleStock(s)} style={styles.flex1}>
                {s.inStock ? 'Mark out of stock' : 'Mark in stock'}
              </Button>
              <Button variant="ghost" size="sm" disabled={busyId === s.id} onPress={() => remove(s)}>
                Remove
              </Button>
            </View>
          </Card>
        ))}

        {supplies.length === 0 && (
          <Text variant="small" color="muted">
            No products listed yet.
          </Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  card: { gap: 8 },
  textarea: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56 },
  placeholderThumb: { alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626' },
  supplyRow: { flexDirection: 'row', gap: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  faded: { opacity: 0.7 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});

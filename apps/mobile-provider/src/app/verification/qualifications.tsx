import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Screen, Card, Text, Button, Badge, TextField, useAppTheme, type BadgeVariant } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

interface Qualification {
  id: string;
  name: string;
  status: string;
  issuingBody: string | null;
  documentUrl: string | null;
}

interface RegulatedCategory {
  id: string;
  name: string;
  suggestedQualifications: string[];
}

interface QualificationsResponse {
  qualifications: Qualification[];
  regulatedCategories: RegulatedCategory[];
}

function statusVariant(status: string): BadgeVariant {
  if (status === 'VERIFIED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}

// Ports apps/provider/app/verification/qualifications/{page,qualifications-form}.tsx —
// list of existing qualifications plus an add form. The category picker is
// limited to categories this business actually offers that are flagged
// isRegulatedTrade (same set the web page derives from business.services),
// with a suggested-qualifications hint from that category.
export default function QualificationsScreen() {
  const { colors, radius, spacing } = useAppTheme();
  const [data, setData] = useState<QualificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [issuingBody, setIssuingBody] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<QualificationsResponse>('/api/verification/qualifications');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load qualifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pickDocument() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      setDocumentUrl(await uploadImage(asset.uri, 'qualification-doc', asset.mimeType ?? 'application/octet-stream'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError('Enter a qualification name');
      return;
    }
    setSubmitting(true);
    try {
      await api.request('/api/verification/qualifications', {
        method: 'POST',
        body: JSON.stringify({
          name,
          categoryId: categoryId ?? undefined,
          issuingBody: issuingBody || undefined,
          documentUrl: documentUrl || undefined,
        }),
      });
      setName('');
      setCategoryId(null);
      setIssuingBody('');
      setDocumentUrl('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
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
        <Text>{error ?? 'Qualifications not found.'}</Text>
      </Screen>
    );
  }

  const selectedCategory = data.regulatedCategories.find((c) => c.id === categoryId) ?? null;
  const allSuggested = Array.from(new Set(data.regulatedCategories.flatMap((c) => c.suggestedQualifications)));

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="small" color="muted">
          {data.regulatedCategories.length > 0
            ? `Suggested for ${data.regulatedCategories.map((c) => c.name).join(', ')}: ${allSuggested.join(', ') || '—'}`
            : 'Add any relevant qualifications or certifications.'}
        </Text>

        <Card style={styles.card}>
          {data.qualifications.length === 0 ? (
            <Text variant="small" color="muted">
              No qualifications submitted yet.
            </Text>
          ) : (
            data.qualifications.map((q) => (
              <View key={q.id} style={[styles.qualRow, { borderColor: colors.border }]}>
                <View style={styles.qualInfo}>
                  <Text variant="smallMedium">{q.name}</Text>
                  {q.issuingBody && (
                    <Text variant="caption" color="muted">
                      {q.issuingBody}
                    </Text>
                  )}
                </View>
                <Badge variant={statusVariant(q.status)}>{q.status}</Badge>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.card}>
          <Text variant="smallMedium">Add a qualification</Text>
          <TextField placeholder="Qualification name (e.g. NICEIC)" value={name} onChangeText={setName} />

          {data.regulatedCategories.length > 0 && (
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => setCategoryId(null)}
                style={[styles.chip, { borderColor: colors.border, borderRadius: radius.full }, categoryId === null && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] }]}
              >
                <Text variant="caption" color={categoryId === null ? undefined : 'muted'} style={categoryId === null ? styles.chipTextActive : undefined}>
                  Not category-specific
                </Text>
              </Pressable>
              {data.regulatedCategories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[styles.chip, { borderColor: colors.border, borderRadius: radius.full }, categoryId === c.id && { backgroundColor: colors.brand[600], borderColor: colors.brand[600] }]}
                >
                  <Text variant="caption" color={categoryId === c.id ? undefined : 'muted'} style={categoryId === c.id ? styles.chipTextActive : undefined}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {selectedCategory && selectedCategory.suggestedQualifications.length > 0 && (
            <Text variant="caption" color="muted">
              Suggested: {selectedCategory.suggestedQualifications.join(', ')}
            </Text>
          )}

          <TextField placeholder="Issuing body (optional)" value={issuingBody} onChangeText={setIssuingBody} />
          <Button variant="outline" size="sm" onPress={pickDocument} loading={uploading}>
            {documentUrl ? 'Certificate uploaded ✓' : 'Upload certificate (optional)'}
          </Button>
          {error && (
            <Text variant="small" style={styles.error}>
              {error}
            </Text>
          )}
          <Button onPress={submit} loading={submitting}>
            Add qualification
          </Button>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  card: { gap: 10 },
  qualRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  qualInfo: { flexShrink: 1, gap: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: StyleSheet.hairlineWidth },
  chipTextActive: { color: '#fff' },
  error: { color: '#dc2626' },
});

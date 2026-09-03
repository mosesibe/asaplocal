import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Screen, Card, Text, Button, Badge, TextField, useAppTheme, useBottomNavInset, type BadgeVariant } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

interface Policy {
  type: string;
  provider: string;
  policyNumber: string;
  expiryDate: string;
  coverageAmountPence: number;
  documentUrl: string;
  status: string;
}

const TYPES: { type: string; label: string; required: boolean }[] = [
  { type: 'PUBLIC_LIABILITY', label: 'Public Liability', required: true },
  { type: 'PROFESSIONAL_INDEMNITY', label: 'Professional Indemnity', required: false },
  { type: 'EMPLOYERS_LIABILITY', label: "Employer's Liability", required: false },
];

function statusVariant(status: string): BadgeVariant {
  if (status === 'VERIFIED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}

function PolicyForm({
  type,
  label,
  required,
  existing,
  onSaved,
}: {
  type: string;
  label: string;
  required: boolean;
  existing?: Policy;
  onSaved: () => void;
}) {
  const { colors } = useAppTheme();
  const [provider, setProvider] = useState(existing?.provider ?? '');
  const [policyNumber, setPolicyNumber] = useState(existing?.policyNumber ?? '');
  const [expiryDate, setExpiryDate] = useState(existing?.expiryDate ?? '');
  const [coverageAmount, setCoverageAmount] = useState(existing ? String(existing.coverageAmountPence / 100) : '');
  const [documentUrl, setDocumentUrl] = useState(existing?.documentUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickDocument() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      setDocumentUrl(await uploadImage(asset.uri, 'insurance-doc', asset.mimeType ?? 'application/octet-stream'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    if (!provider.trim() || !policyNumber.trim() || !expiryDate.trim() || !coverageAmount.trim()) {
      setError('Fill in every field');
      return;
    }
    if (!documentUrl) {
      setError('Upload your policy document');
      return;
    }
    setSubmitting(true);
    try {
      await api.request('/api/verification/insurance', {
        method: 'POST',
        body: JSON.stringify({
          type,
          provider,
          policyNumber,
          expiryDate,
          coverageAmountPence: Math.round(Number(coverageAmount) * 100),
          documentUrl,
        }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="bodyMedium">
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        {existing && <Badge variant={statusVariant(existing.status)}>{existing.status}</Badge>}
      </View>

      <TextField placeholder="Insurance provider" value={provider} onChangeText={setProvider} />
      <TextField placeholder="Policy number" value={policyNumber} onChangeText={setPolicyNumber} />
      <View style={styles.row}>
        <TextField placeholder="Expiry (YYYY-MM-DD)" value={expiryDate} onChangeText={setExpiryDate} style={styles.flex1} />
        <TextField placeholder="Coverage (£)" keyboardType="decimal-pad" value={coverageAmount} onChangeText={setCoverageAmount} style={styles.flex1} />
      </View>
      <Button variant="outline" size="sm" onPress={pickDocument} loading={uploading}>
        {documentUrl ? 'Document uploaded ✓' : 'Upload policy document'}
      </Button>
      {error && (
        <Text variant="small" style={styles.error}>
          {error}
        </Text>
      )}
      <Button onPress={submit} loading={submitting} disabled={!documentUrl}>
        {existing ? 'Update policy' : 'Submit policy'}
      </Button>
    </Card>
  );
}

interface InsuranceResponse {
  policies: Policy[];
}

// Ports apps/provider/app/verification/insurance/{page,insurance-form}.tsx —
// 3 independent policy forms (Public Liability required, the other two
// optional). Web keeps the form editable (pre-filled) even once a policy
// exists, alongside its status badge, to support re-submission on renewal —
// mirrored here rather than switching to a read-only view.
export default function InsuranceScreen() {
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [policies, setPolicies] = useState<Policy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<InsuranceResponse>('/api/verification/insurance');
      setPolicies(res.policies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insurance policies.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!policies) {
    return (
      <Screen style={styles.centered}>
        {error ? <Text>{error}</Text> : <ActivityIndicator color={colors.brand[600]} />}
      </Screen>
    );
  }

  const byType = new Map(policies.map((p) => [p.type, p]));

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <Text variant="small" color="muted">
          Public Liability is required. Professional Indemnity and Employer's Liability are optional.
        </Text>
        {TYPES.map((t) => (
          <PolicyForm key={t.type} type={t.type} label={t.label} required={t.required} existing={byType.get(t.type)} onSaved={load} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  card: { gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  required: { color: '#dc2626' },
  row: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  error: { color: '#dc2626' },
});

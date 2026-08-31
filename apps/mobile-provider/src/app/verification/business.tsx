import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Screen, Card, Text, Button, Badge, TextField, useAppTheme, type BadgeVariant } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload';

interface BusinessDocument {
  id: string;
  docType: string;
  fileUrl: string;
}

interface BusinessVerification {
  businessType: string | null;
  verificationStatus: string;
  companyRegistrationNumber: string | null;
  companyDirectorName: string | null;
  companiesHouseDirectorMatch: boolean | null;
  verificationDocuments: BusinessDocument[];
}

interface CompaniesHouseResult {
  isActive: boolean;
  notDissolved: boolean;
  directorMatch: boolean;
  companyStatus: string;
  verified: boolean;
}

const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'UTILITY_BILL', label: 'Utility bill' },
  { value: 'BUSINESS_BANK_STATEMENT', label: 'Business bank statement' },
  { value: 'HMRC_CORRESPONDENCE', label: 'HMRC correspondence' },
  { value: 'PUBLIC_LIABILITY_INSURANCE', label: 'Public liability insurance' },
];

// Matches apps/provider/lib/verification-badge.tsx's status -> variant map.
function statusBadge(status: string | null | undefined): { variant: BadgeVariant; label: string } {
  if (!status || status === 'UNVERIFIED') return { variant: 'outline', label: 'Not verified' };
  if (status === 'VERIFIED') return { variant: 'success', label: 'Verified' };
  if (status === 'REJECTED') return { variant: 'destructive', label: 'Rejected' };
  if (status === 'PENDING') return { variant: 'warning', label: 'Pending review' };
  if (status === 'MORE_INFO_REQUESTED') return { variant: 'warning', label: 'More info needed' };
  return { variant: 'outline', label: status };
}

// Ports apps/provider/app/verification/business/{page,business-verification-form}.tsx.
// Limited companies get the Companies House auto-check form; everyone else
// (sole trader etc.) gets the 4 manual document-upload rows.
export default function BusinessVerificationScreen() {
  const { colors, spacing } = useAppTheme();
  const [data, setData] = useState<BusinessVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [companyNumber, setCompanyNumber] = useState('');
  const [directorName, setDirectorName] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CompaniesHouseResult | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.request<BusinessVerification>('/api/verification/business');
      setData(res);
      setCompanyNumber(res.companyRegistrationNumber ?? '');
      setDirectorName(res.companyDirectorName ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load business verification.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkCompany = useCallback(async () => {
    if (!companyNumber.trim() || !directorName.trim()) {
      setError('Enter both the company number and director name');
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await api.request<CompaniesHouseResult>('/api/verification/business/companies-house', {
        method: 'POST',
        body: JSON.stringify({ companyNumber, directorName }),
      });
      setResult(res);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setChecking(false);
    }
  }, [companyNumber, directorName, load]);

  const uploadDoc = useCallback(
    async (docType: string) => {
      setError(null);
      const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploadingType(docType);
      try {
        const fileUrl = await uploadImage(asset.uri, 'business-verification-doc', asset.mimeType ?? 'application/octet-stream');
        await api.request('/api/verification/business/documents', {
          method: 'POST',
          body: JSON.stringify({ docType, fileUrl }),
        });
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Upload failed');
      } finally {
        setUploadingType(null);
      }
    },
    [load],
  );

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
        <Text>{error ?? 'Business verification not found.'}</Text>
      </Screen>
    );
  }

  const isLimitedCompany = data.businessType === 'LIMITED_COMPANY';

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        {isLimitedCompany ? (
          <Card style={styles.card}>
            <Text variant="small" color="muted">
              We'll automatically check your company against Companies House — active status, not dissolved, and that the director you name is currently
              listed.
            </Text>
            <TextField placeholder="Company registration number" value={companyNumber} onChangeText={setCompanyNumber} autoCapitalize="characters" />
            <TextField placeholder="Director's full name" value={directorName} onChangeText={setDirectorName} />
            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <Button onPress={checkCompany} loading={checking}>
              Verify with Companies House
            </Button>

            {result && (
              <View style={[styles.resultBox, { borderColor: colors.border }]}>
                <Text variant="small">
                  Status: {result.companyStatus} {result.isActive ? '✓' : '✗'}
                </Text>
                <Text variant="small">Not dissolved: {result.notDissolved ? '✓' : '✗'}</Text>
                <Text variant="small">Director match: {result.directorMatch ? '✓' : '✗'}</Text>
                <Text variant="smallMedium" style={styles.resultSummary}>
                  {result.verified ? 'Verified automatically.' : "Sent for manual review — one or more checks didn't pass automatically."}
                </Text>
              </View>
            )}

            <View style={styles.statusRow}>
              <Text variant="small" color="muted">
                Status
              </Text>
              <Badge variant={statusBadge(data.verificationStatus).variant}>{statusBadge(data.verificationStatus).label}</Badge>
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text variant="small" color="muted">
              Upload one or more documents proving you're trading — an admin will review them manually.
            </Text>
            <View style={styles.docList}>
              {DOC_TYPES.map((d) => {
                const uploaded = data.verificationDocuments.find((doc) => doc.docType === d.value);
                return (
                  <View key={d.value} style={[styles.docRow, { borderColor: colors.border }]}>
                    <Text variant="small">{d.label}</Text>
                    {uploaded ? (
                      <Badge variant="success">Uploaded</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onPress={() => uploadDoc(d.value)} loading={uploadingType === d.value}>
                        Upload
                      </Button>
                    )}
                  </View>
                );
              })}
            </View>
            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <View style={styles.statusRow}>
              <Text variant="small" color="muted">
                Status
              </Text>
              <Badge variant={statusBadge(data.verificationStatus).variant}>{statusBadge(data.verificationStatus).label}</Badge>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 16 },
  card: { gap: 12 },
  error: { color: '#dc2626' },
  resultBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, gap: 2 },
  resultSummary: { paddingTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  docList: { gap: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
});

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Screen, Card, Text, Button, TextField, Badge, useAppTheme } from '@asaplocal/ui-native';
import { ApiError } from '@asaplocal/api-client';

import { api } from '@/lib/api';

interface Reference {
  id: string;
  refereeName: string;
  refereeEmail: string;
  status: string;
  testimonial: string | null;
}

const MAX_REFERENCES = 3;

// Ports apps/provider/app/references/{page,references-manager}.tsx. Simplest
// of the three new screens — no uploads, just a request form gated at 3.
export default function ReferencesScreen() {
  const { colors, spacing } = useAppTheme();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refereeName, setRefereeName] = useState('');
  const [refereeEmail, setRefereeEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.request<{ references: Reference[] }>('/api/references');
      setReferences(res.references);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load your references.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async () => {
    setError(null);
    if (!refereeName.trim() || !refereeEmail.trim()) {
      setError("Enter the referee's name and email.");
      return;
    }
    setSubmitting(true);
    try {
      await api.request('/api/references', {
        method: 'POST',
        body: JSON.stringify({ refereeName: refereeName.trim(), refereeEmail: refereeEmail.trim() }),
      });
      setRefereeName('');
      setRefereeEmail('');
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [refereeName, refereeEmail, load]);

  if (loading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={colors.brand[600]} />
      </Screen>
    );
  }

  const atMax = references.length >= MAX_REFERENCES;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four }]}>
        <Text variant="body" color="muted">
          Optional — request 2-3 customer references. They'll get an email to confirm.
        </Text>

        {references.length > 0 && (
          <Card style={styles.card}>
            {references.map((r) => (
              <View key={r.id} style={[styles.refRow, { borderColor: colors.border }]}>
                <View style={styles.refHeader}>
                  <Text variant="smallMedium" style={styles.flex1}>
                    {r.refereeName} — {r.refereeEmail}
                  </Text>
                  <Badge variant={r.status === 'VERIFIED' ? 'success' : 'warning'}>{r.status}</Badge>
                </View>
                {r.testimonial && (
                  <Text variant="small" color="muted" style={styles.testimonial}>
                    "{r.testimonial}"
                  </Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {atMax ? (
          <Text variant="small" color="muted">
            You've reached the maximum of {MAX_REFERENCES} references.
          </Text>
        ) : (
          <Card style={styles.card}>
            <Text variant="bodyMedium">Request a reference</Text>
            <TextField placeholder="Referee's name" value={refereeName} onChangeText={setRefereeName} />
            <TextField
              placeholder="Referee's email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={refereeEmail}
              onChangeText={setRefereeEmail}
            />
            {error && (
              <Text variant="small" style={styles.error}>
                {error}
              </Text>
            )}
            <Button onPress={submit} loading={submitting}>
              Send request
            </Button>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { gap: 12 },
  card: { gap: 10 },
  refRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, gap: 4 },
  refHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex1: { flex: 1 },
  testimonial: { fontStyle: 'italic' },
  error: { color: '#dc2626' },
});

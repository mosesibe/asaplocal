import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';

// Ports apps/mobile-customer/src/components/account/DeleteAccountSection.tsx
// (App Store 5.1.1(v) / Play policy require in-app account deletion). Queues a
// review request via apps/provider's /api/account/deletion-request, doesn't
// delete anything immediately.
export function DeleteAccountSection() {
  const { colors, spacing } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api.request('/api/account/deletion-request', { method: 'POST', body: JSON.stringify({ reason: reason.trim() || undefined }) });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setDone(false);
    setReason('');
  }

  return (
    <>
      <Button variant="outline" onPress={() => setOpen(true)}>
        Delete my account
      </Button>
      <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Card style={[styles.dialog, { backgroundColor: colors.surface, padding: spacing.four }]}>
            {done ? (
              <>
                <Text variant="subtitle">Request received</Text>
                <Text variant="small" color="muted" style={styles.spaced}>
                  We've received your account deletion request and will action it shortly. You can keep using your account until
                  then.
                </Text>
                <Button onPress={close} style={styles.spaced}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Text variant="subtitle">Delete your account?</Text>
                <Text variant="small" color="muted" style={styles.spaced}>
                  This sends a request to our team to close your account and business profile. It isn't instant — we review
                  each request before it's actioned.
                </Text>
                <TextField
                  placeholder="Tell us why you're leaving (optional)"
                  multiline
                  maxLength={500}
                  value={reason}
                  onChangeText={setReason}
                  style={styles.spaced}
                />
                <View style={[styles.row, styles.spaced]}>
                  <Button variant="outline" onPress={close} style={styles.flex1}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onPress={submit} loading={submitting} style={styles.flex1}>
                    Submit request
                  </Button>
                </View>
              </>
            )}
          </Card>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 24 },
  dialog: { width: '100%', maxWidth: 400, gap: 0 },
  spaced: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
});

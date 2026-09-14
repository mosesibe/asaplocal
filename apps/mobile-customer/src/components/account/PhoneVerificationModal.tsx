import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet } from 'react-native';
import { Button, Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';

// Ports apps/web/components/account/phone-verification-sheet.tsx. Shared by
// the account screen's phone row and jobs/new, which requires a verified
// number before a job can be posted.
export function PhoneVerificationModal({
  visible,
  onClose,
  initialPhone,
  intro,
  onVerified,
}: {
  visible: boolean;
  onClose: () => void;
  initialPhone: string | null;
  /** Optional line explaining why we're asking, shown above the phone field. */
  intro?: string;
  onVerified: () => void;
}) {
  const { colors, spacing } = useAppTheme();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep('phone');
    setPhoneInput(initialPhone ?? '');
    setCode('');
    setError(null);
  }, [visible, initialPhone]);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      await api.request('/api/account/phone/send-code', { method: 'POST', body: JSON.stringify({ phone: phoneInput }) });
      setStep('code');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send a code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    try {
      await api.request('/api/account/phone/verify-code', { method: 'POST', body: JSON.stringify({ code }) });
      onClose();
      onVerified();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Incorrect code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface, padding: spacing.four }]}>
          {step === 'phone' ? (
            <>
              <Text variant="subtitle">Verify your phone</Text>
              {intro && (
                <Text variant="small" color="muted" style={styles.spaced}>
                  {intro}
                </Text>
              )}
              <TextField placeholder="Phone number" keyboardType="phone-pad" value={phoneInput} onChangeText={setPhoneInput} style={styles.spaced} />
              {error && <Text variant="small" style={styles.error}>{error}</Text>}
              <Button onPress={sendCode} loading={loading} disabled={!phoneInput} style={styles.spaced}>
                Send code
              </Button>
            </>
          ) : (
            <>
              <Text variant="subtitle">Enter the code</Text>
              <Text variant="small" color="muted" style={styles.spaced}>
                We sent a 6-digit code to {phoneInput}.
              </Text>
              <TextField placeholder="123456" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={styles.spaced} />
              {error && <Text variant="small" style={styles.error}>{error}</Text>}
              <Button onPress={verifyCode} loading={loading} disabled={code.length !== 6} style={styles.spaced}>
                Verify
              </Button>
              <Pressable onPress={() => setStep('phone')} style={styles.spaced}>
                <Text variant="small" color="brand">
                  Use a different number
                </Text>
              </Pressable>
            </>
          )}
        </Card>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 4 },
  spaced: { marginTop: 12 },
  error: { color: '#dc2626', marginTop: 8 },
});

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';
import { Badge, Button, Card, Text, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { ApiError } from '@asaplocal/api-client';
import { SectionRow } from './SectionRow';

// Ports apps/web/components/account/verify-phone.tsx. The web version uses
// a Sheet; a full-screen Modal is the direct RN equivalent.
export function VerifyPhoneRow({ phone, verified, onVerified }: { phone: string | null; verified: boolean; onVerified: () => void }) {
  const { colors, spacing } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState(phone ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet() {
    setStep('phone');
    setPhoneInput(phone ?? '');
    setCode('');
    setError(null);
    setOpen(true);
  }

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
      setOpen(false);
      onVerified();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Incorrect code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <SectionRow
        icon={Phone}
        label="Phone number"
        description={phone ?? 'No phone number on file'}
        right={verified ? <Badge variant="success">Verified</Badge> : <Button size="sm" variant="outline" onPress={openSheet}>Verify phone</Button>}
      />
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <Card style={[styles.sheet, { backgroundColor: colors.surface, padding: spacing.four }]}>
            {step === 'phone' ? (
              <>
                <Text variant="subtitle">Verify your phone</Text>
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: 4 },
  spaced: { marginTop: 12 },
  error: { color: '#dc2626', marginTop: 8 },
});

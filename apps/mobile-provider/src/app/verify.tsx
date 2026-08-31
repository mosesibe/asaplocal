import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { Screen, Card, Text, Button, TextField, useAppTheme } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

// Ports apps/provider/app/verify/page.tsx. Email verification happens
// out-of-band (a link tapped in the provider's mail app), so this polls
// session.refresh() the same way web polls its NextAuth session. Phone is
// treated as a soft nudge, never a hard block — the root layout's
// needsVerification gate only checks isEmailVerified (see its comment).
export default function VerifyScreen() {
  const { user, refresh } = useSession();
  const { colors, spacing } = useAppTheme();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendingPhone, setResendingPhone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailVerified = user?.isEmailVerified ?? false;
  const phoneVerified = user?.isPhoneVerified ?? false;

  useEffect(() => {
    if (emailVerified) return;
    pollRef.current = setInterval(refresh, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [emailVerified, refresh]);

  async function onVerifyCode() {
    setVerifying(true);
    setVerifyError(null);
    try {
      await api.request('/api/auth/phone/verify-code', { method: 'POST', body: JSON.stringify({ code }) });
      await refresh();
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setVerifying(false);
    }
  }

  async function onResendEmail() {
    setResendingEmail(true);
    setNotice(null);
    try {
      await api.request('/api/auth/resend-verification-email', { method: 'POST' });
      setNotice('Verification email sent.');
    } catch {
      setNotice('Something went wrong.');
    } finally {
      setResendingEmail(false);
    }
  }

  async function onResendPhone() {
    setResendingPhone(true);
    setNotice(null);
    try {
      await api.request('/api/auth/phone/resend-code', { method: 'POST' });
      setNotice('New code sent.');
    } catch {
      setNotice('Something went wrong.');
    } finally {
      setResendingPhone(false);
    }
  }

  return (
    <Screen>
      <View style={[styles.container, { padding: spacing.four }]}>
        <Text variant="title" style={styles.h1}>
          Verify your account
        </Text>
        <Text variant="body" color="muted">
          Confirm your email to unlock your dashboard.
        </Text>

        <Card style={styles.card}>
          <View style={styles.row}>
            {emailVerified ? <CheckCircle2 size={18} color={colors.brand[600]} /> : <Circle size={18} color={colors.mutedForeground} />}
            <Text variant="bodyMedium">Email {emailVerified ? 'verified' : 'not verified'}</Text>
          </View>
          {!emailVerified && (
            <>
              <Text variant="small" color="muted">
                We sent a link to {user?.email}. Tap it, then come back — this screen updates automatically.
              </Text>
              <Button variant="outline" size="sm" onPress={onResendEmail} loading={resendingEmail}>
                Resend email
              </Button>
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.row}>
            {phoneVerified ? <CheckCircle2 size={18} color={colors.brand[600]} /> : <Circle size={18} color={colors.mutedForeground} />}
            <Text variant="bodyMedium">Phone {phoneVerified ? 'verified' : 'not verified'}</Text>
          </View>
          {!phoneVerified && (
            <>
              <Text variant="small" color="muted">
                Enter the 6-digit code we texted you.
              </Text>
              <View style={styles.codeRow}>
                <TextField
                  style={styles.codeInput}
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                />
                <Button onPress={onVerifyCode} loading={verifying} disabled={code.length !== 6}>
                  Verify
                </Button>
              </View>
              {verifyError && (
                <Text variant="small" style={styles.error}>
                  {verifyError}
                </Text>
              )}
              <Button variant="outline" size="sm" onPress={onResendPhone} loading={resendingPhone}>
                Resend code
              </Button>
            </>
          )}
        </Card>

        {notice && (
          <Text variant="small" color="muted">
            {notice}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  h1: { fontSize: 24, lineHeight: 30 },
  card: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: { flex: 1 },
  error: { color: '#dc2626' },
});

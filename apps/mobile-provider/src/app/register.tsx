import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ApiError } from '@asaplocal/api-client';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000';

// Ports apps/provider/app/register/page.tsx, including the two-phase
// existing-customer merge: if the email already belongs to a customer
// account, the server responds 409 with code "EXISTING_CUSTOMER" instead of
// creating a new user, and the form re-submits with the account's existing
// password to add provider access to it (role stays CUSTOMER; see
// User.providerSince).
export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useSession();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingCustomer, setExistingCustomer] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!existingCustomer) {
      if (!firstName.trim() || !lastName.trim()) return setError('Enter your first and last name.');
      if (!email.includes('@')) return setError('Enter a valid email address.');
      if (!phone.trim()) return setError('Enter a phone number.');
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      if (!termsAccepted) return setError('You must agree to the Terms & Privacy Policy.');
    } else if (!confirmPassword) {
      return setError('Enter your existing password to confirm.');
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        email: email.trim(),
        phone: phone.trim(),
        password: existingCustomer ? confirmPassword : password,
        termsAccepted: true,
        marketingEmail,
      };
      if (existingCustomer) body.confirmPassword = confirmPassword;

      await api.request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      await login(email.trim(), existingCustomer ? confirmPassword : password);
      // Root layout's Stack.Protected auto-routes to /verify once
      // user.isEmailVerified is false — no navigation call needed here.
    } catch (e) {
      if (e instanceof ApiError && (e as unknown as { message: string }).message.includes('customer account')) {
        setExistingCustomer(true);
        setError(null);
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [existingCustomer, firstName, lastName, email, phone, password, confirmPassword, termsAccepted, marketingEmail, login]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.h1}>
          {existingCustomer ? 'Add business access' : 'Create your business account'}
        </Text>
        {existingCustomer && (
          <Text variant="small" color="muted">
            You already have a customer account with {email}. Confirm your password to add provider access to it.
          </Text>
        )}

        <Card style={styles.card}>
          {!existingCustomer ? (
            <>
              <View style={styles.row}>
                <TextField style={styles.half} placeholder="First name" value={firstName} onChangeText={setFirstName} />
                <TextField style={styles.half} placeholder="Last name" value={lastName} onChangeText={setLastName} />
              </View>
              <TextField placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextField placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <TextField placeholder="Password (min 8 characters)" secureTextEntry value={password} onChangeText={setPassword} />

              {error && (
                <Text variant="small" style={styles.error}>
                  {error}
                </Text>
              )}

              <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((v) => !v)}>
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: termsAccepted ? colors.brand[600] : 'transparent' }]} />
                <Text variant="small" color="muted" style={styles.checkboxLabel}>
                  I agree to the{' '}
                  <Text variant="smallMedium" color="brand" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/terms`)}>
                    Terms
                  </Text>{' '}
                  &{' '}
                  <Text variant="smallMedium" color="brand" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/privacy`)}>
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>

              <Pressable style={styles.checkboxRow} onPress={() => setMarketingEmail((v) => !v)}>
                <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: marketingEmail ? colors.brand[600] : 'transparent' }]} />
                <Text variant="small" color="muted" style={styles.checkboxLabel}>
                  Email me occasional tips and offers. Optional — never affects booking updates.
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextField placeholder="Existing password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
              {error && (
                <Text variant="small" style={styles.error}>
                  {error}
                </Text>
              )}
            </>
          )}

          <Button onPress={handleSubmit} loading={submitting}>
            {existingCustomer ? 'Confirm & continue' : 'Sign up'}
          </Button>
        </Card>

        <Pressable style={styles.footerLink} onPress={() => router.replace('/login')}>
          <Text variant="small" color="muted">
            Already have an account? <Text variant="smallMedium" color="brand">Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 16 },
  h1: { fontSize: 24, lineHeight: 30 },
  card: { gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  checkboxLabel: { flex: 1 },
  error: { color: '#dc2626' },
  footerLink: { alignItems: 'center', marginTop: 4 },
});

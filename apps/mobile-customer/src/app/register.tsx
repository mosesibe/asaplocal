import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Screen, Card, Text, Button, TextField, useAppTheme, useBottomNavInset } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ApiError } from '@asaplocal/api-client';

async function openWebPage(path: string) {
  // Goes through the same base-URL resolution every request in this app
  // uses (production URL, or a dev override set from the Account screen)
  // rather than an ad-hoc process.env read with its own separate fallback
  // to localhost, out of sync with whatever the app was actually
  // configured to hit.
  const baseUrl = await api.getBaseUrl();
  WebBrowser.openBrowserAsync(`${baseUrl}${path}`);
}

// Ports apps/web/app/register/page.tsx. Terms/Privacy stay a single source
// of truth on web (opened in an in-app browser) rather than duplicated here
// — the current copy is explicitly a placeholder ("full legal terms are
// being finalised"), so copying it natively would just be another place for
// it to drift out of sync when it's rewritten for real.
export default function RegisterScreen() {
  const router = useRouter();
  const { callbackUrl } = useLocalSearchParams<{ callbackUrl?: string }>();
  const { login } = useSession();
  const { colors, spacing } = useAppTheme();
  const bottomInset = useBottomNavInset();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError('Enter your first and last name.');
    if (!email.includes('@')) return setError('Enter a valid email address.');
    if (!phone.trim()) return setError('Enter a phone number.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!termsAccepted) return setError('You must agree to the Terms & Privacy Policy.');

    setSubmitting(true);
    try {
      await api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email: email.trim(), phone: phone.trim(), password, termsAccepted, marketingEmail }),
      });
      // Email verification happens in the background — signing in
      // immediately matches web (isn't gated on clicking the email link).
      await login(email.trim(), password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [firstName, lastName, email, phone, password, termsAccepted, marketingEmail, login]);

  if (done) {
    return (
      <Screen style={styles.centered}>
        <View style={styles.doneBlock}>
          <Text variant="title" style={styles.doneTitle}>
            Check your inbox
          </Text>
          <Text variant="body" color="muted" style={styles.doneBody}>
            We've sent a verification link to {email}. You can confirm it anytime — no need to wait, let's get you
            started.
          </Text>
          <Button style={styles.continueButton} onPress={() => router.replace((callbackUrl as Href) ?? '/')}>
            Continue
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.scroll, { padding: spacing.four, paddingBottom: bottomInset }]} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.h1}>
          Create your account
        </Text>

        <Card style={styles.card}>
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
              <Text variant="smallMedium" color="brand" onPress={() => openWebPage('/terms')}>
                Terms
              </Text>{' '}
              &{' '}
              <Text variant="smallMedium" color="brand" onPress={() => openWebPage('/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </Pressable>

          <Pressable style={styles.checkboxRow} onPress={() => setMarketingEmail((v) => !v)}>
            <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: marketingEmail ? colors.brand[600] : 'transparent' }]} />
            <Text variant="small" color="muted" style={styles.checkboxLabel}>
              Email me occasional tips and offers. Optional — you can change this any time, and it never affects
              booking updates.
            </Text>
          </Pressable>

          <Button onPress={handleSubmit} loading={submitting}>
            Sign up
          </Button>
        </Card>

        <Pressable
          style={styles.footerLink}
          onPress={() => router.replace({ pathname: '/login', params: callbackUrl ? { callbackUrl } : undefined })}
        >
          <Text variant="small" color="muted">
            Already have an account? <Text variant="smallMedium" color="brand">Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
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
  doneBlock: { maxWidth: 340, alignItems: 'center', gap: 12 },
  doneTitle: { textAlign: 'center' },
  doneBody: { textAlign: 'center' },
  continueButton: { marginTop: 12, alignSelf: 'stretch' },
});

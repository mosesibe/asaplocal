import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Eye, EyeOff } from 'lucide-react-native';
import { Screen, Text } from '@asaplocal/ui-native';

import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { ApiError } from '@asaplocal/api-client';
import { AuthHero } from '@/components/AuthHero';
import { authStyles as s } from '@/components/auth-styles';

async function openWebPage(path: string) {
  // Goes through the same base-URL resolution every request in this app
  // uses (production URL, or a dev override set from the Account screen)
  // rather than an ad-hoc process.env read with its own separate fallback
  // to localhost, out of sync with whatever the app was actually
  // configured to hit.
  const baseUrl = await api.getBaseUrl();
  WebBrowser.openBrowserAsync(`${baseUrl}${path}`);
}

// Ports Claude Design variant "2c", same photo hero as /login. Terms/Privacy
// stay a single source of truth on web (opened in an in-app browser) rather
// than duplicated here.
export default function RegisterScreen() {
  const router = useRouter();
  const { callbackUrl } = useLocalSearchParams<{ callbackUrl?: string }>();
  const { login } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <Screen style={s.screen}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <AuthHero headline="Get help, booked in minutes." />

        <View style={s.card}>
          {done ? (
            <View style={s.doneWrap}>
              <View>
                <Text style={s.doneTitle}>Check your inbox</Text>
                <Text style={s.doneSubtitle}>We&apos;ve sent a verification link to {email}.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.submitButton, { marginLeft: 'auto', height: 44, paddingHorizontal: 20 }, pressed && s.submitButtonPressed]}
                onPress={() => router.replace((callbackUrl as Href) ?? '/')}
              >
                <Text style={[s.submitButtonText, { fontSize: 14 }]}>Continue</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.form}>
              <View style={s.row}>
                <TextInput style={[s.input, s.half]} placeholder="First name" placeholderTextColor="rgba(32,30,29,.4)" value={firstName} onChangeText={setFirstName} />
                <TextInput style={[s.input, s.half]} placeholder="Last name" placeholderTextColor="rgba(32,30,29,.4)" value={lastName} onChangeText={setLastName} />
              </View>
              <TextInput
                style={s.input}
                placeholder="Email"
                placeholderTextColor="rgba(32,30,29,.4)"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={s.input}
                placeholder="Phone number"
                placeholderTextColor="rgba(32,30,29,.4)"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={setPhone}
              />
              <View style={s.passwordWrap}>
                <TextInput
                  style={[s.input, s.passwordInput]}
                  placeholder="Password (min 8 characters)"
                  placeholderTextColor="rgba(32,30,29,.4)"
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeButton} hitSlop={8}>
                  {showPassword ? <EyeOff size={20} color="rgba(32,30,29,.6)" /> : <Eye size={20} color="rgba(32,30,29,.6)" />}
                </Pressable>
              </View>

              <Pressable style={s.checkboxRow} onPress={() => setTermsAccepted((v) => !v)}>
                <View style={[s.checkbox, termsAccepted && s.checkboxChecked]} />
                <Text style={s.checkboxLabel}>
                  I agree to the{' '}
                  <Text style={s.checkboxLink} onPress={() => openWebPage('/terms')}>
                    Terms
                  </Text>{' '}
                  &{' '}
                  <Text style={s.checkboxLink} onPress={() => openWebPage('/privacy')}>
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>

              <Pressable style={s.checkboxRow} onPress={() => setMarketingEmail((v) => !v)}>
                <View style={[s.checkbox, marketingEmail && s.checkboxChecked]} />
                <Text style={s.checkboxLabel}>
                  Email me occasional tips and offers. Optional — you can change this any time, and it never affects booking updates.
                </Text>
              </Pressable>

              {error && <Text style={s.error}>{error}</Text>}
              <Pressable style={({ pressed }) => [s.submitButton, pressed && s.submitButtonPressed]} onPress={handleSubmit} disabled={submitting}>
                {submitting && <ActivityIndicator size="small" color="#fff9f2" />}
                <Text style={s.submitButtonText}>{submitting ? 'Creating account…' : 'Sign up'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={s.trustRow}>
          <View style={s.avatarStack}>
            <View style={[s.avatar, { backgroundColor: '#ffe1d0' }]} />
            <View style={[s.avatar, { backgroundColor: '#e1eecc', marginLeft: -12 }]} />
            <View style={[s.avatar, { backgroundColor: '#dcd3c4', marginLeft: -12 }]} />
          </View>
          <Text style={s.trustText}>Vetted, reviewed and paid securely through AsapLocal.</Text>
        </View>

        <Pressable
          style={{ paddingHorizontal: 26, paddingTop: 20, paddingBottom: 30 }}
          onPress={() => router.replace({ pathname: '/login', params: callbackUrl ? { callbackUrl } : undefined })}
        >
          <Text style={s.footerText}>
            Already have an account? <Text style={s.footerLinkAccent}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

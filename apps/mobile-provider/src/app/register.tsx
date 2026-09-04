import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
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
  // rather than an ad-hoc process.env read with its own separate fallback.
  const baseUrl = await api.getBaseUrl();
  WebBrowser.openBrowserAsync(`${baseUrl}${path}`);
}

// Ports Claude Design variant "1a", same dark hero as /login. Includes the
// two-phase existing-customer merge: if the email already belongs to a
// customer account, the server responds 409 with code "EXISTING_CUSTOMER"
// instead of creating a new user, and the form re-submits with the
// account's existing password to add provider access to it (role stays
// CUSTOMER; see User.providerSince).
export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useSession();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    <Screen style={s.screen}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <AuthHero />

        <View style={s.body}>
          <Text style={s.h1}>{existingCustomer ? 'Welcome back.' : 'List your business.'}</Text>
          <Text style={s.subtitle}>
            {existingCustomer
              ? `You already have a customer account with ${email}. Confirm your password to add provider access to it.`
              : 'Get booked by your neighbours — join AsapLocal Business.'}
          </Text>

          <View style={s.form}>
            {!existingCustomer ? (
              <>
                <View style={s.row}>
                  <View style={s.half}>
                    <Text style={s.label}>First name</Text>
                    <TextInput style={s.input} placeholder="First name" placeholderTextColor="rgba(249,244,237,.35)" value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={s.half}>
                    <Text style={s.label}>Last name</Text>
                    <TextInput style={s.input} placeholder="Last name" placeholderTextColor="rgba(249,244,237,.35)" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>
                <View>
                  <Text style={s.label}>Email</Text>
                  <TextInput
                    style={s.input}
                    placeholder="you@yourbusiness.co.uk"
                    placeholderTextColor="rgba(249,244,237,.35)"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View>
                  <Text style={s.label}>Phone number</Text>
                  <TextInput
                    style={s.input}
                    placeholder="07…"
                    placeholderTextColor="rgba(249,244,237,.35)"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
                <View>
                  <Text style={s.label}>Password</Text>
                  <View style={s.passwordWrap}>
                    <TextInput
                      style={[s.input, s.passwordInput]}
                      placeholder="Min 8 characters"
                      placeholderTextColor="rgba(249,244,237,.35)"
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeButton} hitSlop={8}>
                      {showPassword ? <EyeOff size={20} color="rgba(249,244,237,.6)" /> : <Eye size={20} color="rgba(249,244,237,.6)" />}
                    </Pressable>
                  </View>
                </View>

                {error && <Text style={s.error}>{error}</Text>}

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
                    Email me product news, lead-generation tips and offers. Optional — job and payout emails are unaffected.
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View>
                  <Text style={s.label}>Password</Text>
                  <View style={s.passwordWrap}>
                    <TextInput
                      style={[s.input, s.passwordInput]}
                      placeholder="Your existing password"
                      placeholderTextColor="rgba(249,244,237,.35)"
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="current-password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <Pressable onPress={() => setShowConfirmPassword((v) => !v)} style={s.eyeButton} hitSlop={8}>
                      {showConfirmPassword ? <EyeOff size={20} color="rgba(249,244,237,.6)" /> : <Eye size={20} color="rgba(249,244,237,.6)" />}
                    </Pressable>
                  </View>
                </View>
                {error && <Text style={s.error}>{error}</Text>}
              </>
            )}

            <Pressable style={({ pressed }) => [s.submitButton, pressed && s.submitButtonPressed]} onPress={handleSubmit} disabled={submitting}>
              {submitting && <ActivityIndicator size="small" color="#fff9f2" />}
              <Text style={s.submitButtonText}>
                {submitting ? (existingCustomer ? 'Confirming…' : 'Creating account…') : existingCustomer ? 'Confirm and continue' : 'Sign up as a provider'}
              </Text>
            </Pressable>
          </View>

          {existingCustomer ? (
            <Pressable
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => {
                setExistingCustomer(false);
                setError(null);
              }}
            >
              <Text style={s.footerLink}>Use a different email instead</Text>
            </Pressable>
          ) : (
            <View style={s.footer}>
              <Pressable onPress={() => router.replace('/login')}>
                <Text style={s.footerText}>
                  Already listed? <Text style={s.footerLinkAccent}>Log in</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

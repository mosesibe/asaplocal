import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Eye, EyeOff, Check } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Screen, Text } from '@asaplocal/ui-native';

import { useSession } from '@/lib/session';
import { AuthHero } from '@/components/AuthHero';
import { authStyles as s } from '@/components/auth-styles';
import { signInWithGoogle, isGoogleSignInCancelled, signInWithApple, isAppleSignInAvailable } from '@/lib/social-auth';

// Ports Claude Design variant "2c — Full-bleed photo, card lifts over it":
// photo hero + card lifting over it, replacing the previous plain light
// card. Auth logic unchanged (useSession().login()).
export default function LoginScreen() {
  const router = useRouter();
  const { callbackUrl } = useLocalSearchParams<{ callbackUrl?: string }>();
  const { login, loginWithGoogle, loginWithApple } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const finishSignIn = useCallback(() => {
    setDone(true);
    router.replace((callbackUrl as Href) ?? '/');
  }, [callbackUrl, router]);

  const handleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      finishSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, finishSignIn]);

  const handleGoogleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const idToken = await signInWithGoogle();
      if (!idToken) return; // cancelled
      await loginWithGoogle(idToken);
      finishSignIn();
    } catch (e) {
      if (!isGoogleSignInCancelled(e)) setError(e instanceof Error ? e.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }, [loginWithGoogle, finishSignIn]);

  const handleAppleLogin = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithApple();
      if (!result) return; // cancelled
      await loginWithApple(result.identityToken, result.fullName);
      finishSignIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apple sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }, [loginWithApple, finishSignIn]);

  return (
    <Screen style={s.screen}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <AuthHero headline="Help, booked by this afternoon." />

        <View style={s.card}>
          {!done ? (
            <View style={s.form}>
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
              <View style={s.passwordWrap}>
                <TextInput
                  style={[s.input, s.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="rgba(32,30,29,.4)"
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={s.eyeButton} hitSlop={8}>
                  {showPassword ? <EyeOff size={20} color="rgba(32,30,29,.6)" /> : <Eye size={20} color="rgba(32,30,29,.6)" />}
                </Pressable>
              </View>
              {error && <Text style={s.error}>{error}</Text>}
              <Pressable style={({ pressed }) => [s.submitButton, pressed && s.submitButtonPressed]} onPress={handleLogin} disabled={submitting}>
                {submitting && <ActivityIndicator size="small" color="#fff9f2" />}
                <Text style={s.submitButtonText}>{submitting ? 'Logging in…' : 'Log in'}</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'center' }}>
                <Text style={s.footerLink}>Forgot password?</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.outlineButton, pressed && s.outlineButtonPressed]}
                onPress={handleGoogleLogin}
                disabled={submitting}
              >
                <Text style={s.outlineButtonText}>Continue with Google</Text>
              </Pressable>
              {isAppleSignInAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={999}
                  style={s.appleButton}
                  onPress={handleAppleLogin}
                />
              )}
            </View>
          ) : (
            <View style={s.doneWrap}>
              <View style={s.doneIcon}>
                <Check size={24} strokeWidth={2.75} color="#f9f4ed" />
              </View>
              <View>
                <Text style={s.doneTitle}>You&apos;re in</Text>
                <Text style={s.doneSubtitle}>Opening your bookings…</Text>
              </View>
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
          onPress={() => router.push({ pathname: '/register', params: callbackUrl ? { callbackUrl } : undefined })}
        >
          <Text style={s.footerText}>
            New here? <Text style={s.footerLinkAccent}>Create an account</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

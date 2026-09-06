import { Platform } from 'react-native';
import { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

let googleConfigured = false;

function ensureGoogleConfigured() {
  if (googleConfigured) return;
  // webClientId is what the backend verifies the idToken's `aud` against
  // (packages/auth/src/oauth-mobile.ts) — it must be the *Web* OAuth client,
  // not a mobile one, on both iOS and Android. iosClientId is only needed so
  // the native picker can present itself on iOS.
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  googleConfigured = true;
}

/** Returns the Google idToken to hand to useSession().loginWithGoogle, or null if the user cancelled. */
export async function signInWithGoogle(): Promise<string | null> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null; // cancelled
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('Google did not return an idToken.');
  return idToken;
}

export function isGoogleSignInCancelled(e: unknown): boolean {
  return isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS);
}

export const isAppleSignInAvailable = Platform.OS === 'ios';

/** Returns the Apple identityToken + one-time fullName to hand to useSession().loginWithApple, or null if the user cancelled. */
export async function signInWithApple(): Promise<{
  identityToken: string;
  fullName: { givenName?: string | null; familyName?: string | null } | null;
} | null> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credential.identityToken) throw new Error('Apple did not return an identityToken.');
    return { identityToken: credential.identityToken, fullName: credential.fullName };
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

import * as SecureStore from "expo-secure-store";

// expo-secure-store backs onto iOS Keychain / Android Keystore — appropriate
// for the refresh token (long-lived, high value) and the access token
// (short-lived, but stored alongside it for simplicity). Never AsyncStorage,
// which is unencrypted on-device.
const ACCESS_TOKEN_KEY = "asaplocal.accessToken";
const REFRESH_TOKEN_KEY = "asaplocal.refreshToken";

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setStoredTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}

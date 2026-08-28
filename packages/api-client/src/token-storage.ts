import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store backs onto iOS Keychain / Android Keystore — appropriate
// for the refresh token (long-lived, high value) and the access token
// (short-lived, but stored alongside it for simplicity). Never AsyncStorage,
// which is unencrypted on-device.
//
// Its web platform module is a stub (`export default {}` — no Keychain
// equivalent exists in a browser), so calling it there throws
// "getValueWithKeyAsync is not a function" rather than silently no-op-ing.
// localStorage is the pragmatic fallback for `expo start --web`, which only
// exists as a fast way to click through screens without a device — real
// users only ever hit the native path.
const ACCESS_TOKEN_KEY = "asaplocal.accessToken";
const REFRESH_TOKEN_KEY = "asaplocal.refreshToken";

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([getItem(ACCESS_TOKEN_KEY), getItem(REFRESH_TOKEN_KEY)]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setStoredTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, tokens.accessToken), setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}

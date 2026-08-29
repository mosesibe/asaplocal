import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store backs onto iOS Keychain / Android Keystore. Its web
// platform module is a stub (`export default {}` — no Keychain equivalent
// exists in a browser), so calling it there throws
// "getValueWithKeyAsync is not a function" rather than silently no-op-ing.
// localStorage is the pragmatic fallback for `expo start --web`, which only
// exists as a fast way to click through screens without a device — real
// users only ever hit the native path.
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

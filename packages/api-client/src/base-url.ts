import { getItem, setItem, deleteItem } from "./storage";

// Lets a dev/QA build point at a different backend (local, an ngrok tunnel,
// staging, production) without a full EAS rebuild — the build-time
// EXPO_PUBLIC_API_URL is just the default; this override, once set, wins.
// Deliberately not exposed in production builds' UI — see AccountScreen.
const OVERRIDE_KEY = "asaplocal.apiBaseUrlOverride";

export async function getApiBaseUrlOverride(): Promise<string | null> {
  return getItem(OVERRIDE_KEY);
}

export async function setApiBaseUrlOverride(url: string | null): Promise<void> {
  if (url && url.trim()) await setItem(OVERRIDE_KEY, url.trim().replace(/\/+$/, ""));
  else await deleteItem(OVERRIDE_KEY);
}

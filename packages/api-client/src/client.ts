import { getStoredTokens, setStoredTokens, clearStoredTokens } from "./token-storage";
import { getApiBaseUrlOverride, setApiBaseUrlOverride } from "./base-url";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/** Thrown when the refresh token itself is dead — the caller should send the user back to the login screen. */
export class SessionExpiredError extends Error {}

export interface MobileUser {
  id: string;
  email: string;
  role: "CUSTOMER" | "PROVIDER" | "DISPATCHER" | "ADMIN";
  status: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProvider: boolean;
  hasBusiness?: boolean;
}

// Concurrent 401s must not each fire their own refresh — the refresh token
// is single-use (see packages/auth/src/mobile-tokens.ts rotateMobileSession),
// so a second concurrent call would arrive with an already-rotated token and
// fail. Every caller awaits the same in-flight refresh instead.
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(baseUrl: string): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = await getStoredTokens();
    if (!tokens) throw new SessionExpiredError();

    const res = await fetch(`${baseUrl}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      await clearStoredTokens();
      throw new SessionExpiredError();
    }
    const next = (await res.json()) as { accessToken: string; refreshToken: string };
    await setStoredTokens(next);
    return next.accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function createApiClient(defaultBaseUrl: string) {
  // A per-environment default (baked in at build time via EXPO_PUBLIC_API_URL)
  // is rarely what you want once a build is actually installed on a device —
  // pointing the same dev-client build at local/ngrok/staging/production
  // without a rebuild is worth far more during testing. The stored override,
  // when present, always wins; see base-url.ts / the Account screen's env switcher.
  async function resolveBaseUrl(): Promise<string> {
    return (await getApiBaseUrlOverride()) ?? defaultBaseUrl;
  }

  async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
    const baseUrl = await resolveBaseUrl();
    const tokens = await getStoredTokens();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (tokens) headers.set("Authorization", `Bearer ${tokens.accessToken}`);

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (res.status === 401 && tokens && !isRetry) {
      await refreshAccessToken(baseUrl);
      return request<T>(path, init, true);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(body.message ?? "Request failed", res.status);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    request,

    async login(email: string, password: string, deviceInfo?: string): Promise<MobileUser> {
      const baseUrl = await resolveBaseUrl();
      const res = await fetch(`${baseUrl}/api/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceInfo }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(body.message ?? "Login failed", res.status);

      await setStoredTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return body.user as MobileUser;
    },

    async logout(): Promise<void> {
      const baseUrl = await resolveBaseUrl();
      const tokens = await getStoredTokens();
      await clearStoredTokens();
      if (!tokens) return;
      // Best-effort — the device is logged out locally regardless of whether
      // the server round-trip to revoke the row succeeds.
      await fetch(`${baseUrl}/api/mobile/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      }).catch(() => {});
    },

    async isLoggedIn(): Promise<boolean> {
      return (await getStoredTokens()) !== null;
    },

    /** Confirms a stored token pair still resolves to a live session — returns null if it doesn't (revoked, expired, or never logged in). */
    async me(): Promise<MobileUser | null> {
      if (!(await getStoredTokens())) return null;
      try {
        const { user } = await request<{ user: MobileUser }>("/api/mobile/auth/me");
        return user;
      } catch {
        await clearStoredTokens();
        return null;
      }
    },

    /** The default this client was created with — the "Reset" option in the env switcher UI. */
    defaultBaseUrl,
    getBaseUrl: resolveBaseUrl,
    setBaseUrlOverride: setApiBaseUrlOverride,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

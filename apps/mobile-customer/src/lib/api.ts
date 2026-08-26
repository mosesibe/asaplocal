import { createApiClient } from "@asaplocal/api-client";
export type { MobileUser } from "@asaplocal/api-client";

// EXPO_PUBLIC_* vars are inlined at build time (see .env.example) — set to
// business.asaplocal.pro's counterpart for the provider app, asaplocal.pro
// for this one. Falls back to the local web dev server (apps/web runs on
// :3000) so `expo start` works against `pnpm dev` out of the box.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = createApiClient(API_URL);

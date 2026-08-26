import { createApiClient } from "@asaplocal/api-client";
export type { MobileUser } from "@asaplocal/api-client";

// EXPO_PUBLIC_* vars are inlined at build time (see .env.example) — points
// at business.asaplocal.pro in production. Falls back to the local provider
// dev server (apps/provider runs on :3001) so `expo start` works against
// `pnpm dev` out of the box.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = createApiClient(API_URL);

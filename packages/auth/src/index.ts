/// <reference path="./types.d.ts" />

export { handlers, signIn, signOut } from "./auth";
export { auth } from "./bearer";
export * from "./auth.config";
export * from "./rbac";
export * from "./mobile-tokens";
export * from "./credentials";
export * from "./oauth-mobile";
// google-verify.ts is deliberately NOT re-exported here: google-auth-library
// (via gcp-metadata) imports Node's `node:process` using the explicit
// "node:" scheme, which the Edge runtime bundler middleware.ts pulls this
// barrel into can't handle at all (unlike a bare `require("process")`) — see
// the route handlers importing it directly from "@asaplocal/auth/src/google-verify".

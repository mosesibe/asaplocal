import type { Role, UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: UserStatus;
      // Named isEmailVerified/isPhoneVerified (not emailVerified/phoneVerified)
      // to avoid colliding with Auth.js's own adapter-aware
      // `emailVerified: Date` typing on Session.user.
      isEmailVerified: boolean;
      isPhoneVerified: boolean;
      // True once this account has provider access — role === "PROVIDER",
      // or an existing customer confirmed their password to add a business
      // (role stays "CUSTOMER" in that case; see User.providerSince).
      isProvider: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
    status: UserStatus;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isProvider: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: Role;
    status: UserStatus;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isProvider: boolean;
  }
}

import { headers } from "next/headers";
import { prisma } from "@asaplocal/db";

export type LoginChannel = "web" | "mobile";

/**
 * Appends a login to the audit log. `User.lastLoginAt` only holds the most
 * recent login, so this is the history the admin provider page charts —
 * one `auth.login` row per sign-in, with the method, host and device.
 * Best-effort: a failure here must never block the sign-in itself.
 */
export async function recordLogin(userId: string, opts: { channel: LoginChannel; method?: string; deviceInfo?: string }) {
  let ipAddress: string | undefined;
  let userAgent: string | undefined;
  let host: string | undefined;
  try {
    const h = await headers();
    ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
    userAgent = h.get("user-agent") ?? undefined;
    host = h.get("host") ?? undefined;
  } catch {
    // Called outside a request scope — record the login without request details.
  }

  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        action: "auth.login",
        targetType: "User",
        targetId: userId,
        metadata: { channel: opts.channel, method: opts.method ?? null, host: host ?? null, deviceInfo: opts.deviceInfo ?? null },
        ipAddress,
        userAgent,
      },
    }),
  ]).catch(() => {});
}

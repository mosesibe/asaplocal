import { randomBytes } from "crypto";
import { prisma } from "@asaplocal/db";
import { sendEmail, emailTemplates } from "./email";

const TOKEN_TTL_MS = 24 * 3600 * 1000;

export async function createAndSendVerificationEmail(
  user: { email: string },
  appUrl: string,
  subject = "Verify your AsapLocal account"
) {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  const link = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
  await sendEmail({ to: user.email, subject, ...emailTemplates.verifyEmail(link) }).catch(() => {});
}

export async function consumeEmailVerificationToken(email: string, token: string) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.identifier !== email) return { ok: false as const, reason: "invalid" as const };
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    return { ok: false as const, reason: "expired" as const };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false as const, reason: "invalid" as const };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        ...(user.role === "CUSTOMER" && user.status === "PENDING_VERIFICATION" ? { status: "ACTIVE" as const } : {}),
      },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);
  return { ok: true as const };
}

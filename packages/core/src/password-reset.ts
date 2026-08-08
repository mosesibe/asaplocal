import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@asaplocal/db";
import { sendEmail, emailTemplates } from "./email";

const TOKEN_TTL_MS = 60 * 60 * 1000;

/** Always resolves — never reveals whether the email belongs to an account. */
export async function createAndSendPasswordResetEmail(email: string, appUrl: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return; // no account, or OAuth-only — nothing to reset

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await sendEmail({ to: email, subject: "Reset your AsapLocal password", html: emailTemplates.passwordReset(link) }).catch(() => {});
}

export async function consumePasswordResetToken(email: string, token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token }, include: { user: true } });
  if (!record || record.user.email !== email) return { ok: false as const, reason: "invalid" as const };
  if (record.expires < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
    return { ok: false as const, reason: "expired" as const };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  return { ok: true as const };
}

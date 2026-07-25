import { prisma } from "@asaplocal/db";

export async function getCustomerAccountStats(userId: string) {
  const [spend, servicesRequested] = await Promise.all([
    prisma.payment.aggregate({ where: { userId, status: "SUCCEEDED" }, _sum: { amountPence: true } }),
    prisma.jobRequest.count({ where: { customerId: userId } }),
  ]);
  return {
    totalSpentPence: spend._sum.amountPence ?? 0,
    servicesRequested,
  };
}

export function getSignInMethods(user: { passwordHash: string | null }, accounts: { provider: string }[]) {
  const methods: string[] = [];
  if (user.passwordHash) methods.push("Email & password");
  for (const a of accounts) {
    if (a.provider === "google") methods.push("Google");
  }
  return methods;
}

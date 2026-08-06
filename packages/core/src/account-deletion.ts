import { prisma } from "@asaplocal/db";

export async function requestAccountDeletion(userId: string, reason?: string) {
  const existing = await prisma.accountDeletionRequest.findFirst({ where: { userId, status: "PENDING" } });
  if (existing) return existing;
  return prisma.accountDeletionRequest.create({ data: { userId, reason: reason?.trim() || null } });
}

export async function resolveAccountDeletionRequest(
  requestId: string,
  reviewedById: string,
  decision: "APPROVED" | "REJECTED",
  reviewNote?: string
) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.accountDeletionRequest.findUniqueOrThrow({ where: { id: requestId } });

    await tx.accountDeletionRequest.update({
      where: { id: requestId },
      data: { status: decision, reviewedById, reviewedAt: new Date(), reviewNote },
    });

    if (decision === "APPROVED") {
      await tx.user.update({ where: { id: request.userId }, data: { status: "DEACTIVATED" } });
    }

    return request;
  });
}

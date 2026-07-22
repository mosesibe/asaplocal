import { prisma, type NotificationType } from "@asaplocal/db";

export async function notify(userId: string, type: NotificationType, title: string, body?: string, link?: string) {
  await prisma.notification.create({ data: { userId, type, title, body, link } });
}

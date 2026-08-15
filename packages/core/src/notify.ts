import { prisma, type NotificationType } from "@asaplocal/db";
import { publishNotification } from "./pusher";
import { sendPushToUser } from "./push";

export async function notify(userId: string, type: NotificationType, title: string, body?: string, link?: string) {
  const notification = await prisma.notification.create({ data: { userId, type, title, body, link } });

  await Promise.all([
    publishNotification(userId, notification).catch(() => {}),
    sendPushToUser(userId, { id: notification.id, title, body, link }).catch(() => {}),
  ]);

  return notification;
}

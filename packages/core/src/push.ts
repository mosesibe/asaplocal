import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@asaplocal/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@asaplocal.pro", vapidPublicKey, vapidPrivateKey);
}

const expo = new Expo();

export interface PushPayload {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

// Sends to both channels a user might have registered: web-push
// (PushSubscription, browser) and Expo (MobilePushToken, the native apps).
// The native apps' registration (POST /api/mobile/push/register) had never
// been wired to any actual send path before this — tokens were stored but
// nothing ever used them.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  await Promise.all([sendWebPush(userId, payload), sendExpoPush(userId, payload)]);
}

async function sendWebPush(userId: string, payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}

async function sendExpoPush(userId: string, payload: PushPayload) {
  const tokens = await prisma.mobilePushToken.findMany({ where: { userId } });
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body ?? undefined,
      data: { id: payload.id, link: payload.link ?? undefined },
      sound: "default",
    }));
  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  const deadTokens: string[] = [];

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt, i) => {
        // DeviceNotRegistered is Expo's signal the token is no longer valid
        // (app uninstalled, or re-registered under a different token).
        const message = chunk[i];
        if (message && receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
          deadTokens.push(message.to as string);
        }
      });
    } catch {
      // best-effort — a failed chunk shouldn't block the others or the caller
    }
  }

  if (deadTokens.length > 0) {
    await prisma.mobilePushToken.deleteMany({ where: { token: { in: deadTokens } } }).catch(() => {});
  }
}

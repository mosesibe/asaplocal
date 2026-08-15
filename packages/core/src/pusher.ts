import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID ?? "",
  key: process.env.PUSHER_KEY ?? "",
  secret: process.env.PUSHER_SECRET ?? "",
  cluster: process.env.PUSHER_CLUSTER ?? "eu",
  useTLS: true,
});

export function conversationChannel(conversationId: string) {
  return `private-conversation-${conversationId}`;
}

export async function publishMessage(conversationId: string, event: string, payload: unknown) {
  await pusherServer.trigger(conversationChannel(conversationId), event, payload);
}

export function userChannel(userId: string) {
  return `private-user-${userId}`;
}

export async function publishNotification(userId: string, notification: unknown) {
  await pusherServer.trigger(userChannel(userId), "notification", notification);
}

export function bookingChannel(bookingId: string) {
  return `private-booking-${bookingId}`;
}

export async function publishBookingUpdate(bookingId: string, event: string, payload: unknown) {
  await pusherServer.trigger(bookingChannel(bookingId), event, payload);
}

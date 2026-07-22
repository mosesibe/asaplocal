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

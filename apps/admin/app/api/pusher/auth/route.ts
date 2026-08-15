import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { pusherServer } from "@asaplocal/core";

/** Authorizes access to private-user-<id> channels — a user may only subscribe to their own. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const socketId = form.get("socket_id") as string;
  const channel = form.get("channel_name") as string;

  if (channel !== `private-user-${session.user.id}`) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(pusherServer.authorizeChannel(socketId, channel));
}

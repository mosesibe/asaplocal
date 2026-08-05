import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, askAiBuddy } from "@asaplocal/core";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(500),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  try {
    await checkRateLimit("ai-buddy-chat", ip, 20, 300);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const result = await askAiBuddy(parsed.data.messages);
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@asaplocal/auth";
import { checkRateLimit, sendEmail, emailTemplates } from "@asaplocal/core";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  summary: z.string().trim().min(1).max(2000),
  toolkit: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  steps: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  // This endpoint sends mail to a caller-supplied address, so it's a spam
  // relay if left open. Kept deliberately tight, and limited by recipient as
  // well as by IP so one address can't be flooded from rotating IPs.
  try {
    await checkRateLimit("ai-buddy-email-ip", ip, 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const { email, summary, toolkit, steps } = parsed.data;

  try {
    await checkRateLimit("ai-buddy-email-to", email.toLowerCase(), 5, 3600);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 429 });
  }

  // Signed-in users can only send to themselves; anonymous visitors supply an
  // address, which is the point (it's how they get the guide at all).
  const session = await auth();
  if (session?.user?.email && session.user.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ message: "You can only email this to your own address." }, { status: 403 });
  }

  const ctaUrl = `${process.env.NEXT_PUBLIC_WEB_URL ?? ""}/jobs/new`;
  try {
    await sendEmail({
      to: email,
      subject: "Your fix guide from AsapLocal AI Buddy",
      ...emailTemplates.diyFixGuide({ summary, toolkit, steps, ctaUrl }),
    });
  } catch {
    return NextResponse.json({ message: "Couldn't send that email — please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

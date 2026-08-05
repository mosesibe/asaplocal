import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 422 });

  const profile = await prisma.profile.update({
    where: { userId: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ profile });
}

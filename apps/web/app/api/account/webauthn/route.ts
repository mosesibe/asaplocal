import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await prisma.authenticator.deleteMany({ where: { userId: session.user.id } });
  return NextResponse.json({ removed: true });
}

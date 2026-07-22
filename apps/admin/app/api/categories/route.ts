import { NextRequest, NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.length < 2) return NextResponse.json({ message: "Invalid name" }, { status: 422 });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = await prisma.category.create({ data: { name, slug } });
  return NextResponse.json({ category }, { status: 201 });
}

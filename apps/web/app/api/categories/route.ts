import { NextResponse } from "next/server";
import { prisma } from "@asaplocal/db";

// Used by the mobile app's job-posting form and by the anonymous-browsing
// Home screen — the web app fetches this directly via Prisma in the
// /jobs/new server component instead. No auth gate: this is public catalog
// data (names/icons only), and the Home screen needs it before login.
export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, parentId: true, icon: true },
  });
  return NextResponse.json({ categories });
}

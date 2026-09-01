import { NextResponse } from "next/server";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";

// Feeds the mobile app's account menu (AccountMenu.tsx) — the profile
// header + trust/verification badges it shows above the nav sections.
// Mirrors apps/provider/app/layout.tsx's own `account` query 1:1 (same
// three Prisma reads, same derived fields), since that's server-rendered
// straight into ProviderShell/AccountDrawer on web with no JSON endpoint
// to reuse.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [profile, business, user] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id }, select: { firstName: true, lastName: true, avatarUrl: true, city: true } }),
    prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: { name: true, city: true, verificationStatus: true, trustTier: true, businessType: true },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } }),
  ]);

  return NextResponse.json({
    name: profile ? `${profile.firstName} ${profile.lastName}` : (business?.name ?? session.user.email ?? ""),
    email: session.user.email ?? "",
    phone: user?.phone ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    city: business?.city ?? profile?.city ?? "",
    verificationStatus: business?.verificationStatus ?? "UNVERIFIED",
    trustTier: business?.trustTier ?? "BRONZE",
    isEmailVerified: session.user.isEmailVerified,
    isPhoneVerified: session.user.isPhoneVerified,
    canHaveStaff: canHaveStaff(business?.businessType),
  });
}

import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { AccountIdentityCard } from "@/components/account-identity-card";
import { DeleteAccountSection } from "@/components/delete-account-section";
// TEMPORARY — SMS sender-ID testing; remove with the component (see its header).
import { PhoneReverifySection } from "@/components/phone-reverify-section";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold">Account settings</h1>
      <p className="mt-1 text-muted-foreground">Your personal account details — separate from your public business profile.</p>

      <AccountIdentityCard
        firstName={profile?.firstName ?? ""}
        lastName={profile?.lastName ?? ""}
        avatarUrl={profile?.avatarUrl ?? null}
        email={user.email}
        emailVerified={!!user.emailVerified}
        phone={user.phone}
        phoneVerified={!!user.phoneVerifiedAt}
        memberSince={user.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      />

      <PhoneReverifySection phone={user.phone} />

      <DeleteAccountSection />
    </div>
  );
}

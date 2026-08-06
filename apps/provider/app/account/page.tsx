import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card } from "@asaplocal/ui";
import { DeleteAccountSection } from "@/components/delete-account-section";

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

      <Card className="mt-6 max-w-lg divide-y divide-border p-0">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{profile ? `${profile.firstName} ${profile.lastName}` : "—"}</p>
          </div>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <Badge variant={user.emailVerified ? "success" : "warning"}>{user.emailVerified ? "Verified" : "Unverified"}</Badge>
        </div>
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{user.phone ?? "—"}</p>
          </div>
          {user.phone && <Badge variant={user.phoneVerifiedAt ? "success" : "warning"}>{user.phoneVerifiedAt ? "Verified" : "Unverified"}</Badge>}
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Member since</p>
          <p className="font-medium">{user.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { canHaveStaff } from "@asaplocal/core";
import { StaffForm } from "../staff-form";

export default async function NewStaffPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");
  if (!canHaveStaff(business.businessType)) redirect("/staff");

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Add a staff member</h1>
      <div className="mt-6">
        <StaffForm />
      </div>
    </div>
  );
}

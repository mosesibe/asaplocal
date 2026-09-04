import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { VerifyForm } from "./verify-form";

export default async function VerifyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });

  return <VerifyForm initialPhone={user?.phone ?? ""} />;
}

import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";

export default async function AdminRootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(session.user.role === "DISPATCHER" ? "/dispatcher" : "/dashboard");
}

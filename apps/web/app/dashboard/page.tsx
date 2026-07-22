import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, formatPence } from "@asaplocal/ui";

export default async function CustomerDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/dashboard");

  const [bookings, jobRequests, favouritesCount] = await Promise.all([
    prisma.booking.findMany({ where: { customerId: session.user.id }, include: { business: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.jobRequest.findMany({ where: { customerId: session.user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.favourite.count({ where: { customerId: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">My account</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Open job requests</h2>
            <Link href="/jobs/new" className="text-sm text-brand-700 hover:underline">Post another →</Link>
          </div>
          <div className="space-y-3">
            {jobRequests.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`}>
                <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{j.title}</span>
                  <Badge variant="outline" className="w-fit">{j.status.replace("_", " ")}</Badge>
                </Card>
              </Link>
            ))}
            {jobRequests.length === 0 && <p className="text-sm text-muted-foreground">No job requests yet.</p>}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent bookings</h2>
          <div className="space-y-3">
            {bookings.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{b.business.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPence(b.totalAmountPence)}</p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </Card>
              </Link>
            ))}
            {bookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
          </div>
        </section>
      </div>
      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/favourites" className="text-brand-700 hover:underline">{favouritesCount} favourites →</Link>
        <Link href="/messages" className="text-brand-700 hover:underline">Messages →</Link>
      </div>
    </div>
  );
}

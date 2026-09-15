import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, buttonVariants } from "@asaplocal/ui";
import { studioDesignTitle, studioStatusLabel, toStudioSessionView } from "@/lib/studio-session";

export const metadata: Metadata = { title: "My designs | AsapLocal" };

export default async function MyDesignsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/studio/designs");

  const rows = await prisma.designStudioSession.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { jobRequest: { select: { id: true, title: true, status: true } } },
  });
  const designs = rows.map((row) => toStudioSessionView(row));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/studio" className="text-sm text-muted-foreground hover:underline">
        ← Redesign Studio
      </Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My designs</h1>
          <p className="mt-1 text-muted-foreground">
            Every Redesign Studio session you&apos;ve run is kept here, so you can look back at the designs and get
            quotes whenever you&apos;re ready.
          </p>
        </div>
        <Link href="/studio" className={buttonVariants()}>
          New design
        </Link>
      </div>

      {designs.length === 0 ? (
        <Card className="mt-6 p-6 text-center">
          <h2 className="font-semibold">No designs yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Photograph a room, loft or garden and see it redesigned.</p>
          <Link href="/studio" className={`${buttonVariants()} mt-4`}>
            Create your first design
          </Link>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => {
            const rendered = design.concepts.flatMap((c) => (c.url ? [c.url] : []));
            const cover = rendered[0] ?? design.heroPhotoUrl;
            return (
              <Link
                key={design.id}
                href={`/studio/designs/${design.id}`}
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Card className="h-full overflow-hidden p-0 transition-shadow group-hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                    <Badge variant={design.status === "POSTED" ? "success" : "secondary"} className="absolute left-2 top-2">
                      {studioStatusLabel(design)}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold">{studioDesignTitle(design)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {new Date(design.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}
                      {rendered.length} design{rendered.length === 1 ? "" : "s"}
                    </p>
                    {rendered.length > 1 && (
                      <div className="mt-3 flex gap-1.5">
                        {rendered.map((url) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="h-10 w-14 rounded-md border border-border object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

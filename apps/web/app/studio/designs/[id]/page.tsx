import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, Card, ImageGallery } from "@asaplocal/ui";
import { RedesignStudio } from "@/components/redesign-studio";
import { studioDesignTitle, studioStatusLabel, toStudioSessionView } from "@/lib/studio-session";

export const metadata: Metadata = { title: "Your design | AsapLocal" };

export default async function StudioDesignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/studio/designs/${id}`);

  const row = await prisma.designStudioSession.findUnique({
    where: { id },
    include: { jobRequest: { select: { id: true, title: true, status: true } } },
  });
  if (!row || row.customerId !== session.user.id) notFound();
  const design = toStudioSessionView(row);

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, parentId: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/studio/designs" className="text-sm text-muted-foreground hover:underline">
        ← All my designs
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{studioDesignTitle(design)}</h1>
          <p className="text-sm text-muted-foreground">
            Created {new Date(design.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Badge variant={design.status === "POSTED" ? "success" : "secondary"} className="shrink-0">
          {studioStatusLabel(design)}
        </Badge>
      </div>

      <Card className="mt-6 space-y-4 p-5">
        {design.summary && <p className="text-sm text-muted-foreground">{design.summary}</p>}
        {design.sourcePhotos.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your photos</p>
            <ImageGallery images={design.sourcePhotos} label="Your photos of the space" className="mt-2" />
          </div>
        )}
        {design.briefText && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What you asked for</p>
            <p className="mt-1 text-sm">{design.briefText}</p>
          </div>
        )}
        {design.job && (
          <p className="text-sm">
            Posted as a job:{" "}
            <Link href={`/jobs/${design.job.id}`} className="font-medium text-brand-600 hover:underline">
              {design.job.title}
            </Link>
          </p>
        )}
      </Card>

      <div className="mt-6">
        <RedesignStudio categories={categories} initialSession={design} />
      </div>
    </div>
  );
}

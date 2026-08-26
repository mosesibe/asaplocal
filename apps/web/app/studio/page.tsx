import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@asaplocal/db";
import { auth } from "@asaplocal/auth";
import { Button } from "@asaplocal/ui";
import { RedesignStudio } from "@/components/redesign-studio";

export const metadata: Metadata = {
  title: "Redesign Studio — see what your space could look like | AsapLocal",
  description:
    "Photograph any room, loft, garage or garden and get AI redesign concepts with realistic UK costs and timescales — then get quotes from verified local pros.",
};

export default async function StudioPage() {
  const session = await auth();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true, parentId: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">See what your space could be</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          That awkward corner, the loft you only use for storage, a kitchen that needs rethinking — take a photo
          and see it redesigned, with a realistic idea of cost and timescale.
        </p>
      </div>

      <div className="mt-8">
        {session?.user ? (
          <RedesignStudio categories={categories} />
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 text-center">
            <h2 className="font-semibold">Sign in to start designing</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Designs are free — you get three every month. We ask you to sign in so we can keep them for you.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/login?callbackUrl=/studio">
                <Button className="w-full sm:w-auto">Log in</Button>
              </Link>
              <Link href="/register?callbackUrl=/studio">
                <Button variant="outline" className="w-full sm:w-auto">
                  Create an account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { StarRating } from "@asaplocal/ui";
import { RespondForm } from "./respond-form";

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { ownerId: session.user.id } });
  if (!business) redirect("/onboarding");

  const reviews = await prisma.review.findMany({
    where: { businessId: business.id, status: { in: ["PUBLISHED", "FLAGGED"] } },
    orderBy: { createdAt: "desc" },
    include: { author: { include: { profile: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Reviews ({business.reviewCount})</h1>
      <div className="mt-6 space-y-5">
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-border pb-5">
            <div className="flex items-center justify-between">
              <p className="font-medium">{r.author.profile?.firstName} {r.author.profile?.lastName?.[0]}.</p>
              <StarRating rating={r.rating} size={14} />
            </div>
            {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
            {r.providerResponse ? (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                <p className="mb-1 font-medium">Your response</p>
                <p className="text-muted-foreground">{r.providerResponse}</p>
              </div>
            ) : (
              <RespondForm reviewId={r.id} />
            )}
          </div>
        ))}
        {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet.</p>}
      </div>
    </div>
  );
}

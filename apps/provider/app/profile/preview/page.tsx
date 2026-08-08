import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@asaplocal/auth";
import { prisma } from "@asaplocal/db";
import { Badge, buttonVariants, Card, StarRating, formatPence } from "@asaplocal/ui";
import { BadgeCheck, MapPin, Briefcase, Clock, ExternalLink } from "lucide-react";
import { computeBadges } from "@asaplocal/core";

export default async function ProfilePreviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { ownerId: session.user.id },
    include: {
      services: { where: { isActive: true }, include: { category: true } },
      identityVerification: true,
      insurancePolicies: true,
      qualifications: true,
    },
  });
  if (!business) redirect("/onboarding");

  const badges = computeBadges(business);
  const liveUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/providers/${business.slug}?preview=1`;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Preview your listing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A rough approximation of your public profile — open the live version for the exact customer view.
          </p>
        </div>
        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "w-full shrink-0 gap-1.5 sm:w-auto" })}>
          Open live preview <ExternalLink size={14} />
        </a>
      </div>

      <Card className="max-w-3xl overflow-hidden p-0">
        <div className="relative h-40 w-full bg-muted sm:h-56">
          {business.coverImageUrl && <Image src={business.coverImageUrl} alt="" fill className="object-cover" />}
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="relative -mt-16 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-surface bg-muted shadow-lg">
              {business.logoUrl && <Image src={business.logoUrl} alt={business.name} fill className="object-cover" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{business.name}</h2>
                {business.isFeatured && <Badge variant="warning">Featured</Badge>}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin size={14} /> {business.city} · serves {business.baseRadiusMiles} mile radius
              </p>
              <div className="mt-2">
                <StarRating rating={Number(business.avgRating)} count={business.reviewCount} />
              </div>
              {badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <Badge key={b.key} variant="success" className="gap-1">
                      <BadgeCheck size={14} /> {b.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border p-3 text-center">
              <Briefcase className="mx-auto mb-1 text-brand-600" size={16} />
              <p className="font-semibold">{business.completedJobsCount}</p>
              <p className="text-xs text-muted-foreground">Jobs completed</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <Clock className="mx-auto mb-1 text-brand-600" size={16} />
              <p className="font-semibold">{business.avgResponseMins ?? "—"}m</p>
              <p className="text-xs text-muted-foreground">Avg. response</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="font-semibold">{Number(business.responseRatePct)}%</p>
              <p className="text-xs text-muted-foreground">Response rate</p>
            </div>
            <div className="rounded-xl border border-border p-3 text-center">
              <p className="font-semibold">{business.yearsInBusiness ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Years trading</p>
            </div>
          </div>

          <section className="mt-6">
            <h3 className="mb-2 font-semibold">About</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{business.description}</p>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 font-semibold">Services &amp; pricing</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {business.services.map((s) => (
                <div key={s.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{s.title}</p>
                    <Badge variant="outline">{s.category.name}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">
                    {s.priceType === "QUOTE_ONLY"
                      ? "Quote on request"
                      : `${formatPence(s.priceMinPence ?? 0)}${s.priceMaxPence ? ` – ${formatPence(s.priceMaxPence)}` : ""}${s.priceType === "HOURLY" ? " / hr" : ""}`}
                  </p>
                </div>
              ))}
              {business.services.length === 0 && <p className="text-sm text-muted-foreground">No services listed yet.</p>}
            </div>
          </section>
        </div>
      </Card>
    </div>
  );
}

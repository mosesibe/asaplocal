import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@asaplocal/db";
import { auth } from "@asaplocal/auth";
import { Badge, Card, StarRating, formatPence } from "@asaplocal/ui";
import { BadgeCheck, MapPin, Clock, Briefcase, ChevronLeft, Building2, Wrench, Images as ImagesIcon, ShieldCheck } from "lucide-react";
import { computeBadges, milesBetween, businessTypeLabel } from "@asaplocal/core";
import { ReviewList } from "@/components/review-list";
import { QuoteRequestButton } from "@/components/quote-request-button";
import { SaveButton } from "@/components/save-button";
import { ShareButton } from "@/components/share-button";
import { ProviderCard } from "@/components/provider-card";

const NEARBY_RADIUS_MILES = 25;
const DAY_LABELS: { key: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const NAV_ITEMS = [
  { id: "details", label: "Details" },
  { id: "services", label: "Categories & services" },
  { id: "skills", label: "Skills" },
  { id: "reviews", label: "Reviews" },
  { id: "company-info", label: "Company info" },
  { id: "photos", label: "Photos" },
];

async function getBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      services: { where: { isActive: true }, include: { category: true } },
      serviceAreas: true,
      reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { include: { profile: true } } } },
      identityVerification: true,
      insurancePolicies: true,
      qualifications: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) return {};
  const title = `${biz.name} — ${biz.city} | AsapLocal`;
  const description = biz.description?.slice(0, 155) ?? `${biz.name}, a trusted local service provider in ${biz.city}.`;
  return {
    title,
    description,
    openGraph: { title, description, images: biz.coverImageUrl ? [biz.coverImageUrl] : [], type: "profile" },
    alternates: { canonical: `/providers/${biz.slug}` },
  };
}

export default async function ProviderProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const biz = await getBusiness(slug);
  if (!biz) notFound();

  // The provider app links here with ?preview=1 so an owner checking their
  // own listing doesn't inflate their own profile view count.
  if (preview !== "1") {
    await prisma.business.update({ where: { id: biz.id }, data: { profileViews: { increment: 1 } } }).catch(() => {});
  }

  const session = await auth();
  const isFavourited = session?.user
    ? !!(await prisma.favourite.findUnique({ where: { customerId_businessId: { customerId: session.user.id, businessId: biz.id } } }))
    : false;

  const primaryCategorySlug = biz.services[0]?.category.slug;
  const similarBusinessesRaw = await prisma.business.findMany({
    where: {
      id: { not: biz.id },
      verificationStatus: { in: ["VERIFIED", "PENDING"] },
      ...(primaryCategorySlug ? { services: { some: { isActive: true, category: { slug: primaryCategorySlug } } } } : { city: biz.city }),
    },
    include: { services: { where: { isActive: true }, include: { category: true }, take: 1 } },
    orderBy: [{ isFeatured: "desc" }, { avgRating: "desc" }],
    take: 20,
  });
  const similarBusinesses = similarBusinessesRaw
    .filter((b) => milesBetween(Number(biz.lat), Number(biz.lng), Number(b.lat), Number(b.lng)) <= NEARBY_RADIUS_MILES)
    .slice(0, 6);

  const badges = computeBadges(biz);
  const workingHours = (biz.workingHours as Record<string, { open: string; close: string } | null> | null) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    description: biz.description,
    image: biz.logoUrl ?? undefined,
    address: { "@type": "PostalAddress", addressLocality: biz.city, postalCode: biz.postcode ?? undefined, addressCountry: biz.country },
    geo: { "@type": "GeoCoordinates", latitude: Number(biz.lat), longitude: Number(biz.lng) },
    aggregateRating:
      biz.reviewCount > 0
        ? { "@type": "AggregateRating", ratingValue: Number(biz.avgRating), reviewCount: biz.reviewCount }
        : undefined,
  };

  return (
    <div>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="relative h-56 w-full bg-muted sm:h-72">
        {biz.coverImageUrl && <Image src={biz.coverImageUrl} alt="" fill className="object-cover" priority />}
        <Link
          href="/search"
          aria-label="Back to search"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm md:hidden"
        >
          <ChevronLeft size={22} />
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative -mt-16 h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-surface bg-muted shadow-lg">
              {biz.logoUrl && <Image src={biz.logoUrl} alt={biz.name} fill className="object-cover" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{biz.name}</h1>
                {biz.isFeatured && <Badge variant="warning">Featured</Badge>}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /> {biz.city} · serves {biz.baseRadiusMiles} mile radius</p>
              <div className="mt-2"><StarRating rating={Number(biz.avgRating)} count={biz.reviewCount} /></div>
              {badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {badges.map((b) => (
                    <Badge key={b.key} variant="success" className="gap-1"><BadgeCheck size={14} /> {b.label}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <SaveButton businessId={biz.id} initialSaved={isFavourited} isLoggedIn={!!session?.user} loginUrl={`/login?callbackUrl=/providers/${biz.slug}`} />
            <ShareButton title={biz.name} text={`${biz.name} on AsapLocal — ${biz.city}`} />
            <QuoteRequestButton businessId={biz.id} businessName={biz.name} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4 text-center"><Briefcase className="mx-auto mb-1 text-brand-600" size={18} /><p className="text-lg font-semibold">{biz.completedJobsCount}</p><p className="text-xs text-muted-foreground">Jobs completed</p></Card>
          <Card className="p-4 text-center"><Clock className="mx-auto mb-1 text-brand-600" size={18} /><p className="text-lg font-semibold">{biz.avgResponseMins ?? "—"}m</p><p className="text-xs text-muted-foreground">Avg. response</p></Card>
          <Card className="p-4 text-center"><p className="text-lg font-semibold">{Number(biz.responseRatePct)}%</p><p className="text-xs text-muted-foreground">Response rate</p></Card>
          <Card className="p-4 text-center"><p className="text-lg font-semibold">{biz.yearsInBusiness ?? "—"}</p><p className="text-xs text-muted-foreground">Years trading</p></Card>
        </div>

        <nav className="sticky top-16 z-30 -mx-4 mt-8 overflow-x-auto border-b border-border bg-surface/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex gap-1 whitespace-nowrap">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-brand-300 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        <section id="details" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 text-xl font-semibold">Details</h2>
          <p className="whitespace-pre-line text-muted-foreground">{biz.description}</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {workingHours && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Working hours</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {DAY_LABELS.map(({ key, label }) => {
                    const hours = workingHours[key];
                    return (
                      <li key={key} className="flex justify-between gap-4">
                        <span>{label}</span>
                        <span>{hours ? `${hours.open} – ${hours.close}` : "Closed"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <div className="space-y-3">
              {biz.languagesSpoken.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Languages spoken</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {biz.languagesSpoken.map((lang) => (
                      <Badge key={lang} variant="outline">{lang}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {biz.emergencyCalloutsAvailable && <Badge variant="success">Available for emergency callouts</Badge>}
            </div>
          </div>
        </section>

        <section id="services" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 text-xl font-semibold">Categories &amp; services</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {biz.services.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{s.title}</p>
                  <Badge variant="outline">{s.category.name}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-sm font-medium">
                  {s.priceType === "QUOTE_ONLY" ? "Quote on request" : `${formatPence(s.priceMinPence ?? 0)}${s.priceMaxPence ? ` – ${formatPence(s.priceMaxPence)}` : ""}${s.priceType === "HOURLY" ? " / hr" : ""}`}
                </p>
              </Card>
            ))}
            {biz.services.length === 0 && <p className="text-sm text-muted-foreground">No services listed yet.</p>}
          </div>
        </section>

        <section id="skills" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Wrench size={20} className="text-brand-600" /> Skills</h2>
          {biz.qualifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {biz.qualifications.map((q) => (
                <Badge key={q.id} variant={q.status === "VERIFIED" ? "success" : "outline"} className="gap-1">
                  {q.status === "VERIFIED" && <BadgeCheck size={14} />} {q.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills or certifications listed yet.</p>
          )}
        </section>

        <section id="reviews" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 text-xl font-semibold">Reviews ({biz.reviewCount})</h2>
          <ReviewList
            reviews={biz.reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              photos: r.photos,
              authorName: r.author.profile ? `${r.author.profile.firstName} ${r.author.profile.lastName[0]}.` : "Customer",
              createdAt: r.createdAt.toISOString(),
              providerResponse: r.providerResponse,
            }))}
          />
        </section>

        <section id="company-info" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><Building2 size={20} className="text-brand-600" /> Company info</h2>
          <Card className="divide-y divide-border p-0">
            {biz.companyDirectorName && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">Owner</span><span className="font-medium">{biz.companyDirectorName}</span></div>
            )}
            {businessTypeLabel(biz.businessType) && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">Company type</span><span className="font-medium">{businessTypeLabel(biz.businessType)}</span></div>
            )}
            {biz.tradingName && biz.tradingName !== biz.name && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">Trading name</span><span className="font-medium">{biz.tradingName}</span></div>
            )}
            {biz.companyRegistrationNumber && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">Company registration no.</span><span className="font-medium">{biz.companyRegistrationNumber}</span></div>
            )}
            {biz.vatNumber && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">VAT registration no.</span><span className="font-medium">{biz.vatNumber}</span></div>
            )}
            {biz.employeeCount != null && (
              <div className="flex justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">Employees</span><span className="font-medium">{biz.employeeCount}</span></div>
            )}
            {!biz.companyDirectorName && !businessTypeLabel(biz.businessType) && !biz.companyRegistrationNumber && !biz.vatNumber && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No company information provided yet.</p>
            )}
          </Card>

          <h3 className="mb-3 mt-6 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-brand-600" /> Accreditations &amp; insurance</h3>
          {biz.insurancePolicies.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {biz.insurancePolicies.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{p.type.replace(/_/g, " ")}</p>
                    {p.status === "VERIFIED" && <Badge variant="success" className="gap-1"><BadgeCheck size={14} /> Verified</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.provider} · covers up to {formatPence(p.coverageAmountPence)}</p>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No accreditations or insurance on file yet.</p>
          )}
        </section>

        <section id="photos" className="mt-10 scroll-mt-32">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold"><ImagesIcon size={20} className="text-brand-600" /> Photos</h2>
          {biz.photoUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {biz.photoUrls.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image src={url} alt={`${biz.name} photo`} fill className="object-cover" sizes="(min-width: 768px) 25vw, 50vw" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No photos added yet.</p>
          )}
        </section>
      </div>

      {similarBusinesses.length > 0 && (
        <div className="border-t border-border bg-muted/30 py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="mb-4 text-xl font-semibold">Similar tradespeople near you</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similarBusinesses.map((b) => (
                <ProviderCard
                  key={b.id}
                  p={{
                    slug: b.slug,
                    name: b.name,
                    logoUrl: b.logoUrl,
                    city: b.city,
                    avgRating: Number(b.avgRating),
                    reviewCount: b.reviewCount,
                    completedJobsCount: b.completedJobsCount,
                    isFeatured: b.isFeatured,
                    verificationStatus: b.verificationStatus,
                    categoryName: b.services[0]?.category.name,
                    fromPricePence: b.services[0]?.priceMinPence,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

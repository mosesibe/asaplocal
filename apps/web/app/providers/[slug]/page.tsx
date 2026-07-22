import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@asaplocal/db";
import { Badge, Card, StarRating, formatPence } from "@asaplocal/ui";
import { BadgeCheck, MapPin, Clock, Briefcase, ChevronLeft } from "lucide-react";
import { ReviewList } from "@/components/review-list";
import { QuoteRequestButton } from "@/components/quote-request-button";

async function getBusiness(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    include: {
      services: { where: { isActive: true }, include: { category: true } },
      serviceAreas: true,
      reviews: { where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { include: { profile: true } } } },
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

export default async function ProviderProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await getBusiness(slug);
  if (!biz) notFound();

  await prisma.business.update({ where: { id: biz.id }, data: { profileViews: { increment: 1 } } }).catch(() => {});

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
                {biz.verificationStatus === "VERIFIED" && (
                  <Badge variant="success" className="gap-1"><BadgeCheck size={14} /> Verified</Badge>
                )}
                {biz.isFeatured && <Badge variant="warning">Featured</Badge>}
              </div>
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin size={14} /> {biz.city} · serves {biz.baseRadiusMiles} mile radius</p>
              <div className="mt-2"><StarRating rating={Number(biz.avgRating)} count={biz.reviewCount} /></div>
            </div>
          </div>
          <div className="flex gap-2">
            <QuoteRequestButton businessId={biz.id} businessName={biz.name} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4 text-center"><Briefcase className="mx-auto mb-1 text-brand-600" size={18} /><p className="text-lg font-semibold">{biz.completedJobsCount}</p><p className="text-xs text-muted-foreground">Jobs completed</p></Card>
          <Card className="p-4 text-center"><Clock className="mx-auto mb-1 text-brand-600" size={18} /><p className="text-lg font-semibold">{biz.avgResponseMins ?? "—"}m</p><p className="text-xs text-muted-foreground">Avg. response</p></Card>
          <Card className="p-4 text-center"><p className="text-lg font-semibold">{Number(biz.responseRatePct)}%</p><p className="text-xs text-muted-foreground">Response rate</p></Card>
          <Card className="p-4 text-center"><p className="text-lg font-semibold">{biz.yearsInBusiness ?? "—"}</p><p className="text-xs text-muted-foreground">Years trading</p></Card>
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">About</h2>
          <p className="whitespace-pre-line text-muted-foreground">{biz.description}</p>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Services &amp; pricing</h2>
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
          </div>
        </section>

        <section className="mt-10">
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
      </div>
    </div>
  );
}
